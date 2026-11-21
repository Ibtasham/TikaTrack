/**
 * The dose ledger: one event per administered dose.
 *
 * TikaTrack 2.x stored `Record<vaccineId, DoseRecord>` — a **single slot per
 * vaccine**. Recording OPV-2 overwrote OPV-1, one record made the scheduler
 * treat a three- or four-dose series as finished, and deleting "a dose" deleted
 * the vaccine's whole history. This module replaces that with an append-only
 * list of {@link VaccinationEvent}s and the pure helpers that read it.
 *
 * Rules this module enforces, in order of importance:
 *
 * 1. **Nothing is lost.** Migration from the 2.x shape is additive: every date,
 *    note, centre and `recordedAt` is carried over, and the old `records` map is
 *    still written as a derived projection for older readers.
 * 2. **Nothing is invented.** A 2.x record does not say which dose it was, so
 *    the migrated event keeps `doseNumber: null` and is flagged `needsReview`.
 * 3. **One legacy record never completes a series.** Unattributed events are
 *    allowed to fill at most one scheduled dose each, earliest first, and every
 *    such match is labelled `provisional` so the UI can say the dose number is
 *    unconfirmed.
 * 4. **Deterministic.** Same input, same output: stable ids for migrated rows,
 *    total ordering by date → createdAt → id.
 *
 * Pure module: no React, no storage I/O, no network. `profileStore` and the
 * scheduler are the only things that persist or interpret the result.
 */

import { allVaccines, schedule } from '../data/vaccines';
import {
  DOSE_PROVENANCES,
  type DoseAttribution,
  type DoseProvenance,
  type DoseRecord,
  type DoseReviewReason,
  type Profile,
  type VaccinationEvent,
} from '../types';
import {
  isValidISODate,
  resolveReferenceTodayISO,
  type CalendarDateOptions,
} from './format';
import { createId } from './id';

/**
 * Names the milestone table these events were planned against.
 *
 * Deliberately not a clinical claim: it identifies *this app's* transcription of
 * the national milestone list (`src/data/vaccines.ts schedule[]`), whose ages are
 * still unconfirmed by an official document — see the evidence layer's conflict
 * register (C-005). Storing it means a future schedule change cannot silently
 * re-interpret doses recorded today.
 */
export const SCHEDULE_VERSION = 'bd-nip-milestones-2.x';

/** Bumped when the on-disk shape of an event changes. */
export const LEDGER_VERSION = 3;

const VACCINE_ID = /^[a-z0-9_-]{1,64}$/i;

const MAX_CENTRE_LENGTH = 200;
const MAX_MANUFACTURER_LENGTH = 120;
const MAX_BATCH_LENGTH = 60;
const MAX_NOTES_LENGTH = 500;

// ---------------------------------------------------------------------------
// The milestone table, and the dose numbers derived from it
// ---------------------------------------------------------------------------

/** One vaccine-dose row of the national milestone schedule. */
export interface MilestoneDose {
  vaccineId: string;
  /** Age in days at which the milestone falls. */
  ageDays: number;
  /** Exact calendar months when specified (e.g. 9 and 15 months). */
  ageMonths?: number;
  /** 1-based position of this dose in the vaccine's series. */
  doseNumber: number;
  /** The label the schedule itself uses (`OPV-2`, `Pentavalent-3`). */
  label: { en: string; bn: string };
  /** Stable reference for `VaccinationEvent.scheduledDoseId`. */
  scheduledDoseId: string;
}

/** `${vaccineId}#${doseNumber}@${ageDays}d` — e.g. `opv#2@42d`. */
export function buildScheduledDoseId(
  vaccineId: string,
  doseNumber: number,
  ageDays: number,
): string {
  return `${vaccineId}#${doseNumber}@${ageDays}d`;
}

/**
 * The milestone table, flattened and dose-numbered.
 *
 * Dose numbers are the 1-based order in which a vaccine appears in `schedule[]`
 * when it is walked youngest-first. That is not a new clinical rule — it is the
 * same order the schedule's own labels already encode (`OPV-0` at birth is dose 1
 * of 4, `Pentavalent-1/2/3` at 6/10/14 weeks are doses 1–3) and the same
 * numbering the evidence layer's records use. `doseLedger.test.ts` pins it
 * against both, so a silent re-ordering of the schedule fails the build.
 */
export const MILESTONE_DOSES: readonly MilestoneDose[] = (() => {
  const ordered = [...schedule].sort((a, b) => a.ageDays - b.ageDays);
  const seen = new Map<string, number>();
  const rows: MilestoneDose[] = [];
  for (const milestone of ordered) {
    for (const entry of milestone.vaccines) {
      const doseNumber = (seen.get(entry.id) ?? 0) + 1;
      seen.set(entry.id, doseNumber);
      rows.push({
        vaccineId: entry.id,
        ageDays: milestone.ageDays,
        ageMonths: milestone.ageMonths,
        doseNumber,
        label: entry.name,
        scheduledDoseId: buildScheduledDoseId(entry.id, doseNumber, milestone.ageDays),
      });
    }
  }
  return rows;
})();

const BY_VACCINE: ReadonlyMap<string, readonly MilestoneDose[]> = (() => {
  const map = new Map<string, MilestoneDose[]>();
  for (const row of MILESTONE_DOSES) {
    const list = map.get(row.vaccineId);
    if (list) list.push(row);
    else map.set(row.vaccineId, [row]);
  }
  return map;
})();

/** Milestone doses for one vaccine, youngest first. Empty when unscheduled. */
export function milestoneDoses(vaccineId: string): readonly MilestoneDose[] {
  return BY_VACCINE.get(vaccineId) ?? [];
}

/** How many doses of this vaccine the milestone schedule contains. */
export function milestoneDoseCount(vaccineId: string): number {
  return milestoneDoses(vaccineId).length;
}

/** Dose number of the milestone at `ageDays`, or `null` when there is none. */
export function doseNumberForMilestone(vaccineId: string, ageDays: number): number | null {
  const found = milestoneDoses(vaccineId).find((row) => row.ageDays === ageDays);
  return found ? found.doseNumber : null;
}

/** The milestone for one dose number, or `undefined` when unscheduled. */
export function milestoneForDose(vaccineId: string, doseNumber: number): MilestoneDose | undefined {
  return milestoneDoses(vaccineId).find((row) => row.doseNumber === doseNumber);
}

/**
 * `scheduledDoseId` for an event, or `null` when the dose number is unknown or
 * the vaccine is not part of the milestone schedule.
 */
export function scheduledDoseIdFor(
  vaccineId: string,
  doseNumber: number | null | undefined,
): string | null {
  if (typeof doseNumber !== 'number' || !Number.isFinite(doseNumber)) return null;
  const milestone = milestoneForDose(vaccineId, doseNumber);
  return milestone ? milestone.scheduledDoseId : null;
}

/** One course of a vaccine: `${vaccineId}@${scheduleVersion}`. */
export function seriesIdFor(vaccineId: string, scheduleVersion = SCHEDULE_VERSION): string {
  return `${vaccineId}@${scheduleVersion}`;
}

