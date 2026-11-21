/**
 * Profile store: normalisation, validation, the dose ledger and the JSON
 * import/export format.
 *
 * This module is pure (no React, no storage I/O) so it can be unit tested and
 * reused by both the local-first context and the Supabase sync layer.
 *
 * Since 3.0 the vaccination record is a **ledger of events** (one per
 * administered dose) rather than one slot per vaccine; `lib/doseLedger` owns the
 * event shape and every rule about attributing an event to a scheduled dose.
 * This module is the write path: it normalises untrusted payloads, migrates 2.x
 * data on read, and applies additions, corrections and deletions immutably.
 */

import {
  appendEvent,
  buildEvent,
  ensureLedger,
  eventsNeedingReview,
  legacyProjection,
  mergeEvents,
  migrateLegacyRecords,
  normaliseEvent,
  removeEventById,
  removeVaccineEvents,
  seriesState,
  sortEvents,
  updateEvent,
  type DoseEventPatch,
  type DoseHistory,
  type DoseInputError,
  type NewDoseEventInput,
} from './doseLedger';
import {
  isValidISODate,
  resolveReferenceTodayISO,
  type CalendarDateOptions,
} from './format';
import { createProfileId } from './id';
import {
  buildGrowthMeasurement,
  mergeGrowthMeasurements,
  normaliseGrowthMeasurement,
  sortGrowthMeasurements,
  type GrowthInputError,
  type NewGrowthInput,
} from './whoGrowth';
import {
  EXPORT_APP_ID,
  EXPORT_VERSION,
  PROFILE_RELATIONSHIPS,
  type DoseRecord,
  type GrowthMeasurement,
  type Profile,
  type ProfileRelationship,
  type TikaTrackExport,
  type VaccinationEvent,
} from '../types';

const VACCINE_ID = /^[a-z0-9_-]{1,64}$/i;

/** Coerce anything found in storage into a valid `DoseRecord`, or `null`. */
export function normaliseDoseRecord(value: unknown): DoseRecord | null {
  // v1 exports stored the date as a bare string: `{ "bcg": "2024-01-05" }`.
  // Honour it instead of dropping the dose on import.
  if (typeof value === 'string') {
    const date = value.slice(0, 10);
    return isValidISODate(date) ? { date } : null;
  }

  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;

  // v2 exports store an object: `{ "bcg": { "date": "2024-01-05" } }`.
  if (typeof candidate.date === 'string') {
    const date = candidate.date.slice(0, 10);
    if (!isValidISODate(date)) return null;
    const record: DoseRecord = { date };
    if (typeof candidate.notes === 'string' && candidate.notes.trim()) {
      record.notes = candidate.notes.trim().slice(0, 500);
    }
    if (typeof candidate.doseNumber === 'number' && candidate.doseNumber > 0) {
      record.doseNumber = Math.floor(candidate.doseNumber);
    }
    if (typeof candidate.centre === 'string' && candidate.centre.trim()) {
      record.centre = candidate.centre.trim().slice(0, 200);
    }
    if (typeof candidate.recordedAt === 'string') {
      record.recordedAt = candidate.recordedAt;
    }
    return record;
  }
  return null;
}

function normaliseRelationship(value: unknown): ProfileRelationship | undefined {
  return typeof value === 'string' && (PROFILE_RELATIONSHIPS as readonly string[]).includes(value)
    ? (value as ProfileRelationship)
    : undefined;
}

/**
 * Coerce an unknown value (localStorage, a file, an API response) into a valid
 * `Profile`, or `null` when it is beyond repair.
 *
 * Any 2.x payload is migrated to the ledger here, on read, exactly once:
 * `ensureLedger` is idempotent, so re-hydrating the same data never re-creates
 * events the family has since deleted.
 */
