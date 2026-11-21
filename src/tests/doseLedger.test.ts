import { describe, expect, it } from 'vitest';

import { evidenceForLegacy } from '../data/evidence';
import { schedule } from '../data/vaccines';
import {
  administeredForDose,
  appendEvent,
  buildEvent,
  buildScheduledDoseId,
  compareEvents,
  createEventId,
  dedupeById,
  deriveReview,
  doseFingerprint,
  doseNumberForMilestone,
  emptySeriesState,
  ensureLedger,
  eventsForVaccine,
  eventsNeedingReview,
  expectedDoseNumbers,
  flagDuplicateDoseNumbers,
  isDoseSatisfied,
  knownVaccineIds,
  LEDGER_VERSION,
  legacyEventId,
  legacyProjection,
  mergeEvents,
  migrateLegacyRecords,
  milestoneDoseCount,
  milestoneDoses,
  milestoneForDose,
  MILESTONE_DOSES,
  normaliseEvent,
  removeEventById,
  removeVaccineEvents,
  SCHEDULE_VERSION,
  scheduledDoseIdFor,
  seriesIdFor,
  seriesState,
  sortEvents,
  toDoseHistory,
  updateEvent,
  vaccineIdsInLedger,
} from '../lib/doseLedger';
import type { Profile, VaccinationEvent } from '../types';

/** Build a valid event literal, bypassing the validating constructor. */
function event(overrides: Partial<VaccinationEvent> = {}): VaccinationEvent {
  const vaccineId = overrides.vaccineId ?? 'opv';
  return {
    id: 'dose-1',
    profileId: 'p-1',
    vaccineId,
    scheduleVersion: SCHEDULE_VERSION,
    seriesId: seriesIdFor(vaccineId),
    doseNumber: null,
    scheduledDoseId: null,
    date: '2024-03-05',
    createdAt: '2024-03-05T09:00:00.000Z',
    provenance: 'manual',
    ...overrides,
  };
}

/** A profile in the 2.x shape: one slot per vaccine and no ledger. */
function legacyProfile(records: Record<string, unknown>): Profile {
  return {
    id: 'p-1',
    name: 'Asha',
    dateOfBirth: '2024-01-01',
    records: records as Profile['records'],
  };
}

/** An event produced by the migration, i.e. the real shape of 2.x data. */
function migratedEvent(vaccineId: string, date: string, extra: Partial<VaccinationEvent> = {}) {
  return event({
    id: legacyEventId('p-1', vaccineId),
    vaccineId,
    date,
    doseNumber: null,
    provenance: 'legacy-migration',
    needsReview: true,
    reviewReason: 'legacy-dose-number-unknown',
    ...extra,
  });
}

describe('doseLedger: the milestone table', () => {
  it('numbers every milestone dose by age order, per vaccine', () => {
    expect(MILESTONE_DOSES).toHaveLength(
      schedule.reduce((total, milestone) => total + milestone.vaccines.length, 0),
    );

    // bcg 1 · opv 1-4 (the birth dose is "OPV-0" and is dose 1 of 4) ·
    // pentavalent 1-3 · pcv 1-3 · fipv 1-2 · mr 1-2 · tcv 1 → 16 rows.
    expect(MILESTONE_DOSES.map((row) => row.scheduledDoseId)).toEqual([
      'bcg#1@0d',
      'opv#1@0d',
      'pentavalent#1@42d',
      'opv#2@42d',
      'pcv#1@42d',
      'fipv#1@42d',
      'pentavalent#2@70d',
      'opv#3@70d',
      'pcv#2@70d',
      'pentavalent#3@98d',
      'opv#4@98d',
      'pcv#3@98d',
      'fipv#2@98d',
      'mr#1@270d',
      'mr#2@450d',
      'tcv#1@450d',
    ]);
  });

  it('agrees with the dose numbers the evidence layer publishes', () => {
    // The evidence records (Part 2) transcribed the same milestones and numbered
    // them independently. If the two ever disagreed, a dose recorded against one
    // numbering would be reported against the other.
    const ageLabel = new Map(schedule.map((milestone) => [milestone.ageDays, milestone.age.en]));

    for (const row of MILESTONE_DOSES) {
      const record = evidenceForLegacy(row.vaccineId)?.record;
      expect(record, `no evidence record for ${row.vaccineId}`).toBeDefined();
      const dose = record?.doses.find((entry) => entry.doseNumber === row.doseNumber);
      expect(dose, `no dose ${row.doseNumber} for ${row.vaccineId}`).toBeDefined();
      expect(dose?.legacyMilestoneKey).toBe(ageLabel.get(row.ageDays));
    }
  });

  it('exposes lookups by vaccine, age and dose number', () => {
    expect(milestoneDoseCount('opv')).toBe(4);
    expect(milestoneDoseCount('bcg')).toBe(1);
    expect(milestoneDoseCount('fipv')).toBe(2);
    expect(milestoneDoseCount('rotavirus')).toBe(0); // not in routine EPI schedule
    expect(doseNumberForMilestone('opv', 70)).toBe(3);
    expect(doseNumberForMilestone('opv', 999)).toBeNull();
    expect(milestoneForDose('pentavalent', 3)?.ageDays).toBe(98);
    expect(milestoneForDose('pentavalent', 9)).toBeUndefined();
    expect(expectedDoseNumbers('mr')).toEqual([1, 2]);
    expect(milestoneDoses('nothing-here')).toEqual([]);
    expect(buildScheduledDoseId('mr', 2, 450)).toBe('mr#2@450d');
    expect(scheduledDoseIdFor('mr', 2)).toBe('mr#2@450d');
    expect(scheduledDoseIdFor('mr', null)).toBeNull();
    expect(scheduledDoseIdFor('mr', 7)).toBeNull();
    expect(seriesIdFor('opv')).toBe(`opv@${SCHEDULE_VERSION}`);
    expect(seriesIdFor('opv', 'custom')).toBe('opv@custom');
    expect(knownVaccineIds()).toContain('pentavalent');
    expect(LEDGER_VERSION).toBe(3);
  });

  it('gives every event id a unique value', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createEventId()));
    expect(ids.size).toBe(50);
  });
});