/** A new unique event id. */
export function createEventId(): string {
  return createId('dose');
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, maxLength);
  return text.length > 0 ? text : undefined;
}

function cleanDoseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num) || num <= 0) return null;
  return Math.floor(num);
}

function cleanProvenance(value: unknown, fallback: DoseProvenance): DoseProvenance {
  return typeof value === 'string' && (DOSE_PROVENANCES as readonly string[]).includes(value)
    ? (value as DoseProvenance)
    : fallback;
}

/** The review flags that follow from an event's own fields. */
export function deriveReview(
  event: Pick<VaccinationEvent, 'vaccineId' | 'doseNumber' | 'date' | 'provenance'>,
  dateOptions: CalendarDateOptions = {},
): { needsReview: boolean; reviewReason?: DoseReviewReason } {
  if (!isValidISODate(event.date)) {
    return { needsReview: true, reviewReason: 'invalid-date' };
  }
  const refToday = resolveReferenceTodayISO(dateOptions);
  if (event.date > refToday) {
    return { needsReview: true, reviewReason: 'future-date' };
  }
  const count = milestoneDoseCount(event.vaccineId);
  if (event.doseNumber === null) {
    // A migrated row that never knew its position stays flagged until a human
    // confirms it. A manually recorded "not sure" dose is flagged too — it is
    // the same gap in the data, whatever wrote it — but under its own reason, so
    // the UI never tells a family that a number they did not give is wrong.
    if (event.provenance === 'legacy-migration') {
      return { needsReview: true, reviewReason: 'legacy-dose-number-unknown' };
    }
    return {
      needsReview: count > 0,
      reviewReason: count > 0 ? 'dose-number-unknown' : undefined,
    };
  }
  if (count > 0 && event.doseNumber > count) {
    return { needsReview: true, reviewReason: 'dose-number-out-of-range' };
  }
  return { needsReview: false };
}

export interface NormaliseEventOptions {
  /** Provenance to use when the input does not carry a valid one. */
  fallbackProvenance?: DoseProvenance;
  /** Event id to use when the input does not carry one. */
  id?: string;
  /** Timestamp for `createdAt` when the input does not carry one. */
  now?: string;
}

/**
 * Coerce untrusted input (localStorage, a backup file, an API row) into a valid
 * {@link VaccinationEvent}, or `null` when it is beyond repair.
 *
 * Repairable means "there is a vaccine id and an ISO administration date".
 * Everything else is filled in, capped, or flagged — never guessed.
 */
export function normaliseEvent(
  raw: unknown,
  profileId: string,
  options: NormaliseEventOptions = {},
): VaccinationEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  const vaccineId = typeof candidate.vaccineId === 'string' ? candidate.vaccineId.trim() : '';
  if (!VACCINE_ID.test(vaccineId)) return null;

  const date = typeof candidate.date === 'string' ? candidate.date.trim().slice(0, 10) : '';
  if (!isValidISODate(date)) return null;

  const now = options.now ?? new Date().toISOString();
  const scheduleVersion = cleanText(candidate.scheduleVersion, 64) ?? SCHEDULE_VERSION;
  const doseNumber = cleanDoseNumber(candidate.doseNumber);
  const provenance = cleanProvenance(candidate.provenance, options.fallbackProvenance ?? 'manual');

  const event: VaccinationEvent = {
    id: cleanText(candidate.id, 96) ?? options.id ?? createEventId(),
    profileId: cleanText(candidate.profileId, 96) ?? profileId,
    vaccineId,
    scheduleVersion,
    // Recomputed, never trusted: a series id that disagrees with the schedule
    // version would let one course be split across two.
    seriesId: seriesIdFor(vaccineId, scheduleVersion),
    doseNumber,
    scheduledDoseId: scheduledDoseIdFor(vaccineId, doseNumber),
    date,
    createdAt: cleanText(candidate.createdAt, 64) ?? now,
    provenance,
  };

  const centre = cleanText(candidate.centre, MAX_CENTRE_LENGTH);
  if (centre) event.centre = centre;
  const manufacturer = cleanText(candidate.manufacturer, MAX_MANUFACTURER_LENGTH);
  if (manufacturer) event.manufacturer = manufacturer;
  const batch = cleanText(candidate.batch, MAX_BATCH_LENGTH);
  if (batch) event.batch = batch;
  const notes = cleanText(candidate.notes, MAX_NOTES_LENGTH);
  if (notes) event.notes = notes;
  const supersedes = cleanText(candidate.supersedes, 96);
  if (supersedes) event.supersedes = supersedes;
  const updatedAt = cleanText(candidate.updatedAt, 64);
  if (updatedAt) event.updatedAt = updatedAt;

  // An explicit flag from the input is honoured (it may carry a reason this
  // function cannot rederive, e.g. a duplicate found at import time); the
  // derived flags are added on top, never removed.
  const derived = deriveReview(event);
  const inheritedReason =
    typeof candidate.reviewReason === 'string'
      ? (candidate.reviewReason as DoseReviewReason)
      : undefined;
  const needsReview = candidate.needsReview === true || derived.needsReview;
  if (needsReview) {
    event.needsReview = true;
    const reason = derived.reviewReason ?? inheritedReason;
    if (reason) event.reviewReason = reason;
  }

  return event;
}

/** Total ordering for the ledger: by date, then creation, then id. */
export function compareEvents(a: VaccinationEvent, b: VaccinationEvent): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const createdA = a.createdAt ?? '';
  const createdB = b.createdAt ?? '';
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** Sorted copy of a ledger. */
export function sortEvents(events: readonly VaccinationEvent[]): VaccinationEvent[] {
  return [...events].sort(compareEvents);
}

// ---------------------------------------------------------------------------
// Migration from the 2.x single-slot shape
// ---------------------------------------------------------------------------

export interface MigrationFinding {
  vaccineId: string;
  eventId: string;
  reason: DoseReviewReason;
}

export interface MigrationResult {
  events: VaccinationEvent[];
  /** One entry per migrated event that a human should confirm. */
  findings: MigrationFinding[];
}

/**
 * The stable id for an event migrated from a 2.x `records` entry.
 *
 * Deterministic on purpose: the legacy map holds at most one dose per vaccine,
 * so re-importing the same backup cannot duplicate it, and two devices that
 * migrated the same 2.x profile agree on the id.
 */
export function legacyEventId(profileId: string, vaccineId: string): string {
  return `dose-legacy-${profileId}-${vaccineId}`;
}

/**
 * Convert a 2.x `Record<vaccineId, DoseRecord>` map into ledger events.
 *
 * Non-destructive and additive: the input is never mutated, nothing is dropped,
 * and no dose number is invented. A record that does not say which dose it was
 * becomes `doseNumber: null` + `needsReview`.
 */