export function normaliseProfile(value: unknown, now?: string): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;

  const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 120) : '';
  const dateOfBirth =
    typeof candidate.dateOfBirth === 'string' ? candidate.dateOfBirth.slice(0, 10) : '';
  if (!name || !isValidISODate(dateOfBirth)) return null;

  const records: Record<string, DoseRecord> = {};
  if (candidate.records && typeof candidate.records === 'object') {
    for (const [vaccineId, raw] of Object.entries(candidate.records as Record<string, unknown>)) {
      const record = normaliseDoseRecord(raw);
      if (record && VACCINE_ID.test(vaccineId)) {
        records[vaccineId] = record;
      }
    }
  }

  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : createProfileId();

  const profile: Profile = { id, name, dateOfBirth, records };

  // v3 payloads carry the ledger itself. Anything unparseable inside it is
  // dropped, but a payload with *no* usable events falls through to migration
  // from `records` so an old backup cannot end up with an empty history.
  if (Array.isArray(candidate.events)) {
    const events = candidate.events
      .map((raw) => normaliseEvent(raw, id, { fallbackProvenance: 'import', now }))
      .filter((event): event is VaccinationEvent => event !== null);
    profile.events = sortEvents(events);
  }

  if (Array.isArray(candidate.growth)) {
    const growth = sortGrowthMeasurements(
      candidate.growth
        .map((raw) => normaliseGrowthMeasurement(raw, now))
        .filter((entry): entry is GrowthMeasurement => entry !== null),
    );
    if (growth.length > 0) profile.growth = growth;
  }

  const relationship = normaliseRelationship(candidate.relationship);
  if (relationship) profile.relationship = relationship;
  if (
    candidate.gender === 'female' ||
    candidate.gender === 'male' ||
    candidate.gender === 'other'
  ) {
    profile.gender = candidate.gender;
  }
  if (typeof candidate.createdAt === 'string') profile.createdAt = candidate.createdAt;
  if (typeof candidate.updatedAt === 'string') profile.updatedAt = candidate.updatedAt;
  if (typeof candidate.ledgerMigratedAt === 'string') {
    profile.ledgerMigratedAt = candidate.ledgerMigratedAt;
  }

  return withLedger(profile, now);
}

/**
 * Attach (or refresh) a profile's ledger and its derived 2.x projection.
 *
 * When the ledger had to be **created** from `records`, the incoming `records`
 * object is kept byte-for-byte: the migration is additive, so a 2.x payload read
 * by 3.x is unchanged apart from gaining `events`. When the ledger already
 * existed, `records` is rebuilt from it, because then the ledger is the source
 * of truth and the projection must not be able to disagree.
 */
export function withLedger(profile: Profile, now = new Date().toISOString()): Profile {
  const hadLedger = Array.isArray(profile.events) && profile.events.length > 0;
  const migrated = ensureLedger(profile, now);
  if (!hadLedger && Object.keys(profile.records ?? {}).length > 0) {
    return { ...migrated, records: profile.records };
  }
  return migrated;
}

/** Normalise a whole array, dropping entries that cannot be repaired. */
export function normaliseProfiles(value: unknown, now?: string): Profile[] {
  if (!Array.isArray(value)) return [];
  const profiles: Profile[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const profile = normaliseProfile(raw, now);
    if (!profile) continue;
    if (seen.has(profile.id)) {
      // Merge duplicate ids instead of silently dropping recorded doses: the
      // same member can arrive twice (two tabs, a backup restored over itself),
      // and each copy may hold doses the other does not.
      const index = profiles.findIndex((candidate) => candidate.id === profile.id);
      if (index >= 0) profiles[index] = mergeProfilePair(profiles[index], profile);
      continue;
    }
    seen.add(profile.id);
    profiles.push(profile);
  }
  return profiles;
}

/** Union two versions of the same profile, keeping every dose from both. */
export function mergeProfilePair(existing: Profile, incoming: Profile, now?: string): Profile {
  const merged = mergeEvents(existing.events ?? [], incoming.events ?? []);
  // Identity fields follow the most recently edited copy — but never at the cost
  // of a dose: the ledger is unioned, and the 2.x projection is rebuilt from the
  // union so it can never claim a dose the ledger does not hold.
  const incomingIsNewer = Boolean(
    incoming.updatedAt && (!existing.updatedAt || incoming.updatedAt > existing.updatedAt),
  );
  const base = incomingIsNewer ? incoming : existing;

  const mergedGrowth = mergeGrowthMeasurements(existing.growth ?? [], incoming.growth ?? []);

  const profile: Profile = {
    ...base,
    id: existing.id,
    events: merged.events,
    records: legacyProjection(merged.events),
    ...(mergedGrowth.length > 0 ? { growth: mergedGrowth } : {}),
    relationship: existing.relationship ?? incoming.relationship,
    gender: existing.gender ?? incoming.gender,
    createdAt: existing.createdAt ?? incoming.createdAt,
    ledgerMigratedAt: existing.ledgerMigratedAt ?? incoming.ledgerMigratedAt,
    updatedAt: [existing.updatedAt, incoming.updatedAt]
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .pop(),
  };
  return withLedger(profile, now);
}

export interface NewProfileInput {
  name: string;
  dateOfBirth: string;
  relationship?: ProfileRelationship;
  gender?: Profile['gender'];
}