describe('doseLedger: migration from the 2.x single-slot shape', () => {
  it('carries every field of a v2 record across', () => {
    const { events, findings } = migrateLegacyRecords('p-1', {
      pentavalent: {
        date: '2024-03-05',
        notes: 'Given with OPV',
        centre: 'Mohakhali EPI centre',
        doseNumber: 2,
        recordedAt: '2024-03-05T10:00:00.000Z',
      },
    });

    expect(events).toHaveLength(1);
    const migrated = events[0];
    expect(migrated.date).toBe('2024-03-05');
    expect(migrated.notes).toBe('Given with OPV');
    expect(migrated.centre).toBe('Mohakhali EPI centre');
    expect(migrated.doseNumber).toBe(2);
    expect(migrated.scheduledDoseId).toBe('pentavalent#2@70d');
    // The 2.x creation stamp survives as the event's origin.
    expect(migrated.createdAt).toBe('2024-03-05T10:00:00.000Z');
    expect(migrated.provenance).toBe('legacy-migration');
    // A record that already said which dose it was needs no review.
    expect(migrated.needsReview).toBeUndefined();
    expect(findings).toEqual([]);
  });

  it('accepts the v1 shape, where the dose was a bare date string', () => {
    const { events } = migrateLegacyRecords('p-1', { bcg: '2024-01-05' });
    expect(events).toHaveLength(1);
    expect(events[0].date).toBe('2024-01-05');
    expect(events[0].vaccineId).toBe('bcg');
  });

  it('never invents a dose number and flags the gap for review', () => {
    const { events, findings } = migrateLegacyRecords('p-1', {
      opv: { date: '2024-03-05' },
      pentavalent: { date: '2024-04-05' },
    });

    expect(events.map((entry) => entry.doseNumber)).toEqual([null, null]);
    expect(events.every((entry) => entry.needsReview)).toBe(true);
    expect(events.every((entry) => entry.reviewReason === 'legacy-dose-number-unknown')).toBe(true);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({ vaccineId: 'opv', reason: 'legacy-dose-number-unknown' });
  });

  it('flags a dose number outside the schedule instead of trusting it', () => {
    const { events } = migrateLegacyRecords('p-1', {
      pentavalent: { date: '2024-03-05', doseNumber: 9 },
    });
    expect(events[0].doseNumber).toBe(9);
    expect(events[0].needsReview).toBe(true);
    expect(events[0].reviewReason).toBe('dose-number-out-of-range');
    expect(events[0].scheduledDoseId).toBeNull();
  });

  it('gives migrated events a deterministic id, so re-importing cannot duplicate them', () => {
    expect(legacyEventId('p-1', 'bcg')).toBe('dose-legacy-p-1-bcg');
    const first = migrateLegacyRecords('p-1', { bcg: { date: '2024-01-05' } }).events;
    const second = migrateLegacyRecords('p-1', { bcg: { date: '2024-01-05' } }).events;
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].id).toBe(legacyEventId('p-1', 'bcg'));
  });

  it('drops rows that are not doses and returns nothing for an empty map', () => {
    expect(migrateLegacyRecords('p-1', {}).events).toEqual([]);
    expect(migrateLegacyRecords('p-1', undefined).events).toEqual([]);
    expect(migrateLegacyRecords('p-1', null).events).toEqual([]);

    const { events } = migrateLegacyRecords('p-1', {
      bcg: { date: '2024-01-05' },
      'bad id!!': { date: '2024-01-05' },
      opv: { date: 'not a date' },
      pcv: null,
    });
    expect(events.map((entry) => entry.vaccineId)).toEqual(['bcg']);
  });

  it('sorts migrated events oldest first', () => {
    const { events } = migrateLegacyRecords('p-1', {
      mr: { date: '2025-04-05' },
      bcg: { date: '2024-01-05' },
      opv: { date: '2024-06-05' },
    });
    expect(events.map((entry) => entry.vaccineId)).toEqual(['bcg', 'opv', 'mr']);
  });
});

