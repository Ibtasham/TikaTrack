/**
 * Evidence validator.
 *
 * Turns the knowledge base into a machine-checkable report. Every rule here
 * exists because the TikaTrack 2.2.0 audit found a way for unsourced or
 * contradictory medical content to reach a user. The validator is deliberately
 * stricter than the UI: it reports gaps that are *known and accepted* (no
 * official schedule document exists yet) as well as defects that must never
 * ship (a clinical claim marked verified without sufficient evidence).
 *
 * DOM-free on purpose: `scripts/evidence-report.ts` bundles this under the Node
 * tsconfig, and CI runs it without a browser.
 */

import { allVaccines, schedule as legacySchedule } from '../data/vaccines';
import { legacyBridge } from '../data/evidence/bridge';
import { conflicts } from '../data/evidence/conflicts';
import { claimsOf, vaccineRecords } from '../data/evidence/records';
import {
  getSource,
  isSufficientForClinicalClaim,
  isSufficientForProgrammeFact,
  sourceRegistry,
} from '../data/evidence/sources';
import {
  CLINICAL_CLAIM_KINDS,
  KNOWLEDGE_SCHEMA_VERSION,
  type Claim,
  type ConflictEntry,
  type LocalizedText,
  type ReviewStatus,
  type SourceRecord,
  type VaccineRecord,
} from '../data/evidence/types';
import { KNOWLEDGE_BASE_VERSION } from '../data/evidence';

export type FindingSeverity = 'error' | 'warning' | 'gap';

export type FindingCode =
  | 'CLAIM_VERIFIED_WITHOUT_EVIDENCE'
  | 'CLAIM_VERIFIED_WITHOUT_SUFFICIENT_EVIDENCE'
  | 'EVIDENCE_REF_UNRESOLVED'
  | 'INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM'
  | 'CLINICAL_VALUE_WITHOUT_EVIDENCE'
  | 'UNSUPPORTED_STATEMENT'
  | 'MISSING_REQUIRED_FIELD'
  | 'EFFECTIVE_DATE_MISSING'
  | 'RESEARCH_PRODUCT_PUBLISHED'
  | 'SOURCE_URL_NOT_DOCUMENT_LEVEL'
  | 'SOURCE_MISSING_PUBLICATION_DATE'
  | 'SOURCE_OUTDATED'
  | 'SOURCE_REGISTERED_BUT_UNUSED'
  | 'NIP_ANTIGEN_MISSING_FROM_SCHEDULE'
  | 'SCHEDULE_ANTIGEN_NOT_CLASSIFIED_NIP'
  | 'LEGACY_CATEGORY_MISLEADING'
  | 'UNCLASSIFIED_LEGACY_ENTRY'
  | 'CONFLICT_UNRESOLVED'
  | 'CONFLICT_UNRESOLVED_WITHOUT_ACTION'
  | 'CONFLICT_RESOLVED_WITHOUT_DECISION'
  | 'TRANSLATION_GAP'
  | 'AWAITING_PROFESSIONAL_REVIEW';

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  /** What the finding is about: a record id, source id, legacy id or conflict id. */
  entityId: string;
  entityKind: 'record' | 'source' | 'legacy' | 'conflict' | 'knowledge-base';
  message: string;
}

/** A source older than this is reported for re-review, not silently trusted. */
const SOURCE_REVIEW_AGE_DAYS = 365 * 5;

const CLINICAL_KINDS = new Set<string>(CLINICAL_CLAIM_KINDS);

function isLocalizedText(value: unknown): value is LocalizedText {
  return typeof value === 'object' && value !== null && 'en' in value && 'bn' in value;
}

const BENGALI = /[\u0980-\u09FF]/;

export interface EvidenceReport {
  generatedAt: string;
  knowledgeBaseVersion: string;
  schemaVersion: string;
  findings: Finding[];
  summary: Record<FindingCode, number> & {
    total: number;
    errors: number;
    warnings: number;
    gaps: number;
  };
  /** Report sections required by the evidence-review brief. */
  sections: {
    unsupportedStatements: Finding[];
    outdatedInformation: Finding[];
    conflictingSources: ConflictEntry[];
    missingReferences: Finding[];
    inconsistentTranslations: Finding[];
    awaitingProfessionalReview: Finding[];
  };
}

