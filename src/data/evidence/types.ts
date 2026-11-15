/**
 * Evidence-backed immunisation knowledge schema (TikaTrack 3.0).
 *
 * Everything a user is told about a vaccine is either (a) supported by a
 * registered source that is authoritative for that kind of claim, or (b)
 * explicitly marked as awaiting professional review. There is no third state:
 * an unsourced value is never presented as a fact.
 *
 * Design rules encoded here:
 *  - a clinical claim (dosing, age, interval, contraindication, precaution,
 *    adverse event, efficacy) is a first-class object that carries its own
 *    evidence and review status — never a bare string;
 *  - every source reference resolves to an entry in the source registry;
 *  - a generic homepage (`https://www.who.int`) is *not* evidence for a
 *    clinical claim, and the type system plus the validator both enforce it;
 *  - conflicting guidance is recorded, never silently merged;
 *  - every record is versioned (`revision`, `effectiveFrom`, `supersededOn`)
 *    so a change to medical content is traceable.
 */

import type { Language } from '../../i18n/types';

export type LocalizedText = Record<Language, string>;

/** Schema version of the knowledge base. Bumped on any structural change. */
export const KNOWLEDGE_SCHEMA_VERSION = '3.0.0';

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** How TikaTrack obtained and checked the document. */
export type SourceVerification =
  /** Opened during the review; quoted text is verbatim from the document. */
  | 'fetched-and-reviewed'
  /** Title/URL/publisher confirmed from the publisher's own index; body not read. */
  | 'metadata-registered'
  /** Carried over from the TikaTrack 2.x dataset; not checked. */
  | 'registered-unverified'
  /** Actively rejected as evidence for the claim type it was used for. */
  | 'rejected-insufficient';

/**
 * What a document is allowed to support. This is the mechanism that stops a
 * homepage or a portal from being cited for a dosing schedule.
 */
export type SourceSufficiency =
  /** National programme documents, official circulars, WHO position papers (once reviewed). */
  | 'authoritative-for-clinical-claims'
  /** WHO country office / ministry pages: introductions, campaigns, programme status. */
  | 'authoritative-for-programme-facts'
  /** WHO fact sheets and similar: disease and vaccine background, not dosing. */
  | 'general-information-only'
  /** Homepages, portals, aggregators: cite nothing specific. */
  | 'insufficient-for-clinical';

export type SourceReviewStatus =
  | 'reviewed'
  | 'awaiting-full-text-review'
  | 'awaiting-professional-review'
  | 'rejected';

export interface SourceRecord {
  /** Stable identifier, e.g. `who-bd-immunization`. */
  id: string;
  publisher: string;
  title: string;
  /** Must be a document-level URL for anything clinical. */
  url: string;
  /** Journal/volume/pages or document version, when the document has one. */
  version?: string;
  /** ISO date the document was published. `null` when genuinely undated. */
  publicationDate: string | null;
  /** ISO date TikaTrack last accessed it. */
  accessedDate: string;
  /** Page, section or table the claims come from. */
  section?: string;
  /** The specific claims this source supports, in words. */
  supportedClaims: string[];
  verification: SourceVerification;
  sufficiency: SourceSufficiency;
  reviewStatus: SourceReviewStatus;
  /** Jurisdiction the document speaks for. */
  jurisdiction: 'bangladesh' | 'global' | 'regional-searo' | 'other';
  notes?: string;
}