export function migrateLegacyRecords(
  profileId: string,
  records: Record<string, unknown> | undefined | null,
  now = new Date().toISOString(),
): MigrationResult {
  const events: VaccinationEvent[] = [];
  const findings: MigrationFinding[] = [];
  if (!records || typeof records !== 'object') return { events, findings };

  for (const [vaccineId, raw] of Object.entries(records)) {
    if (!VACCINE_ID.test(vaccineId)) continue;

    // v1 stored a bare date string; v2 stored an object. Both are legal input.
    const candidate: Record<string, unknown> =
      typeof raw === 'string' ? { date: raw } : ((raw ?? {}) as Record<string, unknown>);
    const recordedAt =
      typeof candidate.recordedAt === 'string' && candidate.recordedAt ? candidate.recordedAt : now;

    const event = normaliseEvent(
      {
        ...candidate,
        id: legacyEventId(profileId, vaccineId),
        vaccineId,
        profileId,
        provenance: 'legacy-migration',
        scheduleVersion: SCHEDULE_VERSION,
        // `recordedAt` is the 2.x creation stamp; keep it as the event's origin.
        createdAt: recordedAt,
      },
      profileId,
      { fallbackProvenance: 'legacy-migration', now },
    );
    if (!event) continue;

    events.push(event);
    if (event.needsReview && event.reviewReason) {
      findings.push({ vaccineId, eventId: event.id, reason: event.reviewReason });
    }
  }

  return { events: sortEvents(events), findings };
}

/**
 * The 2.x-shaped projection of a ledger: the most recent dose per vaccine.
 *
 * Written alongside `events` so that (a) an older build opening a 3.x backup
 * still shows something truthful and (b) any code path not yet converted to the
 * ledger cannot claim a dose that was never given. It is lossy by construction —
 * one slot per vaccine — which is exactly why it is derived and never read back
 * as the source of truth.
 */
export function legacyProjection(events: readonly VaccinationEvent[]): Record<string, DoseRecord> {
  const records: Record<string, DoseRecord> = {};
  for (const event of sortEvents(events)) {
    const record: DoseRecord = { date: event.date };
    if (event.notes) record.notes = event.notes;
    if (event.doseNumber !== null) record.doseNumber = event.doseNumber;
    if (event.centre) record.centre = event.centre;
    record.recordedAt = event.createdAt;
    records[event.vaccineId] = record;
  }
  return records;
}

/**
 * Give a profile its ledger, migrating 2.x data when necessary.
 *
 * Idempotent: a profile that already has events is returned with those events
 * normalised (repaired, deduplicated, sorted) and the legacy projection
 * refreshed — the migration never runs twice over the same data, so a
 * down/upgrade round trip cannot resurrect deleted doses.
 *
 * The one exception is a payload claiming `events: []` while still carrying
 * `records`: that is a 2.x profile whose events were stripped, and trusting the
 * empty array would silently delete the family's history.
 */
export function ensureLedger(profile: Profile, now = new Date().toISOString()): Profile {
  const hasEvents = Array.isArray(profile.events);
  const records = profile.records ?? {};
  const recordCount = Object.keys(records).length;
  const needsMigration = !hasEvents || ((profile.events?.length ?? 0) === 0 && recordCount > 0);

  let events: VaccinationEvent[];
  let ledgerMigratedAt = profile.ledgerMigratedAt;

  if (needsMigration) {
    const migrated = migrateLegacyRecords(profile.id, records, now);
    events = migrated.events;
    if (!ledgerMigratedAt && (migrated.events.length > 0 || recordCount > 0)) {
      ledgerMigratedAt = now;
    }
  } else {
    events = dedupeById(
      (profile.events ?? [])
        .map((raw) => normaliseEvent(raw, profile.id, { now }))
        .filter((event): event is VaccinationEvent => event !== null),
    );
  }

  const reviewed = flagDuplicateDoseNumbers(sortEvents(events));
  const next: Profile = {
    ...profile,
    records: legacyProjection(reviewed),
    events: reviewed,
  };
  if (ledgerMigratedAt) next.ledgerMigratedAt = ledgerMigratedAt;
  return next;
}

