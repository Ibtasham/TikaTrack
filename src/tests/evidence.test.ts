/**
 * Evidence layer tests.
 *
 * These are the gates PROMPT 2 asks for: every published medical entry must
 * carry the required source metadata, a generic homepage must never count as
 * evidence for a clinical statement, conflicts must stay visible, and nothing
 * may be marked verified without a source that is sufficient for its claim.
 *
 * The suite also proves the validator can fail — a validator that only ever
 * passes is not a gate.
 */

import { describe, expect, it } from 'vitest';
import { allVaccines, schedule as legacySchedule } from '../data/vaccines';
import {
  isPublishable,
  legacyBridge,
  MISLABELLED_AS_ROUTINE,
  nationalProgrammeIds,
} from '../data/evidence/bridge';
import { conflicts } from '../data/evidence/conflicts';
import { claimsOf, vaccineRecords } from '../data/evidence/records';
import {
  getSource,
  isSufficientForClinicalClaim,
  isSufficientForProgrammeFact,
  sourceRegistry,
} from '../data/evidence/sources';
import { KNOWLEDGE_SCHEMA_VERSION, type Claim, type VaccineRecord } from '../data/evidence/types';
import {
  blockingFindings,
  renderReportMarkdown,
  validateEvidence,
  validateRecord,
  type FindingCode,
} from '../lib/evidenceValidator';
import { evidenceForLegacy, KNOWLEDGE_BASE_VERSION, knowledgeBaseFacts } from '../data/evidence';

function must<T>(value: T | undefined | null, label: string): T {
  if (value === undefined || value === null) throw new Error(`missing ${label}`);
  return value;
}

function codesOf(record: VaccineRecord): FindingCode[] {
  return validateRecord(record).map((finding) => finding.code);
}

/** Deep-ish clone of a record so a test can corrupt it without touching the data. */
function corrupt(record: VaccineRecord, mutate: (draft: VaccineRecord) => void): VaccineRecord {
  const draft: VaccineRecord = JSON.parse(JSON.stringify(record)) as VaccineRecord;
  mutate(draft);
  return draft;
}

const report = validateEvidence();
const bcg = must(
  vaccineRecords.find((record) => record.id === 'rec-bcg'),
  'rec-bcg',
);

describe('source registry', () => {
  it('has unique ids and complete metadata', () => {
    const ids = sourceRegistry.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of sourceRegistry) {
      expect(source.publisher.trim().length, source.id).toBeGreaterThan(0);
      expect(source.title.trim().length, source.id).toBeGreaterThan(0);
      expect(source.accessedDate, source.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['bangladesh', 'global', 'regional-searo', 'other'], source.id).toContain(
        source.jurisdiction,
      );
      expect(Array.isArray(source.supportedClaims), source.id).toBe(true);
    }
  });

  it('only cites https URLs, except the placeholder that records a known gap', () => {
    for (const source of sourceRegistry) {
      if (source.id === 'no-official-schedule-document') {
        expect(source.url).toBe('');
        continue;
      }
      expect(source.url.startsWith('https://'), `${source.id} → ${source.url}`).toBe(true);
    }
  });

  it('registers the WHO homepage as insufficient evidence for clinical claims', () => {
    const homepage = must(getSource('who-homepage'), 'who-homepage');
    expect(homepage.sufficiency).toBe('insufficient-for-clinical');
    expect(homepage.verification).toBe('rejected-insufficient');
    expect(homepage.reviewStatus).toBe('rejected');
    expect(isSufficientForClinicalClaim('who-homepage')).toBe(false);
    expect(isSufficientForProgrammeFact('who-homepage')).toBe(false);
  });

  it('never treats a homepage, portal or unverified URL as clinical evidence', () => {
    for (const source of sourceRegistry) {
      if (source.sufficiency !== 'authoritative-for-clinical-claims') {
        expect(isSufficientForClinicalClaim(source.id), source.id).toBe(false);
      }
      if (source.reviewStatus === 'rejected') {
        expect(isSufficientForClinicalClaim(source.id), source.id).toBe(false);
        expect(isSufficientForProgrammeFact(source.id), source.id).toBe(false);
      }
    }
  });

  it('has at least one reviewed Bangladesh programme source with verbatim quotes', () => {
    const reviewed = sourceRegistry.filter(
      (source) =>
        source.jurisdiction === 'bangladesh' && source.verification === 'fetched-and-reviewed',
    );
    expect(reviewed.length).toBeGreaterThanOrEqual(2);
    for (const source of reviewed) {
      expect(source.supportedClaims.length, source.id).toBeGreaterThan(0);
    }
  });

  it('does not let an unknown source id count as evidence', () => {
    expect(getSource('does-not-exist')).toBeUndefined();
    expect(isSufficientForClinicalClaim('does-not-exist')).toBe(false);
  });
});