const EMPTY_SUMMARY = {
  CLAIM_VERIFIED_WITHOUT_EVIDENCE: 0,
  CLAIM_VERIFIED_WITHOUT_SUFFICIENT_EVIDENCE: 0,
  EVIDENCE_REF_UNRESOLVED: 0,
  INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM: 0,
  CLINICAL_VALUE_WITHOUT_EVIDENCE: 0,
  UNSUPPORTED_STATEMENT: 0,
  MISSING_REQUIRED_FIELD: 0,
  EFFECTIVE_DATE_MISSING: 0,
  RESEARCH_PRODUCT_PUBLISHED: 0,
  SOURCE_URL_NOT_DOCUMENT_LEVEL: 0,
  SOURCE_MISSING_PUBLICATION_DATE: 0,
  SOURCE_OUTDATED: 0,
  SOURCE_REGISTERED_BUT_UNUSED: 0,
  NIP_ANTIGEN_MISSING_FROM_SCHEDULE: 0,
  SCHEDULE_ANTIGEN_NOT_CLASSIFIED_NIP: 0,
  LEGACY_CATEGORY_MISLEADING: 0,
  UNCLASSIFIED_LEGACY_ENTRY: 0,
  CONFLICT_UNRESOLVED: 0,
  CONFLICT_UNRESOLVED_WITHOUT_ACTION: 0,
  CONFLICT_RESOLVED_WITHOUT_DECISION: 0,
  TRANSLATION_GAP: 0,
  AWAITING_PROFESSIONAL_REVIEW: 0,
  total: 0,
  errors: 0,
  warnings: 0,
  gaps: 0,
};

function summarise(findings: Finding[]): EvidenceReport['summary'] {
  const summary = { ...EMPTY_SUMMARY };
  for (const finding of findings) {
    summary[finding.code] += 1;
    summary.total += 1;
    if (finding.severity === 'error') summary.errors += 1;
    else if (finding.severity === 'warning') summary.warnings += 1;
    else summary.gaps += 1;
  }
  return summary;
}

function checkClaim(
  claim: Claim<unknown>,
  record: VaccineRecord,
  field: string,
  findings: Finding[],
): void {
  const clinical = CLINICAL_KINDS.has(claim.kind);
  const label = `${record.id}.${field}`;

  for (const ref of claim.evidence) {
    const source = getSource(ref.sourceId);
    if (!source) {
      findings.push({
        code: 'EVIDENCE_REF_UNRESOLVED',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message: `Evidence reference "${ref.sourceId}" is not in the source registry.`,
      });
      continue;
    }
    if (clinical && !isSufficientForClinicalClaim(source.id)) {
      findings.push({
        code: 'INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message: `${source.id} (${source.sufficiency}) cannot support a ${claim.kind} claim.`,
      });
    }
    if (claim.kind === 'programme-fact' && !isSufficientForProgrammeFact(source.id)) {
      findings.push({
        code: 'INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message: `${source.id} cannot support a programme fact.`,
      });
    }
  }

  if (claim.reviewStatus === 'evidence-verified') {
    if (claim.evidence.length === 0) {
      findings.push({
        code: 'CLAIM_VERIFIED_WITHOUT_EVIDENCE',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message: 'Claim is marked evidence-verified but cites no source.',
      });
    } else if (
      !claim.evidence.every(
        (ref) =>
          isSufficientForClinicalClaim(ref.sourceId) || isSufficientForProgrammeFact(ref.sourceId),
      )
    ) {
      findings.push({
        code: 'CLAIM_VERIFIED_WITHOUT_SUFFICIENT_EVIDENCE',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message:
          'Claim is marked evidence-verified but at least one cited source is not sufficient for its kind.',
      });
    }
  }

  if (claim.value !== null && claim.value !== undefined) {
    const trusted: ReviewStatus[] = ['evidence-verified', 'metadata-registered'];
    if (clinical && trusted.includes(claim.reviewStatus) && claim.evidence.length === 0) {
      findings.push({
        code: 'CLINICAL_VALUE_WITHOUT_EVIDENCE',
        severity: 'error',
        entityId: label,
        entityKind: 'record',
        message: 'A clinical value is presented as trusted but has no evidence reference.',
      });
    }
    if (clinical && claim.evidence.length === 0 && claim.reviewStatus === 'legacy-unverified') {
      findings.push({
        code: 'UNSUPPORTED_STATEMENT',
        severity: 'gap',
        entityId: label,
        entityKind: 'record',
        message:
          claim.note ??
          'Clinical value transcribed from the TikaTrack 2.x catalogue with no document-level source.',
      });
    }
    if (isLocalizedText(claim.value)) {
      const text = claim.value;
      if (!text.en.trim() || !text.bn.trim()) {
        findings.push({
          code: 'TRANSLATION_GAP',
          severity: 'error',
          entityId: label,
          entityKind: 'record',
          message: 'Localized claim is missing English or Bangla text.',
        });
      } else if (!BENGALI.test(text.bn)) {
        findings.push({
          code: 'TRANSLATION_GAP',
          severity: 'warning',
          entityId: label,
          entityKind: 'record',
          message: 'Bangla text contains no Bengali script — likely untranslated.',
        });
      }
    }
  }

  if (
    claim.value === null &&
    claim.reviewStatus !== 'requires-professional-review' &&
    claim.reviewStatus !== 'conflict-unresolved'
  ) {
    findings.push({
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      entityId: label,
      entityKind: 'record',
      message: 'A null value must be marked requires-professional-review or conflict-unresolved.',
    });
  }

  if (
    claim.reviewStatus === 'requires-professional-review' ||
    claim.reviewStatus === 'legacy-unverified'
  ) {
    findings.push({
      code: 'AWAITING_PROFESSIONAL_REVIEW',
      severity: 'gap',
      entityId: label,
      entityKind: 'record',
      message: `${field}: ${claim.note ?? 'awaiting professional review'}`,
    });
  }
}