/** Keep the first event for each id (the ledger is sorted, so: the earliest). */
export function dedupeById(events: readonly VaccinationEvent[]): VaccinationEvent[] {
  const seen = new Set<string>();
  const out: VaccinationEvent[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out;
}

/**
 * Flag events that claim a dose number another event in the same series already
 * claimed. Both events are kept — the family did attend twice — but the tracker
 * must not count the dose twice, and a human should work out which is right.
 */
export function flagDuplicateDoseNumbers(events: readonly VaccinationEvent[]): VaccinationEvent[] {
  const claimed = new Map<string, string>();
  return events.map((event) => {
    if (event.doseNumber === null) return event;
    const key = `${event.seriesId}#${event.doseNumber}`;
    const first = claimed.get(key);
    if (!first) {
      claimed.set(key, event.id);
      return event;
    }
    if (first === event.id) return event;
    return {
      ...event,
      needsReview: true,
      reviewReason: event.reviewReason ?? 'duplicate-dose-number',
    };
  });
}

// ---------------------------------------------------------------------------
// Reading the ledger: per-vaccine series state
// ---------------------------------------------------------------------------

/** One administered dose as the scheduler and UI see it. */
export interface AdministeredDose {
  eventId: string;
  date: string;
  /** `null` when the family never recorded which dose it was. */
  doseNumber: number | null;
  /** `provisional` when the dose number was inferred to fill an open slot. */
  attribution: DoseAttribution;
  provenance: DoseProvenance;
  needsReview: boolean;
  reviewReason?: DoseReviewReason;
  centre?: string;
  manufacturer?: string;
  batch?: string;
  notes?: string;
  scheduledDoseId: string | null;
}

export interface VaccineSeriesState {
  vaccineId: string;
  /** Every administered dose of this vaccine, oldest first. */
  administered: AdministeredDose[];
  /** Dose numbers satisfied by a recorded (exact) dose number. */
  completedDoseNumbers: number[];
  /** Dose numbers satisfied by an inferred match — always flagged in the UI. */
  provisionalDoseNumbers: number[];
  /** `completedDoseNumbers ∪ provisionalDoseNumbers`, ascending. */
  satisfiedDoseNumbers: number[];
  /** Doses whose position in the series is unknown. */
  unattributedCount: number;
  /** Events claiming the same dose number, or otherwise needing a human. */
  needsReview: boolean;
  /** Most recent administration date, if any. */
  latestDate?: string;
  /** How many doses the milestone schedule expects; 0 when unscheduled. */
  scheduledDoseCount: number;
  /** `true` when the vaccine is not part of the milestone schedule at all. */
  unscheduled: boolean;
}

export type DoseHistory = Record<string, VaccineSeriesState>;

/** An empty series state, for a vaccine with no events. */
export function emptySeriesState(vaccineId: string): VaccineSeriesState {
  const scheduledDoseCount = milestoneDoseCount(vaccineId);
  return {
    vaccineId,
    administered: [],
    completedDoseNumbers: [],
    provisionalDoseNumbers: [],
    satisfiedDoseNumbers: [],
    unattributedCount: 0,
    needsReview: false,
    scheduledDoseCount,
    unscheduled: scheduledDoseCount === 0,
  };
}

/**
 * Reduce a ledger to per-vaccine state, attributing each administered dose to at
 * most one scheduled dose.
 *
 * Attribution, in order:
 * 1. events carrying a dose number that matches a milestone → `exact`;
 * 2. events with no dose number → `provisional`, earliest event to earliest
 *    still-open milestone, capped at the number of milestones.
 *
 * Step 2 is a **data-attribution heuristic, not a clinical rule**: it exists so a
 * family that migrated from 2.x does not watch their own recorded doses vanish
 * from the tracker. It can never mark more doses complete than the family
 * recorded, so one legacy row can never finish a three- or four-dose series, and
 * every provisional match carries `needsReview` for the UI to disclose.
 */
export function seriesState(events: readonly VaccinationEvent[]): DoseHistory {
  const byVaccine = new Map<string, VaccinationEvent[]>();
  for (const event of sortEvents(events)) {
    const list = byVaccine.get(event.vaccineId);
    if (list) list.push(event);
    else byVaccine.set(event.vaccineId, [event]);
  }

  const history: DoseHistory = {};
  for (const [vaccineId, list] of byVaccine) {
    history[vaccineId] = seriesStateForVaccine(vaccineId, list);
  }
  return history;
}

function seriesStateForVaccine(
  vaccineId: string,
  events: readonly VaccinationEvent[],
): VaccineSeriesState {
  const state = emptySeriesState(vaccineId);
  const milestones = milestoneDoses(vaccineId);
  const satisfied = new Set<number>();
  const administered: AdministeredDose[] = [];

  // Pass 1 — exact dose numbers. The earliest event keeps the slot; a later
  // event claiming the same dose is recorded (it happened) but satisfies nothing
  // and is flagged for review.
  const openUnattributed: VaccinationEvent[] = [];
  for (const event of events) {
    if (event.doseNumber === null) {
      openUnattributed.push(event);
      continue;
    }
    const milestone = milestoneForDose(vaccineId, event.doseNumber);
    const already = satisfied.has(event.doseNumber);
    if (milestone && !already) satisfied.add(event.doseNumber);
    administered.push(
      toAdministeredDose(event, 'exact', milestone ? event.doseNumber : null, already),
    );
  }

  // Pass 2 — provisional attribution for events that never recorded a position.
  for (const event of openUnattributed) {
    const slot = milestones.find((milestone) => !satisfied.has(milestone.doseNumber));
    if (slot) {
      satisfied.add(slot.doseNumber);
      administered.push(toAdministeredDose(event, 'provisional', slot.doseNumber, false));
    } else {
      administered.push(toAdministeredDose(event, 'provisional', null, false));
    }
  }

  administered.sort((a, b) => compareAdministered(a, b, events));

  state.administered = administered;
  state.completedDoseNumbers = administered
    .filter((dose) => dose.attribution === 'exact' && dose.doseNumber !== null)
    .map((dose) => dose.doseNumber as number)
    .sort((a, b) => a - b);
  state.provisionalDoseNumbers = administered
    .filter((dose) => dose.attribution === 'provisional' && dose.doseNumber !== null)
    .map((dose) => dose.doseNumber as number)
    .sort((a, b) => a - b);
  state.satisfiedDoseNumbers = [...satisfied].sort((a, b) => a - b);
  state.unattributedCount = openUnattributed.length;
  state.needsReview = administered.some((dose) => dose.needsReview);
  const latest = administered[administered.length - 1];
  if (latest) state.latestDate = latest.date;
  return state;
}

function compareAdministered(
  a: AdministeredDose,
  b: AdministeredDose,
  events: readonly VaccinationEvent[],
): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const eventA = events.find((event) => event.id === a.eventId);
  const eventB = events.find((event) => event.id === b.eventId);
  const createdA = eventA?.createdAt ?? '';
  const createdB = eventB?.createdAt ?? '';
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;
  return a.eventId < b.eventId ? -1 : 1;
}

function toAdministeredDose(
  event: VaccinationEvent,
  attribution: DoseAttribution,
  doseNumber: number | null,
  duplicate: boolean,
): AdministeredDose {
  const dose: AdministeredDose = {
    eventId: event.id,
    date: event.date,
    doseNumber,
    attribution,
    provenance: event.provenance,
    needsReview: event.needsReview === true || duplicate,
    scheduledDoseId: doseNumber === null ? null : scheduledDoseIdFor(event.vaccineId, doseNumber),
  };
  if (duplicate) dose.reviewReason = 'duplicate-dose-number';
  else if (event.reviewReason) dose.reviewReason = event.reviewReason;
  if (event.centre) dose.centre = event.centre;
  if (event.manufacturer) dose.manufacturer = event.manufacturer;
  if (event.batch) dose.batch = event.batch;
  if (event.notes) dose.notes = event.notes;
  return dose;
}

/** Is this dose of this vaccine satisfied by the ledger? */
export function isDoseSatisfied(
  history: DoseHistory,
  vaccineId: string,
  doseNumber: number,
): boolean {
  return history[vaccineId]?.satisfiedDoseNumbers.includes(doseNumber) ?? false;
}

/** The event behind a satisfied dose, when there is one. */
export function administeredForDose(
  history: DoseHistory,
  vaccineId: string,
  doseNumber: number,
): AdministeredDose | undefined {
  return history[vaccineId]?.administered.find(
    (dose) => dose.doseNumber === doseNumber && dose.scheduledDoseId !== null,
  );
}

// ---------------------------------------------------------------------------
// Input normalisation: one entry point for every caller
// ---------------------------------------------------------------------------

/** Anything the scheduler will accept as "what has this member had?". */
export type DoseHistoryInput =
  | Profile
  | { events?: readonly VaccinationEvent[]; records?: Record<string, unknown> }
  | readonly VaccinationEvent[]
  | DoseHistory
  | Record<string, DoseRecord | string | undefined>
  | undefined
  | null;

function isSeriesState(value: unknown): value is VaccineSeriesState {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as VaccineSeriesState).administered) &&
    Array.isArray((value as VaccineSeriesState).satisfiedDoseNumbers)
  );
}

function isEvent(value: unknown): value is VaccinationEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as VaccinationEvent).vaccineId === 'string' &&
    typeof (value as VaccinationEvent).date === 'string'
  );
}

function isDoseHistoryMap(value: object): boolean {
  const entries = Object.values(value);
  return entries.length > 0 && entries.every((entry) => isSeriesState(entry));
}

/**
 * Normalise any of the accepted shapes into a {@link DoseHistory}.
 *
 * Accepting the legacy `Record<vaccineId, DoseRecord>` map matters: it is what
 * 2.x data holds, what older tests pass, and what a not-yet-converted call site
 * still has. Every path ends in the same per-dose attribution, so no caller can
 * accidentally get the old "one record completes the series" behaviour.
 */