export interface CreateProfileResult {
  profile?: Profile;
  error?: 'empty-name' | 'missing-dob' | 'invalid-dob' | 'future-dob' | 'name-too-long';
}

/** Validate + build a brand new profile. */
export function createProfile(
  input: NewProfileInput,
  dateOptions: CalendarDateOptions = {},
): CreateProfileResult {
  const name = input.name.trim();
  if (!name) return { error: 'empty-name' };
  if (name.length > 120) return { error: 'name-too-long' };
  if (!input.dateOfBirth) return { error: 'missing-dob' };
  if (!isValidISODate(input.dateOfBirth)) return { error: 'invalid-dob' };
  // Allow "today" (in local or configured timezone) but nothing in the future.
  if (input.dateOfBirth > resolveReferenceTodayISO(dateOptions)) return { error: 'future-dob' };

  const now = new Date().toISOString();
  const profile: Profile = {
    id: createProfileId(),
    name,
    dateOfBirth: input.dateOfBirth,
    events: [],
    records: {},
    createdAt: now,
    updatedAt: now,
  };
  if (input.relationship) profile.relationship = input.relationship;
  if (input.gender) profile.gender = input.gender;
  return { profile };
}

// ---------------------------------------------------------------------------
// Writing doses
// ---------------------------------------------------------------------------

/** Apply a ledger transformation to one profile, immutably. */
function transformProfile(
  profiles: readonly Profile[],
  profileId: string,
  transform: (events: VaccinationEvent[]) => VaccinationEvent[],
  now = new Date().toISOString(),
): Profile[] {
  return profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const events = transform(sortEvents(profile.events ?? []));
    return {
      ...profile,
      events,
      records: legacyProjection(events),
      updatedAt: now,
    };
  });
}

export type RecordDoseResult = {
  profiles: Profile[];
  event?: VaccinationEvent;
  error?: DoseInputError;
};

/**
 * Record one administered dose.
 *
 * Compatible with the 2.x signature — `(profiles, profileId, vaccineId, dose)` —
 * but it now **appends** to the ledger instead of overwriting the vaccine's
 * single slot. Recording OPV-2 after OPV-1 keeps both.
 */
export function recordDose(
  profiles: Profile[],
  profileId: string,
  vaccineId: string,
  dose: DoseRecord,
  now = new Date().toISOString(),
): Profile[] {
  const result = recordDoseEvent(
    profiles,
    profileId,
    {
      vaccineId,
      date: dose.date,
      doseNumber: dose.doseNumber ?? null,
      centre: dose.centre,
      notes: dose.notes,
      provenance: 'manual',
      createdAt: dose.recordedAt,
    },
    now,
  );
  return result.profiles;
}

/**
 * Record one administered dose with the full event shape (centre, manufacturer,
 * batch, dose number, provenance).
 *
 * Returns the rejected `error` code instead of writing anything, so the UI can
 * explain why a dose was not saved rather than silently dropping it.
 */
export function recordDoseEvent(
  profiles: Profile[],
  profileId: string,
  input: NewDoseEventInput,
  now = new Date().toISOString(),
  dateOptions: CalendarDateOptions = {},
): RecordDoseResult {
  const built = buildEvent(profileId, input, now, dateOptions);
  if (!built.event) return { profiles, error: built.error };
  const event = built.event;
  return {
    profiles: transformProfile(profiles, profileId, (events) => appendEvent(events, event), now),
    event,
  };
}

/**
 * Correct one recorded dose — a wrong date, a dose number that is now known, a
 * mis-spelled centre.
 *
 * Only the named event changes: its id and `createdAt` survive, `updatedAt` is
 * stamped, and every other dose of the same vaccine is untouched.
 */
export function updateDoseEvent(
  profiles: Profile[],
  profileId: string,
  eventId: string,
  patch: DoseEventPatch,
  now = new Date().toISOString(),
): Profile[] {
  return transformProfile(
    profiles,
    profileId,
    (events) => updateEvent(events, eventId, patch, now),
    now,
  );
}

/** Delete exactly one dose. The rest of the vaccine's history stays. */
export function removeDoseEvent(
  profiles: Profile[],
  profileId: string,
  eventId: string,
  now = new Date().toISOString(),
): Profile[] {
  return transformProfile(
    profiles,
    profileId,
    (events) => removeEventById(events, eventId).events,
    now,
  );
}

/**
 * Delete one dose of one vaccine.
 *
 * The 2.x version of this function took only a vaccine id and deleted the
 * vaccine's entire history — which is how "remove this dose" erased a series.
 * `eventId` is now required; use {@link removeVaccineHistory} for the
 * whole-vaccine operation, which the UI labels differently and confirms
 * separately.
 */