/** Validate a single record. Exported so tests can feed it a deliberately bad record. */
export function validateRecord(record: VaccineRecord): Finding[] {
  const findings: Finding[] = [];
  const required: [string, unknown][] = [
    ['names', record.names],
    ['fullNames', record.fullNames],
    ['antigens', record.antigens],
    ['programme', record.programme],
    ['productStatus', record.productStatus],
    ['reviewStatus', record.reviewStatus],
    ['dates.lastReviewed', record.dates.lastReviewed],
  ];
  for (const [field, value] of required) {
    if (value === null || value === undefined || value === '') {
      findings.push({
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        entityId: record.id,
        entityKind: 'record',
        message: `Required field "${field}" is empty.`,
      });
    }
  }
  if (record.schemaVersion !== KNOWLEDGE_SCHEMA_VERSION) {
    findings.push({
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      entityId: record.id,
      entityKind: 'record',
      message: `schemaVersion "${record.schemaVersion}" does not match ${KNOWLEDGE_SCHEMA_VERSION}.`,
    });
  }
  if (record.revision < 1) {
    findings.push({
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      entityId: record.id,
      entityKind: 'record',
      message: 'revision must be >= 1.',
    });
  }
  if (!record.dates.effectiveFrom) {
    findings.push({
      code: 'EFFECTIVE_DATE_MISSING',
      severity: 'gap',
      entityId: record.id,
      entityKind: 'record',
      message:
        'No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.',
    });
  }
  if (
    record.published &&
    (record.productStatus === 'in-development' || record.programme === 'research-not-available')
  ) {
    findings.push({
      code: 'RESEARCH_PRODUCT_PUBLISHED',
      severity: 'error',
      entityId: record.id,
      entityKind: 'record',
      message:
        'A research-stage or unlicensed product must not be published or indexed by the assistant.',
    });
  }
  for (const conflictId of record.conflicts) {
    if (!conflicts.some((conflict) => conflict.id === conflictId)) {
      findings.push({
        code: 'CONFLICT_UNRESOLVED_WITHOUT_ACTION',
        severity: 'error',
        entityId: record.id,
        entityKind: 'record',
        message: `Conflict "${conflictId}" is referenced but not in the register.`,
      });
    }
  }

  const fields: [string, Claim<unknown>[]][] = [
    ['vaccineType', [record.vaccineType as Claim<unknown>]],
    ['targetPopulation', [record.targetPopulation as Claim<unknown>]],
    ['doseCount', [record.doseCount as Claim<unknown>]],
    ['efficacy', [record.efficacy as Claim<unknown>]],
    ['diseaseBurden', [record.diseaseBurden as Claim<unknown>]],
    ['description', [record.description as Claim<unknown>]],
    ['contraindications', record.contraindications as Claim<unknown>[]],
    ['precautions', record.precautions as Claim<unknown>[]],
    ['commonAdverseEvents', record.commonAdverseEvents as Claim<unknown>[]],
    ['seriousAdverseEvents', record.seriousAdverseEvents as Claim<unknown>[]],
    ['programmeFacts', record.programmeFacts as Claim<unknown>[]],
  ];
  for (const [field, claims] of fields) {
    claims.forEach((claim, index) =>
      checkClaim(claim, record, claims.length > 1 ? `${field}[${index}]` : field, findings),
    );
  }
  record.doses.forEach((entry) => {
    checkClaim(
      entry.recommendedAge as Claim<unknown>,
      record,
      `dose${entry.doseNumber}.recommendedAge`,
      findings,
    );
    checkClaim(
      entry.minimumAge as Claim<unknown>,
      record,
      `dose${entry.doseNumber}.minimumAge`,
      findings,
    );
    checkClaim(
      entry.minimumIntervalFromPrevious as Claim<unknown>,
      record,
      `dose${entry.doseNumber}.minimumInterval`,
      findings,
    );
    checkClaim(
      entry.maximumAge as Claim<unknown>,
      record,
      `dose${entry.doseNumber}.maximumAge`,
      findings,
    );
    if (entry.route)
      checkClaim(entry.route as Claim<unknown>, record, `dose${entry.doseNumber}.route`, findings);
  });

  return findings;
}

function isDocumentLevelUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    return path.length > 0 && path !== '';
  } catch {
    return false;
  }
}

function daysBetween(iso: string, reference: string): number {
  return Math.round((Date.parse(reference) - Date.parse(iso)) / 86_400_000);
}

function checkSources(
  usedSourceIds: Set<string>,
  referenceDate: string,
  findings: Finding[],
): void {
  for (const source of sourceRegistry) {
    if (!isDocumentLevelUrl(source.url)) {
      findings.push({
        code: 'SOURCE_URL_NOT_DOCUMENT_LEVEL',
        severity: source.sufficiency === 'insufficient-for-clinical' ? 'warning' : 'error',
        entityId: source.id,
        entityKind: 'source',
        message: source.url
          ? `URL "${source.url}" is a homepage or portal, not a document.`
          : 'No URL registered (placeholder recording a known gap).',
      });
    }
    if (!source.publicationDate) {
      findings.push({
        code: 'SOURCE_MISSING_PUBLICATION_DATE',
        severity: 'warning',
        entityId: source.id,
        entityKind: 'source',
        message: 'Publication date is unknown; the source cannot be assessed for currency.',
      });
    } else if (
      source.sufficiency === 'authoritative-for-clinical-claims' &&
      daysBetween(source.publicationDate, referenceDate) > SOURCE_REVIEW_AGE_DAYS
    ) {
      findings.push({
        code: 'SOURCE_OUTDATED',
        severity: 'warning',
        entityId: source.id,
        entityKind: 'source',
        message: `Published ${source.publicationDate}; older than ${SOURCE_REVIEW_AGE_DAYS / 365} years — confirm it has not been superseded.`,
      });
    }
    if (!usedSourceIds.has(source.id) && source.supportedClaims.length === 0) {
      findings.push({
        code: 'SOURCE_REGISTERED_BUT_UNUSED',
        severity: source.reviewStatus === 'rejected' ? 'warning' : 'gap',
        entityId: source.id,
        entityKind: 'source',
        message:
          source.reviewStatus === 'rejected'
            ? 'Registered as insufficient evidence; present so that legacy citations of it are reported.'
            : 'Registered but supports no claim yet — full-text review outstanding.',
      });
    }
  }
}

function checkClassification(findings: Finding[]): void {
  const scheduleIds = new Set(
    legacySchedule.flatMap((item) => item.vaccines.map((vaccine) => vaccine.id)),
  );
  const bridged = new Set(legacyBridge.map((entry) => entry.legacyId));
  const legacyById = new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine]));

  for (const vaccine of allVaccines) {
    if (!bridged.has(vaccine.id)) {
      findings.push({
        code: 'UNCLASSIFIED_LEGACY_ENTRY',
        severity: 'error',
        entityId: vaccine.id,
        entityKind: 'legacy',
        message: 'Catalogue entry has no classification in the legacy bridge.',
      });
    }
  }

  for (const entry of legacyBridge) {
    const legacy = legacyById.get(entry.legacyId);
    if (legacy && legacy.category === 'routine' && entry.programme !== 'bd-nip-routine') {
      findings.push({
        code: 'LEGACY_CATEGORY_MISLEADING',
        severity: 'warning',
        entityId: entry.legacyId,
        entityKind: 'legacy',
        message: `Legacy category "routine" but classified ${entry.programme}.`,
      });
    }
    if (entry.programme === 'bd-nip-routine' && !scheduleIds.has(entry.legacyId)) {
      findings.push({
        code: 'NIP_ANTIGEN_MISSING_FROM_SCHEDULE',
        severity: 'warning',
        entityId: entry.legacyId,
        entityKind: 'legacy',
        message: 'Classified as a national-programme antigen but absent from the encoded schedule.',
      });
    }
  }

  for (const id of scheduleIds) {
    const entry = legacyBridge.find((bridgeEntry) => bridgeEntry.legacyId === id);
    if (entry && entry.programme !== 'bd-nip-routine') {
      findings.push({
        code: 'SCHEDULE_ANTIGEN_NOT_CLASSIFIED_NIP',
        severity: 'error',
        entityId: id,
        entityKind: 'legacy',
        message: `Present in the encoded schedule but classified ${entry.programme}.`,
      });
    }
  }
}