export function toDoseHistory(input: DoseHistoryInput, now?: string): DoseHistory {
  if (input === null || input === undefined) return {};

  if (Array.isArray(input)) {
    const events = (input as unknown[]).filter(isEvent) as VaccinationEvent[];
    return seriesState(flagDuplicateDoseNumbers(sortEvents(events)));
  }

  if (typeof input !== 'object') return {};

  // Already normalised.
  if (isDoseHistoryMap(input)) return { ...(input as DoseHistory) };

  const candidate = input as {
    events?: unknown;
    records?: unknown;
    id?: unknown;
  };

  // Profile-like: prefer the ledger, fall back to migrating `records`.
  if (
    Array.isArray(candidate.events) ||
    (candidate.records && typeof candidate.records === 'object')
  ) {
    const events = Array.isArray(candidate.events)
      ? (candidate.events.filter(isEvent) as VaccinationEvent[])
      : [];
    const records =
      candidate.records && typeof candidate.records === 'object'
        ? (candidate.records as Record<string, unknown>)
        : {};
    if (events.length > 0) {
      return seriesState(flagDuplicateDoseNumbers(sortEvents(events)));
    }
    return seriesState(migrateLegacyRecords(String(candidate.id ?? ''), records, now).events);
  }

  // A bare legacy map: `{ bcg: '2024-01-05' }` or `{ bcg: { date: '...' } }`.
  const legacy: Record<string, unknown> = {};
  for (const [vaccineId, value] of Object.entries(candidate)) {
    if (typeof value === 'string' || (value && typeof value === 'object' && 'date' in value)) {
      legacy[vaccineId] = value;
    }
  }
  return seriesState(migrateLegacyRecords('', legacy, now).events);
}

// ---------------------------------------------------------------------------
// Writing the ledger
// ---------------------------------------------------------------------------

export type DoseInputError =
  | 'missing-vaccine'
  | 'unknown-vaccine'
  | 'missing-date'
  | 'invalid-date'
  | 'future-date'
  | 'invalid-dose-number';

export interface NewDoseEventInput {
  vaccineId: string;
  /** ISO date the dose was administered. Today at the latest. */
  date: string;
  /**
   * 1-based dose number, or `null`/omitted when the family is not sure. A
   * numeric string is accepted because that is what a form field yields.
   */
  doseNumber?: number | string | null;
  centre?: string;
  manufacturer?: string;
  batch?: string;
  notes?: string;
  provenance?: DoseProvenance;
  scheduleVersion?: string;
  /** Supply to keep an id stable across devices (imports, tests). */
  id?: string;
  createdAt?: string;
}

export type BuildEventResult =
  { event: VaccinationEvent; error?: undefined } | { event?: undefined; error: DoseInputError };

/**
 * Validate + build one event.
 *
 * A dose is something that **happened**: future dates are rejected here rather
 * than stored, because the ledger is the record of administrations and the
 * schedule (not the ledger) is where upcoming doses live.
 */
export function buildEvent(
  profileId: string,
  input: NewDoseEventInput,
  now = new Date().toISOString(),
  dateOptions: CalendarDateOptions = {},
): BuildEventResult {
  const vaccineId = (input.vaccineId ?? '').trim();
  if (!vaccineId) return { error: 'missing-vaccine' };
  if (!VACCINE_ID.test(vaccineId)) return { error: 'unknown-vaccine' };

  const date = (input.date ?? '').trim().slice(0, 10);
  if (!date) return { error: 'missing-date' };
  if (!isValidISODate(date)) return { error: 'invalid-date' };
  if (date > resolveReferenceTodayISO(dateOptions)) return { error: 'future-date' };

  let doseNumber: number | null = null;
  if (input.doseNumber !== undefined && input.doseNumber !== null && input.doseNumber !== '') {
    const parsed = Number(input.doseNumber);
    if (!Number.isFinite(parsed) || parsed < 1) return { error: 'invalid-dose-number' };
    doseNumber = Math.floor(parsed);
  }

  const scheduleVersion = input.scheduleVersion?.trim() || SCHEDULE_VERSION;
  const event: VaccinationEvent = {
    id: input.id?.trim() || createEventId(),
    profileId,
    vaccineId,
    scheduleVersion,
    seriesId: seriesIdFor(vaccineId, scheduleVersion),
    doseNumber,
    scheduledDoseId: scheduledDoseIdFor(vaccineId, doseNumber),
    date,
    createdAt: input.createdAt ?? now,
    provenance: input.provenance ?? 'manual',
  };

  const centre = cleanText(input.centre, MAX_CENTRE_LENGTH);
  if (centre) event.centre = centre;
  const manufacturer = cleanText(input.manufacturer, MAX_MANUFACTURER_LENGTH);
  if (manufacturer) event.manufacturer = manufacturer;
  const batch = cleanText(input.batch, MAX_BATCH_LENGTH);
  if (batch) event.batch = batch;
  const notes = cleanText(input.notes, MAX_NOTES_LENGTH);
  if (notes) event.notes = notes;

  const review = deriveReview(event, dateOptions);
  if (review.needsReview) {
    event.needsReview = true;
    if (review.reviewReason) event.reviewReason = review.reviewReason;
  }

  return { event };
}

/** Append an event, keeping the ledger sorted and free of duplicate ids. */
export function appendEvent(
  events: readonly VaccinationEvent[],
  event: VaccinationEvent,
): VaccinationEvent[] {
  const withoutSameId = events.filter((existing) => existing.id !== event.id);
  return flagDuplicateDoseNumbers(sortEvents([...withoutSameId, event]));
}

/**
 * Fields a correction may touch. Everything else about an event — above all its
 * id, `createdAt` and `provenance` history — is immutable.
 */
export interface DoseEventPatch {
  date?: string;
  /** A numeric string is accepted because that is what a form field yields. */
  doseNumber?: number | string | null;
  centre?: string | null;
  manufacturer?: string | null;
  batch?: string | null;
  notes?: string | null;
  provenance?: DoseProvenance;
}

/**
 * Correct one event in place: the date was wrong, the dose number is now known,
 * the centre was mis-spelled.
 *
 * Only the named event changes — its id and `createdAt` are preserved and
 * `updatedAt` is stamped, so a correction is traceable and every other dose of
 * the same vaccine is bit-for-bit untouched. Derived fields (`scheduledDoseId`,
 * review flags) are recomputed from the corrected values.
 */
export function updateEvent(
  events: readonly VaccinationEvent[],
  eventId: string,
  patch: DoseEventPatch,
  now = new Date().toISOString(),
): VaccinationEvent[] {
  const next = events.map((event) => {
    if (event.id !== eventId) return event;

    const candidate: VaccinationEvent = { ...event };
    if (patch.date !== undefined) candidate.date = String(patch.date).trim().slice(0, 10);
    if (patch.doseNumber !== undefined) {
      candidate.doseNumber = patch.doseNumber === null ? null : cleanDoseNumber(patch.doseNumber);
    }
    if (patch.centre !== undefined) {
      const centre = cleanText(patch.centre, MAX_CENTRE_LENGTH);
      if (centre) candidate.centre = centre;
      else delete candidate.centre;
    }
    if (patch.manufacturer !== undefined) {
      const manufacturer = cleanText(patch.manufacturer, MAX_MANUFACTURER_LENGTH);
      if (manufacturer) candidate.manufacturer = manufacturer;
      else delete candidate.manufacturer;
    }
    if (patch.batch !== undefined) {
      const batch = cleanText(patch.batch, MAX_BATCH_LENGTH);
      if (batch) candidate.batch = batch;
      else delete candidate.batch;
    }
    if (patch.notes !== undefined) {
      const notes = cleanText(patch.notes, MAX_NOTES_LENGTH);
      if (notes) candidate.notes = notes;
      else delete candidate.notes;
    }
    if (patch.provenance !== undefined) candidate.provenance = patch.provenance;

    candidate.scheduledDoseId = scheduledDoseIdFor(candidate.vaccineId, candidate.doseNumber);
    candidate.updatedAt = now;

    const review = deriveReview(candidate);
    if (review.needsReview) {
      candidate.needsReview = true;
      candidate.reviewReason = review.reviewReason;
    } else {
      // A confirmed dose number clears the migration flag; anything this
      // function cannot rederive (a duplicate, set below) is re-applied after.
      delete candidate.needsReview;
      delete candidate.reviewReason;
    }
    return candidate;
  });

  return flagDuplicateDoseNumbers(sortEvents(next));
}