describe('knowledge base integrity', () => {
  it('passes validation with zero blocking errors', () => {
    const errors = blockingFindings(report);
    expect(
      errors,
      errors.map((finding) => `${finding.code} ${finding.entityId}: ${finding.message}`).join('\n'),
    ).toEqual([]);
  });

  it('versions every record against the current schema', () => {
    for (const record of vaccineRecords) {
      expect(record.schemaVersion).toBe(KNOWLEDGE_SCHEMA_VERSION);
      expect(record.revision).toBeGreaterThanOrEqual(1);
      expect(record.dates.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.legacyIds.length).toBeGreaterThan(0);
      for (const legacyId of record.legacyIds) {
        expect(
          allVaccines.some((vaccine) => vaccine.id === legacyId),
          legacyId,
        ).toBe(true);
      }
    }
    expect(KNOWLEDGE_BASE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('invents no minimum age, minimum interval or maximum age', () => {
    const invented: string[] = [];
    for (const record of vaccineRecords) {
      for (const dose of record.doses) {
        if (dose.minimumAge.value !== null)
          invented.push(`${record.id}.${dose.doseNumber}.minimumAge`);
        if (dose.minimumIntervalFromPrevious.value !== null) {
          invented.push(`${record.id}.${dose.doseNumber}.minimumInterval`);
        }
        if (dose.maximumAge.value !== null)
          invented.push(`${record.id}.${dose.doseNumber}.maximumAge`);
      }
    }
    expect(invented).toEqual([]);
  });

  it('marks every unknown value as requiring professional review', () => {
    for (const record of vaccineRecords) {
      for (const claim of claimsOf(record)) {
        if (claim.value === null) {
          expect(
            ['requires-professional-review', 'conflict-unresolved'],
            `${record.id} ${claim.kind}`,
          ).toContain(claim.reviewStatus);
        }
      }
    }
  });

  it('never marks a clinical claim verified without a sufficient source', () => {
    for (const record of vaccineRecords) {
      for (const claim of claimsOf(record)) {
        if (claim.reviewStatus !== 'evidence-verified') continue;
        expect(claim.evidence.length, record.id).toBeGreaterThan(0);
        for (const ref of claim.evidence) {
          const sufficient =
            isSufficientForClinicalClaim(ref.sourceId) ||
            isSufficientForProgrammeFact(ref.sourceId);
          expect(sufficient, `${record.id} → ${ref.sourceId}`).toBe(true);
        }
      }
    }
  });

  it('resolves every evidence reference to a registered source', () => {
    for (const record of vaccineRecords) {
      for (const claim of claimsOf(record)) {
        for (const ref of claim.evidence) {
          expect(getSource(ref.sourceId), `${record.id} → ${ref.sourceId}`).toBeDefined();
        }
      }
    }
    for (const conflict of conflicts) {
      for (const statement of conflict.statements) {
        for (const ref of statement.evidence) {
          expect(getSource(ref.sourceId), `${conflict.id} → ${ref.sourceId}`).toBeDefined();
        }
      }
    }
  });

  it('keeps research-stage products unpublished', () => {
    for (const record of vaccineRecords) {
      if (
        record.productStatus === 'in-development' ||
        record.programme === 'research-not-available'
      ) {
        expect(record.published, record.id).toBe(false);
      }
    }
    for (const legacyId of ['hiv', 'tb-new', 'cancer-cervical']) {
      expect(isPublishable(legacyId), legacyId).toBe(false);
      expect(evidenceForLegacy(legacyId)?.publishable).toBe(false);
    }
    expect(isPublishable('bcg')).toBe(true);
  });

  it('carries Bangla text for every localized claim value', () => {
    const bengali = /[\u0980-\u09FF]/;
    for (const record of vaccineRecords) {
      for (const claim of claimsOf(record)) {
        const value = claim.value as unknown;
        if (value && typeof value === 'object' && 'en' in value && 'bn' in value) {
          const text = value as { en: string; bn: string };
          expect(text.en.trim().length, `${record.id} ${claim.kind}`).toBeGreaterThan(0);
          expect(bengali.test(text.bn), `${record.id} ${claim.kind} → "${text.bn}"`).toBe(true);
        }
      }
    }
    for (const conflict of conflicts) {
      expect(conflict.title.bn.trim().length, conflict.id).toBeGreaterThan(0);
      expect(bengali.test(conflict.title.bn), conflict.id).toBe(true);
    }
  });
});

describe('classification', () => {
  it('classifies every catalogue entry, without deleting any', () => {
    expect(allVaccines.length).toBe(52);
    expect(legacyBridge.length).toBe(allVaccines.length);
    for (const vaccine of allVaccines) {
      const entry = legacyBridge.find((bridge) => bridge.legacyId === vaccine.id);
      expect(entry, vaccine.id).toBeDefined();
      expect(entry?.reviewStatus).toBe('requires-professional-review');
    }
  });

  it('separates the eight required classifications', () => {
    const programmes = new Set(legacyBridge.map((entry) => entry.programme));
    for (const required of [
      'bd-nip-routine',
      'bd-national-campaign',
      'bd-sia',
      'bd-special-risk',
      'travel',
      'occupational',
      'private-market-bd',
      'international-reference',
    ] as const) {
      // `bd-sia` has no product of its own: supplementary activities deliver
      // routine antigens, so it is asserted through `alsoUsedFor` instead.
      if (required === 'bd-sia') continue;
      expect(programmes.has(required), required).toBe(true);
    }
    const mr = must(
      vaccineRecords.find((record) => record.id === 'rec-mr'),
      'rec-mr',
    );
    expect(mr.alsoUsedFor).toContain('bd-sia');
  });

  it('keeps national-programme antigens and the encoded schedule consistent, or records why not', () => {
    const scheduleIds = new Set(
      legacySchedule.flatMap((item) => item.vaccines.map((vaccine) => vaccine.id)),
    );
    const nip = new Set(nationalProgrammeIds());
    for (const id of nip) {
      if (!scheduleIds.has(id)) {
        const entry = must(
          legacyBridge.find((bridge) => bridge.legacyId === id),
          id,
        );
        expect(
          entry.conflicts.length,
          `${id} is missing from schedule[] without a conflict entry`,
        ).toBeGreaterThan(0);
      }
    }
    for (const id of scheduleIds) {
      expect(nip.has(id), `${id} is in schedule[] but not classified bd-nip-routine`).toBe(true);
    }
    expect(nip.has('fipv')).toBe(true);
    expect(scheduleIds.has('fipv')).toBe(false);
  });

  it('flags every entry the 2.x dataset labelled "routine" but that is not a programme antigen', () => {
    for (const legacyId of MISLABELLED_AS_ROUTINE) {
      const entry = must(
        legacyBridge.find((bridge) => bridge.legacyId === legacyId),
        legacyId,
      );
      expect(entry.programme).not.toBe('bd-nip-routine');
      expect(entry.flags, legacyId).toContain('legacy-category-misleading');
      expect(entry.conflicts, legacyId).toContain('C-004');
    }
  });

  it('flags homepage citations, non-date introduction values and bare efficacy figures', () => {
    const homepageCited = legacyBridge.filter((entry) =>
      entry.flags.includes('source-url-is-homepage'),
    );
    expect(homepageCited.length).toBeGreaterThan(15);
    const badIntroduced = legacyBridge.filter((entry) =>
      entry.flags.includes('introduced-value-is-not-a-date'),
    );
    expect(badIntroduced.map((entry) => entry.legacyId)).toContain('hiv');
    expect(badIntroduced.map((entry) => entry.legacyId)).toContain('plague');
    const bareEfficacy = legacyBridge.filter((entry) =>
      entry.flags.includes('efficacy-without-source'),
    );
    expect(bareEfficacy.length).toBeGreaterThan(30);
  });
});

describe('conflict register', () => {
  it('records every conflict as unresolved, with competing statements and a required action', () => {
    expect(conflicts.length).toBeGreaterThanOrEqual(8);
    for (const conflict of conflicts) {
      expect(conflict.status).toBe('unresolved');
      expect(conflict.statements.length, conflict.id).toBeGreaterThanOrEqual(2);
      expect(conflict.requiredAction.trim().length, conflict.id).toBeGreaterThan(20);
      expect(conflict.openedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        conflict.resolution,
        `${conflict.id} must not carry a resolution while unresolved`,
      ).toBeUndefined();
      for (const statement of conflict.statements) {
        expect(statement.origin.trim().length, conflict.id).toBeGreaterThan(0);
      }
    }
    expect(conflicts.some((conflict) => conflict.id === 'C-001')).toBe(true);
  });

  it('links conflicts to the records and legacy entries they affect', () => {
    const ids = new Set(conflicts.map((conflict) => conflict.id));
    for (const record of vaccineRecords) {
      for (const conflictId of record.conflicts) expect(ids.has(conflictId), conflictId).toBe(true);
    }
    for (const entry of legacyBridge) {
      for (const conflictId of entry.conflicts) expect(ids.has(conflictId), conflictId).toBe(true);
    }
  });
});

describe('validator detects defects', () => {
  it('rejects a claim marked verified with no evidence', () => {
    const bad = corrupt(bcg, (draft) => {
      (draft.efficacy as Claim<unknown>).reviewStatus = 'evidence-verified';
    });
    expect(codesOf(bad)).toContain('CLAIM_VERIFIED_WITHOUT_EVIDENCE');
  });

  it('rejects a clinical claim citing the WHO homepage', () => {
    const bad = corrupt(bcg, (draft) => {
      draft.doseCount.evidence = [{ sourceId: 'who-homepage' }];
      draft.doseCount.reviewStatus = 'evidence-verified';
    });
    const codes = codesOf(bad);
    expect(codes).toContain('INSUFFICIENT_SOURCE_FOR_CLINICAL_CLAIM');
    expect(codes).toContain('CLAIM_VERIFIED_WITHOUT_SUFFICIENT_EVIDENCE');
  });

  it('rejects an unresolvable source reference', () => {
    const bad = corrupt(bcg, (draft) => {
      draft.description.evidence = [{ sourceId: 'made-up-source' }];
    });
    expect(codesOf(bad)).toContain('EVIDENCE_REF_UNRESOLVED');
  });

  it('rejects publishing a research-stage product', () => {
    const bad = corrupt(bcg, (draft) => {
      draft.productStatus = 'in-development';
      draft.published = true;
    });
    expect(codesOf(bad)).toContain('RESEARCH_PRODUCT_PUBLISHED');
  });

  it('rejects a localized claim with no Bangla text', () => {
    const bad = corrupt(bcg, (draft) => {
      const value = draft.description.value as unknown as { bn: string };
      if (value) value.bn = '   ';
    });
    expect(codesOf(bad)).toContain('TRANSLATION_GAP');
  });

  it('rejects a null value that is not marked as requiring review', () => {
    const bad = corrupt(bcg, (draft) => {
      draft.vaccineType.value = null;
      draft.vaccineType.reviewStatus = 'legacy-unverified';
    });
    expect(codesOf(bad)).toContain('MISSING_REQUIRED_FIELD');
  });

  it('rejects a stale schema version and a missing effective date is reported as a gap', () => {
    const bad = corrupt(bcg, (draft) => {
      draft.schemaVersion = '2.0.0' as typeof KNOWLEDGE_SCHEMA_VERSION;
    });
    expect(codesOf(bad)).toContain('MISSING_REQUIRED_FIELD');
    expect(validateRecord(bcg).map((finding) => finding.code)).toContain('EFFECTIVE_DATE_MISSING');
  });
});

describe('evidence report', () => {
  it('summarises findings and exposes the six required sections', () => {
    expect(report.summary.total).toBe(report.findings.length);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.gaps).toBeGreaterThan(0);
    expect(report.sections.unsupportedStatements.length).toBeGreaterThan(0);
    expect(report.sections.outdatedInformation.length).toBeGreaterThan(0);
    expect(report.sections.conflictingSources.length).toBe(conflicts.length);
    expect(report.sections.missingReferences.length).toBeGreaterThan(0);
    expect(report.sections.awaitingProfessionalReview.length).toBeGreaterThan(0);
    expect(Array.isArray(report.sections.inconsistentTranslations)).toBe(true);
  });

  it('renders every section as markdown', () => {
    const markdown = renderReportMarkdown(report);
    for (const heading of [
      '# TikaTrack evidence review',
      '## 1. Unsupported statements',
      '## 2. Outdated information',
      '## 3. Conflicting sources',
      '## 4. Missing or insufficient references',
      '## 5. English / Bangla consistency',
      '## 6. Awaiting professional review',
      '## 7. Source register',
    ]) {
      expect(markdown, heading).toContain(heading);
    }
    expect(markdown).toContain('who-bd-immunization');
    expect(markdown).toContain('C-001');
  });

  it('reports the known gap that no official schedule document is registered', () => {
    const placeholder = must(getSource('no-official-schedule-document'), 'placeholder source');
    expect(placeholder.url).toBe('');
    expect(placeholder.reviewStatus).toBe('awaiting-professional-review');
    expect(
      report.findings.some((finding) => finding.entityId === 'no-official-schedule-document'),
    ).toBe(true);
  });
});

describe('evidence lookups used by the UI', () => {
  it('summarises a national-programme antigen with its sources', () => {
    const summary = must(evidenceForLegacy('mr'), 'mr');
    expect(summary.programme).toBe('bd-nip-routine');
    expect(summary.record?.id).toBe('rec-mr');
    expect(summary.sources.map((source) => source.id)).toContain('who-bd-immunization');
    expect(summary.conflicts.map((conflict) => conflict.id)).toContain('C-002');
    expect(summary.publishable).toBe(true);
  });

  it('summarises a misclassified private product', () => {
    const summary = must(evidenceForLegacy('hexavalent'), 'hexavalent');
    expect(summary.programme).toBe('private-market-bd');
    expect(summary.record).toBeUndefined();
    expect(summary.hasClinicalEvidence).toBe(false);
    expect(summary.flags).toContain('legacy-category-misleading');
  });

  it('returns null for an unknown id rather than guessing', () => {
    expect(evidenceForLegacy('not-a-vaccine')).toBeNull();
  });

  it('derives headline facts from the data instead of hard-coding them', () => {
    const facts = knowledgeBaseFacts();
    expect(facts.catalogueEntries).toBe(allVaccines.length);
    expect(facts.structuredRecords).toBe(vaccineRecords.length);
    expect(facts.sourcesRegistered).toBe(sourceRegistry.length);
    expect(facts.openConflicts).toBe(conflicts.length);
    expect(facts.entriesAwaitingReview).toBe(legacyBridge.length);
    expect(facts.nationalProgrammeAntigens).toBe(nationalProgrammeIds().length);
  });
});
