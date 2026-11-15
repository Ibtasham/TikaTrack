/**
 * Domain types shared across TikaTrack.
 *
 * Everything a user records is expressed with these shapes; the same shapes are
 * used for the JSON export/import format so a backup taken on a phone can be
 * restored on a laptop.
 */

/**
 * A single recorded vaccination dose, in the 2.x single-slot shape.
 *
 * Superseded by {@link VaccinationEvent}: this type could only hold **one** dose
 * per vaccine, so recording OPV-2 destroyed OPV-1. It is kept because (a) 2.x
 * backups and 2.x localStorage payloads use it, (b) the derived
 * `Profile.records` projection still speaks it for older readers, and (c) code
 * written against it must keep type-checking while it is migrated.
 */
export interface DoseRecord {
  /** ISO date (`YYYY-MM-DD`) the dose was administered. */
  date: string;
  /** Optional free-text note, e.g. the centre name or batch number. */
  notes?: string;
  /** Which dose in a multi-dose series (1-based). Optional for legacy data. */
  doseNumber?: number;
  /** Where it was given. */
  centre?: string;
  /** When the record was created, ISO timestamp. */
  recordedAt?: string;
}

/** Where a dose event came from. Never inferred from the data itself. */
export type DoseProvenance =
  /** Typed into this app by the family. */
  | 'manual'
  /** Restored from a TikaTrack export, or merged from another device. */
  | 'import'
  /** Converted from a 2.x `records` entry by the migration in `doseLedger`. */
  | 'legacy-migration'
  /** Checked against a paper card by a health worker (not issued by this app). */
  | 'verified';

export const DOSE_PROVENANCES: readonly DoseProvenance[] = [
  'manual',
  'import',
  'legacy-migration',
  'verified',
] as const;

/**
 * How confidently an administered event is tied to a scheduled dose.
 *
 * `exact` — the event carries a dose number, or the user confirmed one.
 * `provisional` — a legacy event with no dose number is *assumed* to fill the
 * earliest still-open slot so the tracker does not lose the family's own data,
 * and every surface that shows it must say the dose number is unconfirmed.
 */
export type DoseAttribution = 'exact' | 'provisional';

/** Machine-readable reason a dose event needs a human to look at it. */
export type DoseReviewReason =
  /** Migrated from 2.x, which never stored which dose it was. */
  | 'legacy-dose-number-unknown'
  /** The recorded dose number is outside the schedule's range for that vaccine. */
  | 'dose-number-out-of-range'
  /** Recorded without a dose number, and not by the 2.x migration. */
  | 'dose-number-unknown'
  /** Two events claim the same dose of the same series. */
  | 'duplicate-dose-number'
  /** The administration date could not be parsed. */
  | 'invalid-date'
  /** The date is in the future. */
  | 'future-date';

/**
 * One administered dose — the atomic unit of the vaccination record.
 *
 * A vaccine supports any number of these; they are never collapsed into a single
 * slot. Scheduled (not yet given) doses are **not** events: they are derived by
 * `smartScheduler` from the schedule and the member's date of birth, so the
 * ledger only ever contains things that actually happened.
 */
