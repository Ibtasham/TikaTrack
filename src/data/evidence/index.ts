/**
 * Public API of the evidence layer.
 *
 * The rest of the application imports from here only. Everything the app says
 * about a vaccine should be traceable through `evidenceForLegacy()` to a
 * registered source, a review status, or an open conflict.
 */

import { allVaccines } from '../vaccines';
import { bridgeFor, isPublishable, legacyBridge, nationalProgrammeIds, programmeFor } from './bridge';
import { conflicts, conflictsFor, getConflict, OPEN_CONFLICT_COUNT } from './conflicts';
import {
  claimsOf,
  getRecord,
  getRecordByLegacyId,
  publishedRecords,
  REVIEW_BY,
  REVIEW_DATE,
  vaccineRecords,
} from './records';
import {
  getSource,
  hasSource,
  isSufficientForClinicalClaim,
  isSufficientForProgrammeFact,
  sourceRegistry,
  sourcesBySufficiency,
} from './sources';
import type {
  BridgeFlag,
  ConflictEntry,
  EvidenceRef,
  LegacyBridgeEntry,
  ProductStatus,
  ProgrammeClass,
  ReviewStatus,
  SourceRecord,
  VaccineRecord,
} from './types';
import { KNOWLEDGE_SCHEMA_VERSION } from './types';

/** Version of the knowledge base as a whole. Bumped in `docs/DATA-CHANGELOG.md`. */
export const KNOWLEDGE_BASE_VERSION = '3.0.0-alpha.1';

export {
  KNOWLEDGE_SCHEMA_VERSION,
  REVIEW_DATE,
  REVIEW_BY,
  conflicts,
  conflictsFor,
  getConflict,
  OPEN_CONFLICT_COUNT,
  claimsOf,
  getRecord,
  getRecordByLegacyId,
  publishedRecords,
  vaccineRecords,
  bridgeFor,
  isPublishable,
  legacyBridge,
  nationalProgrammeIds,
  programmeFor,
  getSource,
  hasSource,
  isSufficientForClinicalClaim,
  isSufficientForProgrammeFact,
  sourceRegistry,
  sourcesBySufficiency,
};

export type {
  BridgeFlag,
  ConflictEntry,
  EvidenceRef,
  LegacyBridgeEntry,
  ProductStatus,
  ProgrammeClass,
  ReviewStatus,
  SourceRecord,
  VaccineRecord,
};

/** Everything the UI needs to label one legacy catalogue entry honestly. */
export interface LegacyEvidenceSummary {
  legacyId: string;
  programme: ProgrammeClass;
  productStatus: ProductStatus;
  reviewStatus: ReviewStatus;
  flags: BridgeFlag[];
  conflicts: ConflictEntry[];
  record?: VaccineRecord;
  publishable: boolean;
  /** Sources attached to any claim of the structured record, resolved. */
  sources: SourceRecord[];
  /** True when at least one clinical claim is backed by a sufficient source. */
  hasClinicalEvidence: boolean;
}

export function evidenceForLegacy(legacyId: string): LegacyEvidenceSummary | null {
  const bridge = bridgeFor(legacyId);
  if (!bridge) return null;
  const record = getRecordByLegacyId(legacyId);
  const sourceIds = new Set<string>();
  if (record) {
    for (const claim of claimsOf(record)) {
      for (const ref of claim.evidence) sourceIds.add(ref.sourceId);
    }
  }
  const sources = [...sourceIds]
    .map((id) => getSource(id))
    .filter((source): source is SourceRecord => Boolean(source));
  const hasClinicalEvidence = record
    ? claimsOf(record).some(
        (claim) =>
          claim.kind !== 'programme-fact' &&
          claim.kind !== 'general-description' &&
          claim.kind !== 'disease-burden' &&
          claim.evidence.some((ref: EvidenceRef) => isSufficientForClinicalClaim(ref.sourceId)),
      )
    : false;
  return {
    legacyId,
    programme: bridge.programme,
    productStatus: bridge.productStatus,
    reviewStatus: bridge.reviewStatus,
    flags: bridge.flags,
    conflicts: bridge.conflicts
      .map((id) => getConflict(id))
      .filter((entry): entry is ConflictEntry => Boolean(entry)),
    record,
    publishable: isPublishable(legacyId),
    sources,
    hasClinicalEvidence,
  };
}

/** Aggregate numbers for the UI, so no page hard-codes a statistic. */
export function knowledgeBaseFacts() {
  const awaitingReview = legacyBridge.filter(
    (entry) => entry.reviewStatus === 'requires-professional-review' || entry.reviewStatus === 'conflict-unresolved',
  ).length;
  return {
    version: KNOWLEDGE_BASE_VERSION,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    catalogueEntries: allVaccines.length,
    structuredRecords: vaccineRecords.length,
    publishedRecords: publishedRecords().length,
    sourcesRegistered: sourceRegistry.length,
    sourcesSufficientForClinicalClaims: sourceRegistry.filter((source) =>
      isSufficientForClinicalClaim(source.id),
    ).length,
    openConflicts: OPEN_CONFLICT_COUNT,
    entriesAwaitingReview: awaitingReview,
    nationalProgrammeAntigens: nationalProgrammeIds().length,
    lastReviewed: REVIEW_DATE,
  };
}