/** Remove exactly one event. Everything else in the ledger is untouched. */
export function removeEventById(
  events: readonly VaccinationEvent[],
  eventId: string,
): { events: VaccinationEvent[]; removed: VaccinationEvent | undefined } {
  const removed = events.find((event) => event.id === eventId);
  return {
    events: sortEvents(events.filter((event) => event.id !== eventId)),
    removed,
  };
}

/**
 * Remove a whole vaccine's history — a distinct, explicitly named operation.
 *
 * Named separately from single-dose deletion on purpose: in 2.x "remove a dose"
 * *was* this, which is how one wrong click erased a series.
 */
export function removeVaccineEvents(
  events: readonly VaccinationEvent[],
  vaccineId: string,
): { events: VaccinationEvent[]; removed: VaccinationEvent[] } {
  const removed = events.filter((event) => event.vaccineId === vaccineId);
  return {
    events: sortEvents(events.filter((event) => event.vaccineId !== vaccineId)),
    removed,
  };
}

/** Identity of a dose for duplicate detection: same vaccine, day and position. */
export function doseFingerprint(event: {
  vaccineId: string;
  date: string;
  doseNumber: number | null;
  centre?: string;
  manufacturer?: string;
  batch?: string;
}): string {
  return [
    event.vaccineId,
    event.date,
    event.doseNumber ?? '?',
    event.centre ?? '',
    event.manufacturer ?? '',
    event.batch ?? '',
  ].join('|');
}

export interface MergeEventsResult {
  events: VaccinationEvent[];
  /** Events present in `incoming` only. */
  added: number;
  /** Existing events enriched or replaced by `incoming`. */
  updated: number;
  /** Incoming events already represented in the ledger. */
  skipped: number;
}

/** Which of two events describing the same dose is better informed. */
function informativenessScore(event: VaccinationEvent): number {
  let score = 0;
  if (event.doseNumber !== null) score += 4;
  if (event.centre) score += 1;
  if (event.batch) score += 1;
  if (event.manufacturer) score += 1;
  if (event.notes) score += 1;
  if (event.provenance === 'verified') score += 2;
  if (!event.needsReview) score += 1;
  return score;
}

/**
 * Union two ledgers without duplicating doses.
 *
 * Matching is by id first (a migrated row has a deterministic id, so restoring
 * the same backup twice is a no-op) and then by fingerprint, so the same dose
 * recorded on two devices — once with a dose number, once without — merges into
 * one event instead of two. The better-informed version wins, and `verified`
 * provenance is never downgraded.
 */
export function mergeEvents(
  existing: readonly VaccinationEvent[],
  incoming: readonly VaccinationEvent[],
): MergeEventsResult {
  const events = new Map<string, VaccinationEvent>(
    sortEvents(existing).map((event) => [event.id, event]),
  );
  const byFingerprint = new Map<string, string>();
  for (const event of events.values()) {
    const key = doseFingerprint(event);
    if (!byFingerprint.has(key)) byFingerprint.set(key, event.id);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of sortEvents(incoming)) {
    const sameId = events.get(candidate.id);
    if (sameId) {
      const winner =
        informativenessScore(candidate) > informativenessScore(sameId) ? candidate : sameId;
      const merged = reconcile(sameId, winner, candidate);
      if (merged !== sameId) updated += 1;
      else skipped += 1;
      events.set(candidate.id, merged);
      byFingerprint.set(doseFingerprint(merged), candidate.id);
      continue;
    }

    // Same dose, different id (recorded separately on two devices).
    const looseKey = [candidate.vaccineId, candidate.date, candidate.doseNumber ?? '?'].join('|');
    const matchId = findLooseMatch(events, looseKey, candidate);
    if (matchId) {
      const sameDose = events.get(matchId) as VaccinationEvent;
      const merged = reconcile(sameDose, sameDose, candidate);
      if (merged !== sameDose) updated += 1;
      else skipped += 1;
      events.set(matchId, merged);
      continue;
    }

    const fingerprintKey = doseFingerprint(candidate);
    const fingerprintMatch = byFingerprint.get(fingerprintKey);
    if (fingerprintMatch) {
      skipped += 1;
      continue;
    }

    events.set(candidate.id, candidate);
    byFingerprint.set(fingerprintKey, candidate.id);
    added += 1;
  }

  return {
    events: flagDuplicateDoseNumbers(sortEvents([...events.values()])),
    added,
    updated,
    skipped,
  };
}

function findLooseMatch(
  events: Map<string, VaccinationEvent>,
  looseKey: string,
  candidate: VaccinationEvent,
): string | undefined {
  for (const event of events.values()) {
    if (event.id === candidate.id) continue;
    if (event.vaccineId !== candidate.vaccineId) continue;
    if (event.date !== candidate.date) continue;
    const other = `${event.vaccineId}|${event.date}|${event.doseNumber ?? '?'}`;
    if (other === looseKey) return event.id;
    // One side knows the dose number, the other does not: still the same visit.
    if (
      (event.doseNumber === null) !== (candidate.doseNumber === null) &&
      informativenessScore(candidate) > informativenessScore(event)
    ) {
      return event.id;
    }
  }
  return undefined;
}