export function removeDose(
  profiles: Profile[],
  profileId: string,
  vaccineId: string,
  eventId: string,
  now = new Date().toISOString(),
): Profile[] {
  return transformProfile(
    profiles,
    profileId,
    (events) => {
      const target = events.find((event) => event.id === eventId);
      // Scoped by vaccine *and* event id: "delete OPV dose 2" must never remove
      // a Pentavalent event, and a stale id must remove nothing at all.
      if (!target || target.vaccineId !== vaccineId) return events;
      return removeEventById(events, eventId).events;
    },
    now,
  );
}

/**
 * Delete every dose of one vaccine — an explicitly separate, more destructive
 * action than deleting a single dose.
 */
export function removeVaccineHistory(
  profiles: Profile[],
  profileId: string,
  vaccineId: string,
  now = new Date().toISOString(),
): Profile[] {
  return transformProfile(
    profiles,
    profileId,
    (events) => removeVaccineEvents(events, vaccineId).events,
    now,
  );
}

/** Confirm which dose a migrated (or otherwise ambiguous) record was. */
export function resolveDoseReview(
  profiles: Profile[],
  profileId: string,
  eventId: string,
  doseNumber: number | null,
  now = new Date().toISOString(),
): Profile[] {
  return updateDoseEvent(profiles, profileId, eventId, { doseNumber }, now);
}

export type AddGrowthResult = {
  profiles: Profile[];
  measurement?: GrowthMeasurement;
  error?: GrowthInputError;
};

/** Append one validated height/weight measurement to a member's growth log. */
export function addGrowthMeasurement(
  profiles: Profile[],
  profileId: string,
  input: NewGrowthInput,
  now = new Date().toISOString(),
): AddGrowthResult {
  const target = profiles.find((profile) => profile.id === profileId);
  if (!target) return { profiles, error: 'missing-date' };

  const built = buildGrowthMeasurement(target.dateOfBirth, input, now);
  if (!built.measurement) return { profiles, error: built.error };

  const entry = built.measurement;
  const next = profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const growth = sortGrowthMeasurements([...(profile.growth ?? []), entry]);
    return { ...profile, growth, updatedAt: now };
  });
  return { profiles: next, measurement: entry };
}

/** Update an existing height/weight measurement by id. */
export function updateGrowthMeasurement(
  profiles: Profile[],
  profileId: string,
  measurementId: string,
  input: NewGrowthInput,
  now = new Date().toISOString(),
): AddGrowthResult {
  const target = profiles.find((profile) => profile.id === profileId);
  if (!target) return { profiles, error: 'missing-date' };

  const existing = (target.growth ?? []).find((item) => item.id === measurementId);
  if (!existing) return { profiles, error: 'missing-date' };

  const built = buildGrowthMeasurement(
    target.dateOfBirth,
    {
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
    },
    now,
  );
  if (!built.measurement) return { profiles, error: built.error };

  const entry = built.measurement;
  const next = profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const growth = sortGrowthMeasurements(
      (profile.growth ?? []).map((item) => (item.id === measurementId ? entry : item)),
    );
    return { ...profile, growth, updatedAt: now };
  });
  return { profiles: next, measurement: entry };
}