describe('doseLedger: ensureLedger', () => {
  it('adds a ledger to a 2.x profile without mutating it', () => {
    const profile = legacyProfile({ bcg: { date: '2024-01-05', notes: 'birth dose' } });
    const migrated = ensureLedger(profile, '2026-01-01T00:00:00.000Z');

    expect(migrated.events).toHaveLength(1);
    expect(migrated.ledgerMigratedAt).toBe('2026-01-01T00:00:00.000Z');
    // Nothing is lost: the date and the note survive into the projection.
    expect(migrated.records.bcg.date).toBe('2024-01-05');
    expect(migrated.records.bcg.notes).toBe('birth dose');
    // The incoming profile is never written to.
    expect(profile.events).toBeUndefined();
    expect(profile.ledgerMigratedAt).toBeUndefined();
  });

  it('is idempotent, so hydrating twice cannot resurrect a deleted dose', () => {
    const profile = legacyProfile({
      bcg: { date: '2024-01-05' },
      opv: { date: '2024-02-05' },
    });
    const once = ensureLedger(profile);
    const afterDeletion = {
      ...once,
      events: once.events?.filter((entry) => entry.vaccineId !== 'opv'),
    };
    const twice = ensureLedger(afterDeletion);

    expect(twice.events).toHaveLength(1);
    expect(twice.events?.[0].vaccineId).toBe('bcg');
    // The projection follows the ledger, so the deleted dose is gone from it too.
    expect(Object.keys(twice.records)).toEqual(['bcg']);
  });

  it('migrates a payload that claims an empty ledger but still has records', () => {
    const stripped = { ...legacyProfile({ bcg: { date: '2024-01-05' } }), events: [] };
    const repaired = ensureLedger(stripped);
    expect(repaired.events).toHaveLength(1);
    expect(repaired.events?.[0].vaccineId).toBe('bcg');
  });

  it('rebuilds the legacy projection from an existing ledger', () => {
    const profile: Profile = {
      ...legacyProfile({}),
      events: [
        event({ id: 'a', vaccineId: 'opv', doseNumber: 1, date: '2024-01-05' }),
        event({ id: 'b', vaccineId: 'opv', doseNumber: 2, date: '2024-02-19', notes: 'second' }),
      ],
    };
    const ledgered = ensureLedger(profile);

    // One slot per vaccine, holding the most recent dose — lossy by design, and
    // only ever a compatibility view for older readers.
    expect(ledgered.records.opv.date).toBe('2024-02-19');
    expect(ledgered.records.opv.doseNumber).toBe(2);
    expect(ledgered.records.opv.notes).toBe('second');
    expect(ledgered.events).toHaveLength(2);
  });

  it('repairs and dedupes a corrupted ledger', () => {
    const profile: Profile = {
      ...legacyProfile({}),
      events: [
        event({ id: 'a', date: '2024-02-19' }),
        event({ id: 'a', date: '2024-02-19' }),
        { id: 'b', vaccineId: 'opv' } as unknown as VaccinationEvent,
      ],
    };
    const ledgered = ensureLedger(profile);
    expect(ledgered.events?.map((entry) => entry.id)).toEqual(['a']);
  });
});