function checkConflicts(findings: Finding[]): void {
  for (const conflict of conflicts) {
    if (conflict.status === 'unresolved') {
      findings.push({
        code: 'CONFLICT_UNRESOLVED',
        severity: 'gap',
        entityId: conflict.id,
        entityKind: 'conflict',
        message: conflict.title.en,
      });
      if (!conflict.requiredAction.trim()) {
        findings.push({
          code: 'CONFLICT_UNRESOLVED_WITHOUT_ACTION',
          severity: 'error',
          entityId: conflict.id,
          entityKind: 'conflict',
          message: 'Unresolved conflict has no required action.',
        });
      }
    } else if (!conflict.resolution) {
      findings.push({
        code: 'CONFLICT_RESOLVED_WITHOUT_DECISION',
        severity: 'error',
        entityId: conflict.id,
        entityKind: 'conflict',
        message: 'Conflict is marked resolved but records no decision, date or evidence.',
      });
    }
    for (const statement of conflict.statements) {
      for (const ref of statement.evidence) {
        const source = getSource(ref.sourceId);
        if (!source) {
          findings.push({
            code: 'EVIDENCE_REF_UNRESOLVED',
            severity: 'error',
            entityId: conflict.id,
            entityKind: 'conflict',
            message: `Statement cites unknown source "${ref.sourceId}".`,
          });
        } else if (
          source.sufficiency === 'insufficient-for-clinical' &&
          source.reviewStatus !== 'rejected' &&
          source.verification !== 'rejected-insufficient'
        ) {
          findings.push({
            code: 'INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM',
            severity: 'warning',
            entityId: conflict.id,
            entityKind: 'conflict',
            message: `Statement cites ${source.id}, which is not sufficient evidence.`,
          });
        }
      }
    }
  }
}

export function validateEvidence(options: { referenceDate?: string } = {}): EvidenceReport {
  const referenceDate = options.referenceDate ?? '2026-10-31';
  const findings: Finding[] = [];

  const usedSourceIds = new Set<string>();
  for (const record of vaccineRecords) {
    findings.push(...validateRecord(record));
    for (const claim of claimsOf(record)) {
      for (const ref of claim.evidence) usedSourceIds.add(ref.sourceId);
    }
  }
  checkSources(usedSourceIds, referenceDate, findings);
  checkClassification(findings);
  checkConflicts(findings);

  const byCode = (codes: FindingCode[]) =>
    findings.filter((finding) => codes.includes(finding.code));

  return {
    generatedAt: referenceDate,
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    findings,
    summary: summarise(findings),
    sections: {
      unsupportedStatements: byCode(['UNSUPPORTED_STATEMENT', 'CLINICAL_VALUE_WITHOUT_EVIDENCE']),
      outdatedInformation: byCode([
        'SOURCE_OUTDATED',
        'SOURCE_MISSING_PUBLICATION_DATE',
        'EFFECTIVE_DATE_MISSING',
      ]),
      conflictingSources: conflicts.filter((conflict) => conflict.status === 'unresolved'),
      missingReferences: byCode([
        'SOURCE_URL_NOT_DOCUMENT_LEVEL',
        'EVIDENCE_REF_UNRESOLVED',
        'INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM',
        'CLAIM_VERIFIED_WITHOUT_EVIDENCE',
        'CLAIM_VERIFIED_WITHOUT_SUFFICIENT_EVIDENCE',
        'SOURCE_REGISTERED_BUT_UNUSED',
      ]),
      inconsistentTranslations: byCode(['TRANSLATION_GAP']),
      awaitingProfessionalReview: byCode(['AWAITING_PROFESSIONAL_REVIEW', 'CONFLICT_UNRESOLVED']),
    },
  };
}

/** Errors are the only blocking class: gaps and warnings are reported, not failed. */
export function blockingFindings(report: EvidenceReport): Finding[] {
  return report.findings.filter((finding) => finding.severity === 'error');
}