/** Delete one growth measurement by id. */
export function removeGrowthMeasurement(
  profiles: Profile[],
  profileId: string,
  measurementId: string,
  now = new Date().toISOString(),
): Profile[] {
  return profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const growth = (profile.growth ?? []).filter((item) => item.id !== measurementId);
    return { ...profile, growth, updatedAt: now };
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Per-vaccine dose state for one profile, ready for the scheduler. */
export function doseHistory(profile: Profile | undefined | null): DoseHistory {
  if (!profile) return {};
  return seriesState(profile.events ?? []);
}

/** Every dose of every member, newest first — the "complete history" view. */
export function allDoseEvents(profiles: readonly Profile[]): VaccinationEvent[] {
  return profiles
    .flatMap((profile) => profile.events ?? [])
    .sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
}

/** How many doses a profile has recorded. */
export function doseCount(profile: Profile | undefined | null): number {
  return profile?.events?.length ?? 0;
}

/** Doses across all members that a human should confirm. */
export function reviewQueue(
  profiles: readonly Profile[],
): Array<{ profile: Profile; events: VaccinationEvent[] }> {
  return profiles
    .map((profile) => ({ profile, events: eventsNeedingReview(profile.events ?? []) }))
    .filter((entry) => entry.events.length > 0);
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

/**
 * Build the download payload for the current profiles.
 *
 * Version 3 carries the ledger. The derived 2.x `records` map is included too,
 * so an older TikaTrack build opening this backup still shows the most recent
 * dose per vaccine instead of nothing at all.
 */
export function buildExport(profiles: Profile[], now = new Date().toISOString()): TikaTrackExport {
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: now,
    profiles: profiles.map((profile) => {
      const ledgered = withLedger(profile, now);
      return { ...ledgered, events: ledgered.events ?? [] };
    }),
  };
}

export type ImportResult =
  | {
      ok: true;
      profiles: Profile[];
      added: number;
      merged: number;
      /** Doses that arrived from the file and were not already on this device. */
      dosesAdded: number;
      /** Existing doses enriched by the file (a dose number, a centre, a batch). */
      dosesUpdated: number;
      /** Doses in the file that this device already had. */
      dosesSkipped: number;
      /** Doses now flagged for review, across every profile. */
      needsReview: number;
    }
  | {
      ok: false;
      reason: 'unparseable' | 'unsupported-app' | 'unsupported-version' | 'no-profiles';
    };

/**
 * Merge an imported payload into the current profiles.
 *
 * Accepts the v3 envelope, the v2 envelope and a bare `Profile[]` (what v1
 * exported). Merging is a **union of dose events**, never a per-vaccine
 * overwrite: importing a backup onto a device that has since recorded more doses
 * keeps both sets. Duplicate detection is by event id first and by
 * vaccine+date+dose fingerprint second, so restoring the same file twice cannot
 * double-count a dose.
 */
export function mergeImport(
  current: Profile[],
  raw: string,
  now = new Date().toISOString(),
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'unparseable' };
  }

  const envelope = parsed as Partial<TikaTrackExport> & { version?: number };
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'app' in envelope) {
    if (envelope.app !== EXPORT_APP_ID) return { ok: false, reason: 'unsupported-app' };
    if (typeof envelope.version === 'number' && envelope.version > EXPORT_VERSION) {
      // A backup from a newer build may carry fields this one cannot represent;
      // refusing it is safer than importing half a record.
      return { ok: false, reason: 'unsupported-version' };
    }
  }

  const incoming = normaliseProfiles(Array.isArray(parsed) ? parsed : envelope.profiles, now);
  if (incoming.length === 0) return { ok: false, reason: 'no-profiles' };

  // Normalise the local profiles first. A caller can hand in objects that never
  // went through `normaliseProfile` (a test fixture, a Supabase row), and those
  // have no `events` yet — merging against an empty ledger would silently delete
  // every dose already recorded on this device.
  const byId = new Map(current.map((profile) => [profile.id, withLedger(profile, now)] as const));
  let added = 0;
  let merged = 0;
  let dosesAdded = 0;
  let dosesUpdated = 0;
  let dosesSkipped = 0;

  for (const profile of incoming) {
    const existing = byId.get(profile.id);
    if (!existing) {
      byId.set(profile.id, profile);
      added += 1;
      dosesAdded += profile.events?.length ?? 0;
      continue;
    }

    const doseMerge = mergeEvents(existing.events ?? [], profile.events ?? []);
    dosesAdded += doseMerge.added;
    dosesUpdated += doseMerge.updated;
    dosesSkipped += doseMerge.skipped;

    const mergedGrowth = mergeGrowthMeasurements(existing.growth ?? [], profile.growth ?? []);

    byId.set(
      profile.id,
      withLedger(
        {
          ...existing,
          ...profile,
          id: existing.id,
          events: doseMerge.events,
          records: legacyProjection(doseMerge.events),
          ...(mergedGrowth.length > 0 ? { growth: mergedGrowth } : {}),
          createdAt: existing.createdAt ?? profile.createdAt,
          ledgerMigratedAt: existing.ledgerMigratedAt ?? profile.ledgerMigratedAt,
          updatedAt: now,
        },
        now,
      ),
    );
    merged += 1;
  }

  const profiles = [...byId.values()];
  return {
    ok: true,
    profiles,
    added,
    merged,
    dosesAdded,
    dosesUpdated,
    dosesSkipped,
    needsReview: profiles.reduce(
      (total, profile) => total + eventsNeedingReview(profile.events ?? []).length,
      0,
    ),
  };
}

/**
 * Migrate a 2.x `records` map into ledger events without touching a profile.
 *
 * Exported for the sync layer and for tests that need to migrate in isolation.
 */
export { migrateLegacyRecords };