describe('doseLedger: normaliseEvent', () => {
  it('fills in what is missing and caps what is too long', () => {
    const normalised = normaliseEvent(
      {
        vaccineId: ' pentavalent ',
        date: '2024-03-05T00:00:00Z',
        doseNumber: 2.7,
        centre: 'x'.repeat(400),
        batch: '  BX-1  ',
        notes: '   ',
        manufacturer: 'm'.repeat(300),
      },
      'p-9',
      { now: '2026-01-01T00:00:00.000Z' },
    );

    expect(normalised).not.toBeNull();
    expect(normalised!.vaccineId).toBe('pentavalent');
    expect(normalised!.date).toBe('2024-03-05');
    expect(normalised!.doseNumber).toBe(2);
    expect(normalised!.profileId).toBe('p-9');
    expect(normalised!.centre).toHaveLength(200);
    expect(normalised!.manufacturer).toHaveLength(120);
    expect(normalised!.batch).toBe('BX-1');
    expect(normalised!.notes).toBeUndefined();
    expect(normalised!.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(normalised!.seriesId).toBe(seriesIdFor('pentavalent'));
    expect(normalised!.id).toBeTruthy();
  });

  it('rejects rows that are not doses', () => {
    expect(normaliseEvent(null, 'p-1')).toBeNull();
    expect(normaliseEvent('2024-01-05', 'p-1')).toBeNull();
    expect(normaliseEvent({ date: '2024-01-05' }, 'p-1')).toBeNull();
    expect(normaliseEvent({ vaccineId: 'opv' }, 'p-1')).toBeNull();
    expect(normaliseEvent({ vaccineId: 'opv', date: 'nope' }, 'p-1')).toBeNull();
    expect(normaliseEvent({ vaccineId: 'bad id!!', date: '2024-01-05' }, 'p-1')).toBeNull();
  });

  it('honours an explicit review flag and its reason', () => {
    const normalised = normaliseEvent(
      {
        vaccineId: 'opv',
        date: '2024-01-05',
        doseNumber: 1,
        needsReview: true,
        reviewReason: 'duplicate-dose-number',
      },
      'p-1',
    );
    expect(normalised!.needsReview).toBe(true);
    expect(normalised!.reviewReason).toBe('duplicate-dose-number');
  });

  it('keeps a supplied id, provenance and correction trail', () => {
    const normalised = normaliseEvent(
      {
        id: 'fixed-id',
        vaccineId: 'opv',
        date: '2024-01-05',
        provenance: 'verified',
        supersedes: 'old-id',
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
      'p-1',
    );
    expect(normalised!.id).toBe('fixed-id');
    expect(normalised!.provenance).toBe('verified');
    expect(normalised!.supersedes).toBe('old-id');
    expect(normalised!.updatedAt).toBe('2024-02-01T00:00:00.000Z');
  });

  it('falls back to a sane provenance for an unknown value', () => {
    const normalised = normaliseEvent(
      { vaccineId: 'opv', date: '2024-01-05', provenance: 'carrier-pigeon' },
      'p-1',
      { fallbackProvenance: 'import' },
    );
    expect(normalised!.provenance).toBe('import');
  });

  it('flags a dose dated in the future', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const normalised = normaliseEvent({ vaccineId: 'opv', date: future }, 'p-1');
    expect(normalised!.needsReview).toBe(true);
    expect(normalised!.reviewReason).toBe('future-date');
    expect(deriveReview(normalised!)).toEqual({ needsReview: true, reviewReason: 'future-date' });
  });

  it('flags a migrated row that never recorded which dose it was', () => {
    const review = deriveReview({
      vaccineId: 'opv',
      date: '2024-01-05',
      doseNumber: null,
      provenance: 'legacy-migration',
    });
    expect(review).toEqual({
      needsReview: true,
      reviewReason: 'legacy-dose-number-unknown',
    });
  });

  it('says "we do not know which dose" rather than "that number is wrong"', () => {
    // A family that records a dose but cannot say which one is flagged for
    // review under its own reason: the UI must not claim a number they never
    // gave is outside the schedule.
    expect(
      deriveReview({
        vaccineId: 'opv',
        date: '2024-01-05',
        doseNumber: null,
        provenance: 'manual',
      }),
    ).toEqual({ needsReview: true, reviewReason: 'dose-number-unknown' });

    // An imported row with no dose number is the same gap.
    expect(
      deriveReview({
        vaccineId: 'pcv',
        date: '2024-01-05',
        doseNumber: null,
        provenance: 'import',
      }),
    ).toEqual({ needsReview: true, reviewReason: 'dose-number-unknown' });

    // A vaccine with no routine milestone schedule cannot be "out of range" either.
    expect(
      deriveReview({
        vaccineId: 'rotavirus',
        date: '2024-01-05',
        doseNumber: null,
        provenance: 'manual',
      }),
    ).toEqual({ needsReview: false });
  });

  it('reports an invalid date as needing review rather than throwing', () => {
    expect(
      deriveReview({
        vaccineId: 'opv',
        date: '2024-13-45',
        doseNumber: null,
        provenance: 'manual',
      }),
    ).toEqual({ needsReview: true, reviewReason: 'invalid-date' });
  });
});

describe('doseLedger: ordering and duplicates', () => {
  it('orders by date, then creation, then id', () => {
    const a = event({ id: 'a', date: '2024-01-05', createdAt: '2024-01-05T09:00:00.000Z' });
    const b = event({ id: 'b', date: '2024-01-05', createdAt: '2024-01-05T08:00:00.000Z' });
    const c = event({ id: 'c', date: '2024-02-05', createdAt: '2024-02-05T08:00:00.000Z' });
    const d = event({ id: 'd', date: '2024-01-05', createdAt: '2024-01-05T08:00:00.000Z' });
    const input = [c, a, d, b];

    expect(sortEvents(input).map((entry) => entry.id)).toEqual(['b', 'd', 'a', 'c']);
    // The caller's array is not reordered.
    expect(input.map((entry) => entry.id)).toEqual(['c', 'a', 'd', 'b']);
    expect(compareEvents(a, a)).toBe(0);
    expect(compareEvents(a, c)).toBe(-1);
    expect(compareEvents(c, a)).toBe(1);
  });

  it('keeps the first event per id', () => {
    const first = event({ id: 'same', date: '2024-01-05' });
    const second = event({ id: 'same', date: '2024-09-09' });
    const deduped = dedupeById([first, second]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].date).toBe('2024-01-05');
  });

  it('flags a second event claiming the same dose of the same series', () => {
    const flagged = flagDuplicateDoseNumbers([
      event({ id: 'a', vaccineId: 'opv', doseNumber: 2, date: '2024-01-05' }),
      event({ id: 'b', vaccineId: 'opv', doseNumber: 2, date: '2024-06-05' }),
      // A different series is unaffected, and neither is an unnumbered row.
      event({ id: 'c', vaccineId: 'pcv', doseNumber: 2, date: '2024-06-05' }),
      event({ id: 'd', vaccineId: 'opv', doseNumber: null, date: '2024-07-05' }),
    ]);

    expect(flagged[0].needsReview).toBeUndefined();
    expect(flagged[1].needsReview).toBe(true);
    expect(flagged[1].reviewReason).toBe('duplicate-dose-number');
    expect(flagged[2].needsReview).toBeUndefined();
    expect(flagged[3].needsReview).toBeUndefined();
  });
});