/** Convenience for tests and CI: throws with a readable list when errors exist. */
export function assertEvidenceIsValid(report: EvidenceReport): void {
  const errors = blockingFindings(report);
  if (errors.length > 0) {
    throw new Error(
      `Evidence validation failed with ${errors.length} error(s):\n${errors
        .map((finding) => `  [${finding.code}] ${finding.entityId}: ${finding.message}`)
        .join('\n')}`,
    );
  }
}

/** One-line-per-finding text, used by `npm run evidence:report`. */
export function renderReportMarkdown(report: EvidenceReport): string {
  const sources: SourceRecord[] = [...sourceRegistry];
  const lines: string[] = [];
  lines.push(`# TikaTrack evidence review`);
  lines.push('');
  lines.push(
    `Generated ${report.generatedAt} · knowledge base ${report.knowledgeBaseVersion} · schema ${report.schemaVersion}`,
  );
  lines.push('');
  lines.push(
    `**${report.summary.total} findings — ${report.summary.errors} blocking errors, ${report.summary.warnings} warnings, ${report.summary.gaps} accepted gaps.**`,
  );
  lines.push('');
  lines.push('| Code | Count | Severity |');
  lines.push('| --- | --- | --- |');
  for (const [code, count] of Object.entries(report.summary)) {
    if (
      code === 'total' ||
      code === 'errors' ||
      code === 'warnings' ||
      code === 'gaps' ||
      count === 0
    )
      continue;
    const severity = report.findings.find((finding) => finding.code === code)?.severity ?? 'gap';
    lines.push(`| \`${code}\` | ${count} | ${severity} |`);
  }
  lines.push('');
  lines.push('## 1. Unsupported statements');
  lines.push('');
  lines.push(
    'Clinical values that exist in the product but have no document-level source. None of them is presented to users as verified; each is displayed with its review status.',
  );
  lines.push('');
  for (const finding of report.sections.unsupportedStatements) {
    lines.push(`- **${finding.entityId}** — ${finding.message}`);
  }
  lines.push('');
  lines.push('## 2. Outdated information');
  lines.push('');
  for (const finding of report.sections.outdatedInformation) {
    lines.push(`- **${finding.entityId}** — ${finding.message}`);
  }
  lines.push('');
  lines.push('## 3. Conflicting sources');
  lines.push('');
  lines.push(
    'Recorded, never merged. Each entry stays unresolved until an authoritative document or a named reviewer decides it.',
  );
  lines.push('');
  for (const conflict of report.sections.conflictingSources) {
    lines.push(`### ${conflict.id} — ${conflict.title.en}`);
    lines.push('');
    for (const statement of conflict.statements) {
      lines.push(`- ${statement.statement}  \n  _origin: ${statement.origin}_`);
    }
    lines.push('');
    lines.push(`**Required action:** ${conflict.requiredAction}`);
    lines.push('');
  }
  lines.push('## 4. Missing or insufficient references');
  lines.push('');
  for (const finding of report.sections.missingReferences) {
    lines.push(`- **${finding.entityId}** [\`${finding.code}\`] — ${finding.message}`);
  }
  lines.push('');
  lines.push('## 5. English / Bangla consistency');
  lines.push('');
  if (report.sections.inconsistentTranslations.length === 0) {
    lines.push(
      'No inconsistencies found in the structured records. All localized claim values carry non-empty English and Bangla text, and every Bangla value contains Bengali script.',
    );
  } else {
    for (const finding of report.sections.inconsistentTranslations) {
      lines.push(`- **${finding.entityId}** — ${finding.message}`);
    }
  }
  lines.push('');
  lines.push('## 6. Awaiting professional review');
  lines.push('');
  lines.push(`${report.sections.awaitingProfessionalReview.length} items:`);
  lines.push('');
  for (const finding of report.sections.awaitingProfessionalReview) {
    lines.push(`- **${finding.entityId}** — ${finding.message}`);
  }
  lines.push('');
  lines.push('## 7. Source register');
  lines.push('');
  lines.push('| Id | Publisher | Title | Published | Accessed | Sufficiency | Verification |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const source of sources) {
    const title = source.title.length > 70 ? `${source.title.slice(0, 67)}…` : source.title;
    lines.push(
      `| \`${source.id}\` | ${source.publisher} | ${source.url ? `[${title}](${source.url})` : title} | ${source.publicationDate ?? '—'} | ${source.accessedDate} | ${source.sufficiency} | ${source.verification} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