export interface VaccinationEvent {
  /** Unique record id. Stable across export/import so merges can dedupe. */
  id: string;
  /** Which family member this happened to. */
  profileId: string;
  /** Vaccine id from `src/data`. */
  vaccineId: string;
  /**
   * Which version of the schedule this dose was planned against, so a future
   * schedule change does not silently re-interpret old records.
   */
  scheduleVersion: string;
  /** Groups the doses of one course: `${vaccineId}@${scheduleVersion}`. */
  seriesId: string;
  /**
   * 1-based position in the series. `null` means **unknown** — a migrated 2.x
   * record never invents one.
   */
  doseNumber: number | null;
  /**
   * Identifier of the scheduled dose this event fulfils, when it maps to one
   * (`opv#2@42d`). `null` for vaccines outside the national milestone list or
   * when the dose number is unknown.
   */
  scheduledDoseId: string | null;
  /** ISO date (`YYYY-MM-DD`) the dose was actually administered. */
  date: string;
  /** ISO timestamp of when this event was written to the ledger. */
  createdAt: string;
  /** Vaccination centre / facility name, as the family recorded it. */
  centre?: string;
  /** Manufacturer, optional. */
  manufacturer?: string;
  /** Batch / lot number, optional. */
  batch?: string;
  /** Free-text note, optional. */
  notes?: string;
  /** How the event entered the ledger. */
  provenance: DoseProvenance;
  /** `true` when a human should confirm something about this event. */
  needsReview?: boolean;
  /** Why it needs review. */
  reviewReason?: DoseReviewReason;
  /** Event id this one corrects, kept so a correction is traceable. */
  supersedes?: string;
  /** ISO timestamp of the last correction. */
  updatedAt?: string;
}

/** Everything a caller may hand to the scheduler / ledger normaliser. */
export type DoseHistoryInput =
  | Profile
  | readonly VaccinationEvent[]
  | Record<string, DoseRecord | string | undefined>
  | undefined
  | null;

/** One family member being tracked. */
export interface Profile {
  id: string;
  name: string;
  /** ISO date (`YYYY-MM-DD`). */
  dateOfBirth: string;
  /**
   * The dose ledger: every administered dose, one entry each, oldest first.
   *
   * Optional only because 2.x payloads do not have it — `profileStore`
   * migrates them on read, so in memory a profile always has an array.
   */
  events?: VaccinationEvent[];
  /**
   * Vaccine id -> dose record. **Legacy, derived.**
   *
   * Kept so 2.x backups stay readable and so an older build opening a 3.x
   * backup still shows the most recent dose per vaccine. It is rebuilt from
   * `events` on every write and must never be treated as the source of truth:
   * it can only ever hold one dose per vaccine.
   */
  records: Record<string, DoseRecord>;
  /** Relationship to the account owner, purely informational. */
  relationship?: 'self' | 'child' | 'spouse' | 'parent' | 'sibling' | 'other';
  /** Optional gender, used only for local statistics. */
  gender?: 'female' | 'male' | 'other';
  createdAt?: string;
  updatedAt?: string;
  /** ISO timestamp of the 2.x -> 3.x ledger migration, once it has run. */
  ledgerMigratedAt?: string;
}

export const PROFILE_RELATIONSHIPS = [
  'self',
  'child',
  'spouse',
  'parent',
  'sibling',
  'other',
] as const;

export type ProfileRelationship = (typeof PROFILE_RELATIONSHIPS)[number];

/** Status of a scheduled dose relative to today. */
export type DoseStatus = 'completed' | 'due-today' | 'upcoming' | 'overdue';

/** A chat turn in the TikaBot assistant. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  category?: string;
  confidence?: number;
  sources?: string[];
  relatedQuestions?: string[];
  /**
   * Facts computed from this device's own records (age, next due dose).
   *
   * Kept separate from `text`: `text` is always quoted from a sourced document,
   * this is always derived from the family's data, and the UI labels them
   * differently so neither is mistaken for the other.
   */
  personalised?: string;
  createdAt: number;
}

/**
 * Envelope for the JSON export/import format.
 *
 * `version: 3` carries the dose ledger. Versions 1 (bare array) and 2
 * (`records` only) are still **imported** — see `profileStore.mergeImport` —
 * they just cannot be produced any more.
 */
export interface TikaTrackExport {
  app: 'tikatrack';
  version: 3;
  exportedAt: string;
  profiles: Profile[];
}

/** Export versions this build can read. */
export const SUPPORTED_EXPORT_VERSIONS: readonly number[] = [1, 2, 3];

export const EXPORT_APP_ID = 'tikatrack';
export const EXPORT_VERSION = 3;