describe('doseLedger: series state and attribution', () => {
  it('starts from an empty state that knows the schedule', () => {
    expect(emptySeriesState('opv').scheduledDoseCount).toBe(4);
    expect(emptySeriesState('opv').unscheduled).toBe(false);
    expect(emptySeriesState('rotavirus').unscheduled).toBe(true);
    expect(emptySeriesState('rotavirus').administered).toEqual([]);
  });

  it('attributes one unnumbered legacy event to one dose only', () => {
    const history = seriesState([migratedEvent('opv', '2024-01-05')]);
    const opv = history.opv;

    expect(opv.satisfiedDoseNumbers).toEqual([1]);
    expect(opv.provisionalDoseNumbers).toEqual([1]);
    expect(opv.completedDoseNumbers).toEqual([]);
    expect(opv.unattributedCount).toBe(1);
    expect(opv.needsReview).toBe(true);
    expect(opv.latestDate).toBe('2024-01-05');
    expect(opv.administered[0].attribution).toBe('provisional');
    expect(isDoseSatisfied(history, 'opv', 1)).toBe(true);
    expect(isDoseSatisfied(history, 'opv', 2)).toBe(false);
    expect(isDoseSatisfied(history, 'nothing', 1)).toBe(false);
  });

  it('fills the earliest open slot per unnumbered event, never more than the series has', () => {
    const six = [1, 2, 3, 4, 5, 6].map((index) =>
      event({ id: `e${index}`, vaccineId: 'opv', date: `2024-0${index}-05` }),
    );
    const opv = seriesState(six).opv;

    // OPV has four milestone doses: four are satisfied, two cannot be placed.
    expect(opv.satisfiedDoseNumbers).toEqual([1, 2, 3, 4]);
    expect(opv.provisionalDoseNumbers).toEqual([1, 2, 3, 4]);
    expect(opv.unattributedCount).toBe(6);
    expect(opv.administered).toHaveLength(6);
    expect(opv.administered.filter((dose) => dose.doseNumber === null)).toHaveLength(2);
  });

  it('prefers a recorded dose number and leaves the other slots open', () => {
    const history = seriesState([
      event({ id: 'a', vaccineId: 'pentavalent', doseNumber: 3, date: '2024-05-05' }),
      event({ id: 'b', vaccineId: 'pentavalent', date: '2024-03-05' }),
    ]);
    const penta = history.pentavalent;

    expect(penta.completedDoseNumbers).toEqual([3]);
    // The unnumbered event takes the earliest slot that is still open.
    expect(penta.provisionalDoseNumbers).toEqual([1]);
    expect(penta.satisfiedDoseNumbers).toEqual([1, 3]);
    expect(administeredForDose(history, 'pentavalent', 3)?.eventId).toBe('a');
    expect(administeredForDose(history, 'pentavalent', 3)?.attribution).toBe('exact');
    expect(administeredForDose(history, 'pentavalent', 2)).toBeUndefined();
  });

  it('counts a duplicate dose number once and flags the second event', () => {
    const penta = seriesState([
      event({ id: 'a', vaccineId: 'pentavalent', doseNumber: 2, date: '2024-03-05' }),
      event({ id: 'b', vaccineId: 'pentavalent', doseNumber: 2, date: '2024-04-05' }),
    ]).pentavalent;

    expect(penta.satisfiedDoseNumbers).toEqual([2]);
    expect(penta.administered).toHaveLength(2);
    expect(penta.needsReview).toBe(true);
    expect(penta.administered[0].needsReview).toBe(false);
    expect(penta.administered[1].needsReview).toBe(true);
    expect(penta.administered[1].reviewReason).toBe('duplicate-dose-number');
  });

  it('keeps the details of each administered dose', () => {
    const penta = seriesState([
      event({
        id: 'a',
        vaccineId: 'pentavalent',
        doseNumber: 1,
        date: '2024-02-19',
        centre: 'Mohakhali',
        batch: 'BX-1',
        manufacturer: 'GII',
        notes: 'no reaction',
        provenance: 'verified',
      }),
    ]).pentavalent;

    expect(penta.administered[0]).toMatchObject({
      eventId: 'a',
      doseNumber: 1,
      attribution: 'exact',
      centre: 'Mohakhali',
      batch: 'BX-1',
      manufacturer: 'GII',
      notes: 'no reaction',
      provenance: 'verified',
      scheduledDoseId: 'pentavalent#1@42d',
    });
  });

  it('claims nothing for a vaccine the milestone schedule does not cover', () => {
    const state = seriesState([
      event({ id: 'a', vaccineId: 'rotavirus', doseNumber: 1, date: '2024-02-19' }),
      event({ id: 'b', vaccineId: 'rotavirus', date: '2024-04-19' }),
    ]).rotavirus;

    expect(state.unscheduled).toBe(true);
    expect(state.scheduledDoseCount).toBe(0);
    // Both doses are kept and shown, but neither can complete a routine EPI series.
    expect(state.satisfiedDoseNumbers).toEqual([]);
    expect(state.administered).toHaveLength(2);
    expect(state.unattributedCount).toBe(1);
  });
});