/** Fold `incoming` into `base`, keeping the stronger of each field. */
function reconcile(
  original: VaccinationEvent,
  base: VaccinationEvent,
  incoming: VaccinationEvent,
): VaccinationEvent {
  const merged: VaccinationEvent = { ...base };
  if (merged.doseNumber === null && incoming.doseNumber !== null) {
    merged.doseNumber = incoming.doseNumber;
    merged.scheduledDoseId = scheduledDoseIdFor(merged.vaccineId, merged.doseNumber);
  }
  if (!merged.centre && incoming.centre) merged.centre = incoming.centre;
  if (!merged.batch && incoming.batch) merged.batch = incoming.batch;
  if (!merged.manufacturer && incoming.manufacturer) merged.manufacturer = incoming.manufacturer;
  if (!merged.notes && incoming.notes) merged.notes = incoming.notes;
  if (incoming.provenance === 'verified') merged.provenance = 'verified';
  if (incoming.supersedes && !merged.supersedes) merged.supersedes = incoming.supersedes;
  // Keep the earliest origin: the dose was first recorded when it was first
  // recorded, whichever device wrote it down. Comparing every candidate stamp
  // (rather than only the incoming one) matters when the better-informed copy
  // is the incoming event — its own later `createdAt` would otherwise win and
  // quietly move the dose's recorded origin.
  const origin = [original.createdAt, incoming.createdAt, merged.createdAt]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()[0];
  if (origin && origin !== merged.createdAt) merged.createdAt = origin;

  const review = deriveReview(merged);
  if (review.needsReview) {
    merged.needsReview = true;
    merged.reviewReason = review.reviewReason ?? merged.reviewReason;
  } else {
    delete merged.needsReview;
    delete merged.reviewReason;
  }

  const changed = JSON.stringify(merged) !== JSON.stringify(original);
  if (changed && !merged.updatedAt) merged.updatedAt = incoming.updatedAt ?? merged.createdAt;
  return changed ? merged : original;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

/** Every event that a human should confirm, oldest first. */
export function eventsNeedingReview(events: readonly VaccinationEvent[]): VaccinationEvent[] {
  return sortEvents(events).filter((event) => event.needsReview === true);
}

/** Events for one vaccine, oldest first. */
export function eventsForVaccine(
  events: readonly VaccinationEvent[],
  vaccineId: string,
): VaccinationEvent[] {
  return sortEvents(events).filter((event) => event.vaccineId === vaccineId);
}

/** Dose numbers of a vaccine that the milestone schedule expects. */
export function expectedDoseNumbers(vaccineId: string): number[] {
  return milestoneDoses(vaccineId).map((milestone) => milestone.doseNumber);
}

/** Vaccine ids present in the ledger. */
export function vaccineIdsInLedger(events: readonly VaccinationEvent[]): string[] {
  return [...new Set(events.map((event) => event.vaccineId))].sort();
}

// ---------------------------------------------------------------------------
// Pre-save duplicate checking & non-mutating history anomaly analysis
// ---------------------------------------------------------------------------

export interface DoseDuplicateCheck {
  hasExactSameVisitDuplicate: boolean;
  hasSameDoseNumber: boolean;
  matchingDoseEvent?: VaccinationEvent;
  sameVisitEvent?: VaccinationEvent;
}

/**
 * Inspect existing ledger events before recording or editing a dose so the UI
 * can distinguish an exact same-visit duplicate from a conflicting dose number
 * without silently erasing or mutating any existing event.
 */
export function checkDuplicateDose(
  events: readonly VaccinationEvent[],
  candidate: {
    vaccineId: string;
    date: string;
    doseNumber: number | null;
    excludeEventId?: string;
  },
): DoseDuplicateCheck {
  const sameVaccine = events.filter(
    (event) => event.vaccineId === candidate.vaccineId && event.id !== candidate.excludeEventId,
  );

  const sameVisitEvent = candidate.date
    ? sameVaccine.find(
        (event) =>
          event.date === candidate.date &&
          (candidate.doseNumber === null ||
            event.doseNumber === null ||
            event.doseNumber === candidate.doseNumber),
      )
    : undefined;

  const matchingDoseEvent =
    typeof candidate.doseNumber === 'number' && candidate.doseNumber > 0
      ? sameVaccine.find((event) => event.doseNumber === candidate.doseNumber)
      : undefined;

  return {
    hasExactSameVisitDuplicate: Boolean(sameVisitEvent),
    hasSameDoseNumber: Boolean(matchingDoseEvent),
    matchingDoseEvent,
    sameVisitEvent,
  };
}

export type DoseAnomalyType =
  | 'invalid-date'
  | 'future-date'
  | 'before-dob'
  | 'exact-same-visit-duplicate'
  | 'duplicate-dose-number'
  | 'dose-number-out-of-range'
  | 'legacy-dose-number-unknown'
  | 'dose-number-unknown'
  | 'chronological-inversion'
  | 'excess-unattributed';

export interface DoseAnomaly {
  id: string;
  type: DoseAnomalyType;
  severity: 'warning' | 'error';
  eventId: string;
  relatedEventId?: string;
  vaccineId: string;
  doseNumber: number | null;
  date: string;
  description: { en: string; bn: string };
}

/**
 * Analyse a ledger (and optional date of birth) for cross-event inconsistencies,
 * pre-birth administration dates, chronological inversions, duplicate visits,
 * out-of-range dose numbers, and uncertain records — purely without mutating
 * any ledger event or breaking referential equality on untouched rows.
 */
export function analyzeDoseHistoryAnomalies(
  events: readonly VaccinationEvent[],
  dateOfBirth?: string,
  dateOptions: CalendarDateOptions = {},
): DoseAnomaly[] {
  const anomalies: DoseAnomaly[] = [];
  const sorted = sortEvents(events);
  const validDob = dateOfBirth && isValidISODate(dateOfBirth) ? dateOfBirth : null;
  const refToday = resolveReferenceTodayISO(dateOptions);

  const seenDoseKey = new Map<string, VaccinationEvent>();
  const seenVisitKey = new Map<string, VaccinationEvent>();
  const firstEventByVaccineDose = new Map<string, Map<number, VaccinationEvent>>();

  for (const event of sorted) {
    const vaccine = allVaccines.find((v) => v.id === event.vaccineId);
    const labelEn = vaccine?.name.en ?? event.vaccineId;
    const labelBn = vaccine?.name.bn ?? event.vaccineId;
    const scheduledCount = milestoneDoseCount(event.vaccineId);

    if (!isValidISODate(event.date)) {
      anomalies.push({
        id: `${event.id}:invalid-date`,
        type: 'invalid-date',
        severity: 'error',
        eventId: event.id,
        vaccineId: event.vaccineId,
        doseNumber: event.doseNumber,
        date: event.date,
        description: {
          en: `${labelEn} carries an invalid calendar date (${event.date}).`,
          bn: `${labelBn}-এর তারিখটি (${event.date}) বৈধ ক্যালেন্ডার তারিখ নয়।`,
        },
      });
    } else {
      if (event.date > refToday) {
        anomalies.push({
          id: `${event.id}:future-date`,
          type: 'future-date',
          severity: 'warning',
          eventId: event.id,
          vaccineId: event.vaccineId,
          doseNumber: event.doseNumber,
          date: event.date,
          description: {
            en: `${labelEn} is dated in the future (${event.date}) relative to ${refToday}.`,
            bn: `${labelBn}-এর তারিখ (${event.date}) বর্তমান তারিখের (${refToday}) পরের।`,
          },
        });
      }

      if (validDob && event.date < validDob) {
        anomalies.push({
          id: `${event.id}:before-dob`,
          type: 'before-dob',
          severity: 'error',
          eventId: event.id,
          vaccineId: event.vaccineId,
          doseNumber: event.doseNumber,
          date: event.date,
          description: {
            en: `${labelEn} (${event.date}) is dated before the member's date of birth (${validDob}).`,
            bn: `${labelBn}-এর তারিখ (${event.date}) সদস্যের জন্মতারিখের (${validDob}) আগের।`,
          },
        });
      }
    }

    if (event.doseNumber === null) {
      if (scheduledCount > 0) {
        const isLegacy = event.provenance === 'legacy-migration';
        anomalies.push({
          id: `${event.id}:${isLegacy ? 'legacy-dose-number-unknown' : 'dose-number-unknown'}`,
          type: isLegacy ? 'legacy-dose-number-unknown' : 'dose-number-unknown',
          severity: 'warning',
          eventId: event.id,
          vaccineId: event.vaccineId,
          doseNumber: null,
          date: event.date,
          description: isLegacy
            ? {
                en: `${labelEn} (${event.date}) was imported without a dose number; assignment to the schedule is provisional.`,
                bn: `${labelBn} (${event.date}) ডোজ নম্বর ছাড়াই ইম্পোর্ট করা হয়েছে; সময়সূচীর সাথে মিল সাময়িক।`,
              }
            : {
                en: `${labelEn} (${event.date}) was saved without specifying which dose number it was.`,
                bn: `${labelBn} (${event.date}) কত নম্বর ডোজ তা উল্লেখ না করেই সংরক্ষণ করা হয়েছে।`,
              },
        });
      }
    } else {
      if (scheduledCount > 0 && event.doseNumber > scheduledCount) {
        anomalies.push({
          id: `${event.id}:dose-number-out-of-range`,
          type: 'dose-number-out-of-range',
          severity: 'warning',
          eventId: event.id,
          vaccineId: event.vaccineId,
          doseNumber: event.doseNumber,
          date: event.date,
          description: {
            en: `${labelEn} is marked as dose ${event.doseNumber}, beyond the ${scheduledCount} scheduled national milestones.`,
            bn: `${labelBn}-এ ডোজ ${event.doseNumber} লেখা হয়েছে, যা নির্ধারিত ${scheduledCount}টি জাতীয় ধাপের বেশি।`,
          },
        });
      }

      const doseKey = `${event.seriesId}#${event.doseNumber}`;
      const existingDose = seenDoseKey.get(doseKey);
      if (existingDose && existingDose.id !== event.id) {
        anomalies.push({
          id: `${event.id}:duplicate-dose-number`,
          type: 'duplicate-dose-number',
          severity: 'warning',
          eventId: event.id,
          relatedEventId: existingDose.id,
          vaccineId: event.vaccineId,
          doseNumber: event.doseNumber,
          date: event.date,
          description: {
            en: `${labelEn} dose ${event.doseNumber} is recorded on ${event.date} and earlier on ${existingDose.date}.`,
            bn: `${labelBn}-এর ডোজ ${event.doseNumber} ${event.date} এবং এর আগে ${existingDose.date} তারিখেও লেখা আছে।`,
          },
        });
      } else {
        seenDoseKey.set(doseKey, event);
      }

      const doseMap = firstEventByVaccineDose.get(event.vaccineId) ?? new Map<number, VaccinationEvent>();
      if (!doseMap.has(event.doseNumber)) {
        doseMap.set(event.doseNumber, event);
        firstEventByVaccineDose.set(event.vaccineId, doseMap);
      }
    }

    const visitKey = `${event.vaccineId}|${event.date}|${event.doseNumber ?? '?'}`;
    const existingVisit = seenVisitKey.get(visitKey);
    if (existingVisit && existingVisit.id !== event.id) {
      anomalies.push({
        id: `${event.id}:exact-same-visit-duplicate`,
        type: 'exact-same-visit-duplicate',
        severity: 'warning',
        eventId: event.id,
        relatedEventId: existingVisit.id,
        vaccineId: event.vaccineId,
        doseNumber: event.doseNumber,
        date: event.date,
        description: {
          en: `${labelEn} has duplicate entries for the same visit date (${event.date}).`,
          bn: `${labelBn}-এর একই তারিখে (${event.date}) একাধিক অভিন্ন এন্ট্রি রয়েছে।`,
        },
      });
    } else {
      seenVisitKey.set(visitKey, event);
    }
  }

  // Chronological inversion check: Dose B > Dose A dated strictly before Dose A
  for (const [vaccineId, doseMap] of firstEventByVaccineDose.entries()) {
    const vaccine = allVaccines.find((v) => v.id === vaccineId);
    const labelEn = vaccine?.name.en ?? vaccineId;
    const labelBn = vaccine?.name.bn ?? vaccineId;
    const numbers = [...doseMap.keys()].sort((a, b) => a - b);
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const earlierDose = doseMap.get(numbers[i])!;
        const laterDose = doseMap.get(numbers[j])!;
        if (
          isValidISODate(earlierDose.date) &&
          isValidISODate(laterDose.date) &&
          laterDose.date < earlierDose.date
        ) {
          anomalies.push({
            id: `${laterDose.id}:chronological-inversion:${earlierDose.id}`,
            type: 'chronological-inversion',
            severity: 'warning',
            eventId: laterDose.id,
            relatedEventId: earlierDose.id,
            vaccineId,
            doseNumber: laterDose.doseNumber,
            date: laterDose.date,
            description: {
              en: `${labelEn} dose ${laterDose.doseNumber} (${laterDose.date}) is dated before dose ${earlierDose.doseNumber} (${earlierDose.date}).`,
              bn: `${labelBn}-এর ডোজ ${laterDose.doseNumber} (${laterDose.date}) ডোজ ${earlierDose.doseNumber} (${earlierDose.date})-এর আগের তারিখে লেখা হয়েছে।`,
            },
          });
        }
      }
    }
  }

  // Excess unattributed events beyond milestone slots
  const evaluated = seriesState(sorted);
  for (const [vaccineId, state] of Object.entries(evaluated)) {
    if (state.scheduledDoseCount > 0 && state.unattributedCount > 0) {
      const vaccine = allVaccines.find((v) => v.id === vaccineId);
      const labelEn = vaccine?.name.en ?? vaccineId;
      const labelBn = vaccine?.name.bn ?? vaccineId;
      const unattributedEvents = sorted.filter(
        (event) =>
          event.vaccineId === vaccineId &&
          event.doseNumber === null &&
          !state.administered.some(
            (adm) => adm.eventId === event.id && adm.doseNumber !== null,
          ),
      );
      for (const event of unattributedEvents) {
        anomalies.push({
          id: `${event.id}:excess-unattributed`,
          type: 'excess-unattributed',
          severity: 'warning',
          eventId: event.id,
          vaccineId,
          doseNumber: null,
          date: event.date,
          description: {
            en: `${labelEn} (${event.date}) could not be matched to an open scheduled milestone slot (${state.scheduledDoseCount} total scheduled).`,
            bn: `${labelBn} (${event.date}) নির্ধারিত ${state.scheduledDoseCount}টি ধাপের কোনো খালি স্লটের সাথে মেলানো যায়নি।`,
          },
        });
      }
    }
  }

  return anomalies;
}


/** How many vaccine products this app knows about (for "unscheduled" framing). */
export function knownVaccineIds(): string[] {
  return allVaccines.map((vaccine) => vaccine.id);
}