/** A pointer from a claim to a source. */
export interface EvidenceRef {
  sourceId: string;
  /** Where inside the document (page/table/section). */
  section?: string;
  /** Verbatim supporting text. Only present when the document was actually read. */
  quote?: string;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Programme classification. The first eight values are the categories required
 * by the TikaTrack 3.0 brief; the last two are documented extensions, because
 * Bangladesh has products that are officially announced but not yet delivered
 * (rotavirus) and products that exist only in research (no licensed vaccine
 * anywhere). Forcing either into one of the eight would misstate the facts.
 */
export type ProgrammeClass =
  | 'bd-nip-routine'
  | 'bd-national-campaign'
  | 'bd-sia'
  | 'bd-special-risk'
  | 'travel'
  | 'occupational'
  | 'private-market-bd'
  | 'international-reference'
  | 'bd-planned-introduction'
  | 'research-not-available';

/** Regulatory/availability status of the product itself. */
export type ProductStatus =
  | 'licensed-bd'
  | 'licensed-elsewhere-only'
  | 'not-yet-introduced-bd'
  | 'in-development'
  | 'discontinued'
  | 'unknown';

/** Review state of a single claim or of a whole record. */
export type ReviewStatus =
  /** Backed by a source whose sufficiency covers this claim type. */
  | 'evidence-verified'
  /** Source registered but body not read; usable for programme facts only. */
  | 'metadata-registered'
  /** Transcribed from the TikaTrack 2.x dataset; not independently checked. */
  | 'legacy-unverified'
  /** No adequate source exists yet — must be displayed as unconfirmed. */
  | 'requires-professional-review'
  /** Two sources disagree; see the conflict register. */
  | 'conflict-unresolved';

/** What kind of statement a claim makes — this decides which sources may back it. */
export type ClaimKind =
  | 'dosing'
  | 'age'
  | 'interval'
  | 'contraindication'
  | 'precaution'
  | 'adverse-event'
  | 'efficacy'
  | 'programme-fact'
  | 'disease-burden'
  | 'general-description';

export const CLINICAL_CLAIM_KINDS: readonly ClaimKind[] = [
  'dosing',
  'age',
  'interval',
  'contraindication',
  'precaution',
  'adverse-event',
  'efficacy',
] as const;

export interface CalendarAge {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}

export interface AgeSpec {
  /** Human-readable label exactly as the source states it, per language. */
  label: LocalizedText;
  /** Structured calendar age. Never derived from a 30-day month. */
  calendar: CalendarAge;
  /** `true` when the value is a minimum rather than a recommended age. */
  isMinimum?: boolean;
}

export interface IntervalSpec {
  days: number;
  /** What the interval is measured from. */
  from: 'previous-dose' | 'birth';
}

/**
 * One clinical or programme statement, with its own evidence and review state.
 * `value: null` means "unknown" and forces `requires-professional-review`.
 */
export interface Claim<T = string> {
  kind: ClaimKind;
  value: T | null;
  evidence: EvidenceRef[];
  reviewStatus: ReviewStatus;
  /** Why the value is what it is, or why it is absent. */
  note?: string;
  /** Conflict-register ids when sources disagree. */
  conflicts?: string[];
}

export interface DoseSpec {
  doseNumber: number;
  recommendedAge: Claim<AgeSpec>;
  /** Earliest age the dose may be given. `null` = unknown, not "no limit". */
  minimumAge: Claim<AgeSpec | null>;
  minimumIntervalFromPrevious: Claim<IntervalSpec | null>;
  /** Latest age at which the dose is still recommended, where one exists. */
  maximumAge: Claim<AgeSpec | null>;
  route?: Claim<string>;
  /** Key into the legacy `schedule[]` milestone list, when this dose is one. */
  legacyMilestoneKey?: string;
}

export interface EfficacyStatement {
  /** Exactly as the source states it — never averaged or rounded by us. */
  value: string;
  population?: string;
  endpoint?: string;
  asOf?: string;
}

export interface VaccineRecordDates {
  /** ISO date this version of the record became effective. `null` = unknown. */
  effectiveFrom: string | null;
  /** ISO date this version was superseded. `null` while current. */
  supersededOn: string | null;
  /** ISO date a human last reviewed the record against its sources. */
  lastReviewed: string | null;
  /** Publication date of the primary source, mirrored for display. */
  sourcePublished: string | null;
  /** Who/what performed `lastReviewed`. */
  reviewedBy?: string;
}

/**
 * The full structured record for one vaccine product.
 *
 * `published: false` means the record must not be shown to users or fed to the
 * assistant — used for research-stage products and for anything whose content
 * could not be reviewed in time.
 */
export interface VaccineRecord {
  id: string;
  schemaVersion: typeof KNOWLEDGE_SCHEMA_VERSION;
  revision: number;
  names: LocalizedText;
  fullNames: LocalizedText;
  /** Diseases/antigens covered. */
  antigens: LocalizedText;
  antigenIds: string[];
  /** e.g. live-attenuated, inactivated, conjugate, toxoid, polysaccharide. */
  vaccineType: Claim<string>;
  targetPopulation: Claim<LocalizedText>;
  programme: ProgrammeClass;
  productStatus: ProductStatus;
  /** Additional contexts the product is used in (travel *and* occupational, etc.). */
  alsoUsedFor?: ProgrammeClass[];
  doses: DoseSpec[];
  /** Total number of doses in the primary series, as stated by a source. */
  doseCount: Claim<number>;
  contraindications: Claim<LocalizedText>[];
  precautions: Claim<LocalizedText>[];
  commonAdverseEvents: Claim<LocalizedText>[];
  seriousAdverseEvents: Claim<LocalizedText>[];
  efficacy: Claim<EfficacyStatement>;
  diseaseBurden: Claim<LocalizedText>;
  description: Claim<LocalizedText>;
  /** Programme-level statements (introduction years, campaign activity, status). */
  programmeFacts: Claim<string>[];
  /** Free-text summary of what a reviewer must still check. */
  reviewNote?: string;
  dates: VaccineRecordDates;
  reviewStatus: ReviewStatus;
  /** May this record be shown to users and indexed by the assistant? */
  published: boolean;
  /** Conflict-register ids affecting this record. */
  conflicts: string[];
  /** Legacy 2.x catalogue ids this record replaces or maps to. */
  legacyIds: string[];
}

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

export interface ConflictEntry {
  id: string;
  title: LocalizedText;
  /** The competing statements, each with its own evidence. Never merged. */
  statements: { statement: string; evidence: EvidenceRef[]; origin: string }[];
  affectedRecordIds: string[];
  affectedLegacyIds: string[];
  status: 'unresolved' | 'resolved-with-source' | 'superseded';
  /** What must happen before this may be resolved. */
  requiredAction: string;
  openedDate: string;
  /** Set only when `status` is not `unresolved`. */
  resolution?: { decidedOn: string; decidedBy: string; evidence: EvidenceRef[]; decision: string };
}

// ---------------------------------------------------------------------------
// Legacy bridge
// ---------------------------------------------------------------------------

export type BridgeFlag =
  | 'legacy-category-misleading'
  | 'schedule-text-not-bangladeshi'
  | 'product-not-licensed-in-bangladesh'
  | 'research-stage-product'
  | 'source-url-is-homepage'
  | 'introduced-value-is-not-a-date'
  | 'efficacy-without-source'
  | 'discontinued-product'
  | 'duplicate-antigen-coverage'
  | 'awaiting-professional-review';

/**
 * Maps every TikaTrack 2.x catalogue entry onto the new classification without
 * deleting anything. The legacy dataset stays in place (no user-visible data is
 * lost); the bridge is the authoritative interpretation of it.
 */
export interface LegacyBridgeEntry {
  legacyId: string;
  /** Present once a full structured record has been authored for this product. */
  recordId?: string;
  programme: ProgrammeClass;
  productStatus: ProductStatus;
  reviewStatus: ReviewStatus;
  flags: BridgeFlag[];
  conflicts: string[];
}