describe('doseLedger: toDoseHistory accepts every shape callers have', () => {
  const ledger = [event({ id: 'a', vaccineId: 'opv', doseNumber: 2, date: '2024-02-19' })];

  it('reads a ledger array', () => {
    expect(toDoseHistory(ledger).opv.satisfiedDoseNumbers).toEqual([2]);
  });

  it('reads a profile with a ledger', () => {
    const profile: Profile = { ...legacyProfile({}), events: ledger };
    expect(toDoseHistory(profile).opv.satisfiedDoseNumbers).toEqual([2]);
  });

  it('migrates a profile that only has the legacy map', () => {
    const profile = legacyProfile({ opv: { date: '2024-02-19' } });
    const history = toDoseHistory(profile);
    expect(history.opv.satisfiedDoseNumbers).toEqual([1]);
    expect(history.opv.administered[0].attribution).toBe('provisional');
  });

  it('migrates a bare legacy map, in either 2.x format', () => {
    expect(toDoseHistory({ opv: { date: '2024-02-19' } }).opv.satisfiedDoseNumbers).toEqual([1]);
    expect(toDoseHistory({ opv: '2024-02-19' }).opv.satisfiedDoseNumbers).toEqual([1]);
  });

  it('passes an already-normalised history straight through', () => {
    const history = seriesState(ledger);
    expect(toDoseHistory(history)).toEqual(history);
  });

  it('returns an empty history for nothing at all', () => {
    expect(toDoseHistory(undefined)).toEqual({});
    expect(toDoseHistory(null)).toEqual({});
    expect(toDoseHistory({})).toEqual({});
    expect(toDoseHistory('nope' as unknown as null)).toEqual({});
  });

  it('ignores junk inside a legacy map', () => {
    const history = toDoseHistory({
      opv: { date: '2024-02-19' },
      pcv: 42 as unknown as string,
    });
    expect(Object.keys(history)).toEqual(['opv']);
  });
});

describe('doseLedger: buildEvent', () => {
  it('builds a complete event', () => {
    const result = buildEvent('p-1', {
      vaccineId: 'pentavalent',
      date: '2024-03-05',
      doseNumber: 2,
      centre: 'Mohakhali',
      manufacturer: 'GII',
      batch: 'BX-1',
      notes: 'no reaction',
    });

    expect(result.error).toBeUndefined();
    expect(result.event).toMatchObject({
      profileId: 'p-1',
      vaccineId: 'pentavalent',
      doseNumber: 2,
      scheduledDoseId: 'pentavalent#2@70d',
      seriesId: seriesIdFor('pentavalent'),
      provenance: 'manual',
      centre: 'Mohakhali',
      batch: 'BX-1',
      manufacturer: 'GII',
      notes: 'no reaction',
    });
    expect(result.event!.id).toBeTruthy();
    expect(result.event!.createdAt).toBeTruthy();
  });

  it('accepts a dose number typed into a form as a string', () => {
    expect(
      buildEvent('p-1', { vaccineId: 'opv', date: '2024-01-05', doseNumber: '3' }).event
        ?.doseNumber,
    ).toBe(3);
    // "Not sure which dose" is a legal answer, not an error.
    expect(
      buildEvent('p-1', { vaccineId: 'opv', date: '2024-01-05', doseNumber: '' }).event?.doseNumber,
    ).toBeNull();
  });

  const invalidInputs: Array<[Parameters<typeof buildEvent>[1], string]> = [
    [{ vaccineId: '', date: '2024-01-05' }, 'missing-vaccine'],
    [{ vaccineId: 'bad id!!', date: '2024-01-05' }, 'unknown-vaccine'],
    [{ vaccineId: 'opv', date: '' }, 'missing-date'],
    [{ vaccineId: 'opv', date: '05/01/2024' }, 'invalid-date'],
    [{ vaccineId: 'opv', date: '2999-01-01' }, 'future-date'],
    [{ vaccineId: 'opv', date: '2024-01-05', doseNumber: 0 }, 'invalid-dose-number'],
    [{ vaccineId: 'opv', date: '2024-01-05', doseNumber: -2 }, 'invalid-dose-number'],
    [{ vaccineId: 'opv', date: '2024-01-05', doseNumber: 'abc' }, 'invalid-dose-number'],
  ];

  it.each(invalidInputs)('rejects %j with %s', (input, expected) => {
    const result = buildEvent('p-1', input);
    expect(result.event).toBeUndefined();
    expect(result.error).toBe(expected);
  });

  it('accepts today, because a clinic records a dose on the day it is given', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildEvent('p-1', { vaccineId: 'opv', date: today }).error).toBeUndefined();
  });

  it('flags a recorded dose whose number the schedule does not have', () => {
    const result = buildEvent('p-1', {
      vaccineId: 'pentavalent',
      date: '2024-01-05',
      doseNumber: 5,
    });
    expect(result.event!.needsReview).toBe(true);
    expect(result.event!.reviewReason).toBe('dose-number-out-of-range');
  });

  it('keeps a supplied id and creation stamp, for imports', () => {
    const result = buildEvent('p-1', {
      vaccineId: 'opv',
      date: '2024-01-05',
      id: 'imported-1',
      createdAt: '2024-01-05T07:00:00.000Z',
      provenance: 'import',
    });
    expect(result.event!.id).toBe('imported-1');
    expect(result.event!.createdAt).toBe('2024-01-05T07:00:00.000Z');
    expect(result.event!.provenance).toBe('import');
  });
});

describe('doseLedger: writing to a ledger', () => {
  it('appends and keeps the ledger sorted', () => {
    const ledger = [event({ id: 'a', date: '2024-01-05' })];
    const next = appendEvent(ledger, event({ id: 'b', date: '2023-12-01' }));
    expect(next.map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(ledger).toHaveLength(1); // input untouched
  });

  it('replaces rather than duplicates an event with the same id', () => {
    const ledger = [event({ id: 'a', date: '2024-01-05' })];
    const next = appendEvent(ledger, event({ id: 'a', date: '2024-06-05' }));
    expect(next).toHaveLength(1);
    expect(next[0].date).toBe('2024-06-05');
  });

  it('corrects one event in place and stamps the change', () => {
    const ledger = [
      event({ id: 'a', vaccineId: 'pentavalent', doseNumber: 1, date: '2024-02-19' }),
      event({ id: 'b', vaccineId: 'pentavalent', doseNumber: 2, date: '2024-03-19' }),
      event({ id: 'c', vaccineId: 'pentavalent', doseNumber: 3, date: '2024-04-19' }),
    ];
    const next = updateEvent(ledger, 'b', { date: '2024-03-20' }, '2026-01-01T00:00:00.000Z');

    expect(next[1].date).toBe('2024-03-20');
    expect(next[1].updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(next[1].id).toBe('b');
    expect(next[1].createdAt).toBe(ledger[1].createdAt);
    // The other two are the very same objects: untouched.
    expect(next[0]).toBe(ledger[0]);
    expect(next[2]).toBe(ledger[2]);
  });

  it('can set, change and clear every correctable field', () => {
    const ledger = [event({ id: 'a', vaccineId: 'opv', date: '2024-01-05' })];

    const numbered = updateEvent(ledger, 'a', {
      doseNumber: 3,
      centre: 'Mohakhali',
      batch: 'B1',
    });
    expect(numbered[0].doseNumber).toBe(3);
    expect(numbered[0].scheduledDoseId).toBe('opv#3@70d');
    // Confirming the dose number clears the review flag.
    expect(numbered[0].needsReview).toBeUndefined();

    const filled = updateEvent(numbered, 'a', {
      manufacturer: 'GII',
      notes: 'no reaction',
      provenance: 'verified',
    });
    expect(filled[0]).toMatchObject({
      manufacturer: 'GII',
      notes: 'no reaction',
      provenance: 'verified',
    });

    const cleared = updateEvent(filled, 'a', {
      centre: '',
      batch: null,
      manufacturer: null,
      notes: '   ',
      doseNumber: null,
    });
    expect(cleared[0].centre).toBeUndefined();
    expect(cleared[0].batch).toBeUndefined();
    expect(cleared[0].manufacturer).toBeUndefined();
    expect(cleared[0].notes).toBeUndefined();
    expect(cleared[0].doseNumber).toBeNull();
    expect(cleared[0].scheduledDoseId).toBeNull();
  });

  it('re-flags a correction that introduces a problem', () => {
    const ledger = [
      event({ id: 'a', vaccineId: 'pentavalent', doseNumber: 1, date: '2024-01-05' }),
    ];
    const next = updateEvent(ledger, 'a', { doseNumber: 9 });
    expect(next[0].needsReview).toBe(true);
    expect(next[0].reviewReason).toBe('dose-number-out-of-range');
  });

  it('leaves the ledger alone when the id does not exist', () => {
    const ledger = [event({ id: 'a' })];
    expect(updateEvent(ledger, 'missing', { date: '2020-01-01' })).toEqual(ledger);
  });

  it('removes exactly one event', () => {
    const ledger = [event({ id: 'a', date: '2024-01-05' }), event({ id: 'b', date: '2024-02-05' })];
    const { events, removed } = removeEventById(ledger, 'a');
    expect(events.map((entry) => entry.id)).toEqual(['b']);
    expect(removed?.id).toBe('a');
    expect(removeEventById(ledger, 'nope').removed).toBeUndefined();
    expect(removeEventById(ledger, 'nope').events).toHaveLength(2);
  });

  it('removes a whole vaccine history only when asked to', () => {
    const ledger = [
      event({ id: 'a', vaccineId: 'opv', date: '2024-01-05' }),
      event({ id: 'b', vaccineId: 'opv', date: '2024-02-05' }),
      event({ id: 'c', vaccineId: 'pcv', date: '2024-02-05' }),
    ];
    const { events, removed } = removeVaccineEvents(ledger, 'opv');
    expect(removed).toHaveLength(2);
    expect(events.map((entry) => entry.id)).toEqual(['c']);
  });
});

describe('doseLedger: merging ledgers', () => {
  it('adds events the device does not have', () => {
    const result = mergeEvents(
      [event({ id: 'a', vaccineId: 'opv', date: '2024-01-05' })],
      [event({ id: 'b', vaccineId: 'pcv', date: '2024-02-05' })],
    );
    expect(result.added).toBe(1);
    expect(result.events.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('does not double-count the same event imported twice', () => {
    const ledger = [event({ id: 'a', vaccineId: 'opv', doseNumber: 1, date: '2024-01-05' })];
    const result = mergeEvents(ledger, ledger);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.events).toHaveLength(1);
  });

  it('recognises the same dose recorded on two devices and enriches it', () => {
    const local = [migratedEvent('opv', '2024-01-05')];
    const remote = [
      event({
        id: 'remote-1',
        vaccineId: 'opv',
        doseNumber: 2,
        date: '2024-01-05',
        centre: 'Mohakhali',
        provenance: 'manual',
      }),
    ];
    const result = mergeEvents(local, remote);

    expect(result.events).toHaveLength(1);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.events[0].id).toBe(local[0].id);
    expect(result.events[0].doseNumber).toBe(2);
    expect(result.events[0].centre).toBe('Mohakhali');
    expect(result.events[0].needsReview).toBeUndefined();
  });

  it('never downgrades a verified record', () => {
    const local = [
      event({
        id: 'a',
        vaccineId: 'opv',
        doseNumber: 1,
        date: '2024-01-05',
        provenance: 'verified',
      }),
    ];
    const remote = [
      event({ id: 'a', vaccineId: 'opv', doseNumber: 1, date: '2024-01-05', provenance: 'manual' }),
    ];
    const result = mergeEvents(local, remote);
    expect(result.events[0].provenance).toBe('verified');
    expect(result.updated).toBe(0);
  });

  it('prefers the better informed copy but keeps the earliest origin', () => {
    const sparse = [
      event({
        id: 'a',
        vaccineId: 'opv',
        doseNumber: null,
        date: '2024-01-05',
        createdAt: '2024-01-05T08:00:00.000Z',
      }),
    ];
    const rich = [
      event({
        id: 'a',
        vaccineId: 'opv',
        doseNumber: 4,
        date: '2024-01-05',
        batch: 'B-9',
        notes: 'n',
        createdAt: '2024-06-01T08:00:00.000Z',
      }),
    ];
    const result = mergeEvents(sparse, rich);
    expect(result.updated).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].doseNumber).toBe(4);
    expect(result.events[0].batch).toBe('B-9');
    expect(result.events[0].notes).toBe('n');
    // The dose was first written down on 5 January, whichever copy says so.
    expect(result.events[0].createdAt).toBe('2024-01-05T08:00:00.000Z');
    expect(result.events[0].updatedAt).toBeTruthy();
  });

  it('fingerprinting ignores ids and free-text notes', () => {
    const a = event({ id: 'a', vaccineId: 'opv', doseNumber: 2, date: '2024-01-05' });
    const b = event({ id: 'b', vaccineId: 'opv', doseNumber: 2, date: '2024-01-05', notes: 'n' });
    expect(doseFingerprint(a)).toBe(doseFingerprint(b));
    expect(doseFingerprint(a)).not.toBe(doseFingerprint({ ...a, date: '2024-01-06' }));
    expect(doseFingerprint(a)).not.toBe(doseFingerprint({ ...a, doseNumber: 3 }));
  });

  it('keeps both events when the same dose number arrives twice with different details', () => {
    const result = mergeEvents(
      [event({ id: 'a', vaccineId: 'opv', doseNumber: 2, date: '2024-01-05' })],
      [
        event({
          id: 'b',
          vaccineId: 'opv',
          doseNumber: 2,
          date: '2024-06-05',
          centre: 'Uttara',
        }),
      ],
    );
    expect(result.events).toHaveLength(2);
    expect(result.added).toBe(1);
    // Both visits are kept, the second is flagged for a human to resolve.
    expect(result.events[1].needsReview).toBe(true);
    expect(result.events[1].reviewReason).toBe('duplicate-dose-number');
  });
});

describe('doseLedger: reading helpers', () => {
  const ledger = [
    migratedEvent('opv', '2024-01-05'),
    event({ id: 'b', vaccineId: 'pcv', doseNumber: 1, date: '2024-02-05' }),
    event({ id: 'c', vaccineId: 'opv', doseNumber: 2, date: '2024-03-05' }),
  ];

  it('lists events per vaccine and across the ledger', () => {
    expect(eventsForVaccine(ledger, 'opv').map((entry) => entry.id)).toEqual([
      legacyEventId('p-1', 'opv'),
      'c',
    ]);
    expect(eventsForVaccine(ledger, 'mr')).toEqual([]);
    expect(vaccineIdsInLedger(ledger)).toEqual(['opv', 'pcv']);
    expect(vaccineIdsInLedger([])).toEqual([]);
  });

  it('finds the events a human should confirm', () => {
    expect(eventsNeedingReview(ledger).map((entry) => entry.id)).toEqual([
      legacyEventId('p-1', 'opv'),
    ]);
  });

  it('projects the ledger back to the 2.x shape', () => {
    const records = legacyProjection(ledger);
    expect(Object.keys(records).sort()).toEqual(['opv', 'pcv']);
    // The most recent dose per vaccine wins the single slot.
    expect(records.opv.date).toBe('2024-03-05');
    expect(records.opv.doseNumber).toBe(2);
    expect(records.pcv.date).toBe('2024-02-05');
    expect(records.pcv.doseNumber).toBe(1);
    expect(legacyProjection([])).toEqual({});
  });
});
