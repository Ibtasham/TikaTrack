import { describe, expect, it } from 'vitest';

import {
  doseCsvColumn,
  doseCsvCount,
  doseCsvDataRows,
  doseCsvRows,
  DOSE_CSV_HEADER,
} from '../lib/doseExport';
import { allVaccines } from '../data/vaccines';
import { seriesIdFor, type NewDoseEventInput } from '../lib/doseLedger';
import { toCSV } from '../lib/exporters';
import {
  allDoseEvents,
  buildExport,
  doseCount,
  doseHistory,
  mergeImport,
  normaliseProfile,
  recordDoseEvent,
  removeDose,
  removeDoseEvent,
  removeVaccineHistory,
  resolveDoseReview,
  reviewQueue,
  updateDoseEvent,
} from '../lib/profileStore';
import {
  calculateVaccinationStats,
  generateCatchUpPlan,
  generateFamilyTimeline,
  generatePersonalizedSchedule,
  getOverdueVaccinations,
} from '../lib/smartScheduler';
import { EXPORT_VERSION, type Profile, type VaccinationEvent } from '../types';

/**
 * The six regressions PROMPT 3 exists to prevent.
 *
 * Each one is driven end to end — write through `profileStore`, then read the
 * result back through the scheduler, the statistics and the exporters — because
 * the 2.x bug was never in one function. It was in the shape of the data: one
 * slot per vaccine, so recording, correcting or deleting a single dose silently
 * spoke for the whole series.
 */

const MEMBER_ID = 'p-asha';
const SIBLING_ID = 'p-rafi';
/** Old enough that every milestone of the national schedule is already due. */
const DOB = '2024-01-01';

function member(
  id = MEMBER_ID,
  name = 'Asha',
  dateOfBirth = DOB,
  records: Record<string, unknown> = {},
): Profile {
  const profile = normaliseProfile({ id, name, dateOfBirth, records });
  if (!profile) throw new Error(`test fixture could not be normalised: ${id}`);
  return profile;
}

/**
 * A monotonic clock for `createdAt`.
 *
 * Two doses recorded in the same millisecond would be ordered by their random
 * ids, and an assertion about "the second dose" would be a coin toss. Every
 * write below is stamped one second apart instead.
 */
const CLOCK_BASE = Date.parse('2026-01-01T00:00:00.000Z');
let ticks = 0;
function nextNow(): string {
  ticks += 1;
  return new Date(CLOCK_BASE + ticks * 1000).toISOString();
}

/** Record a dose, failing the test loudly if the store rejects it. */
function mustRecord(
  profiles: Profile[],
  input: NewDoseEventInput,
  profileId = MEMBER_ID,
): { profiles: Profile[]; event: VaccinationEvent } {
  const result = recordDoseEvent(profiles, profileId, input, nextNow());
  if (!result.event) throw new Error(`dose was rejected: ${String(result.error)}`);
  return { profiles: result.profiles, event: result.event };
}

/** The scheduled doses of one vaccine, youngest milestone first. */
function dosesFor(profile: Profile, vaccineId: string) {
  return generatePersonalizedSchedule(profile.dateOfBirth, profile).filter(
    (dose) => dose.vaccineId === vaccineId,
  );
}

function eventsFor(profile: Profile, vaccineId: string): VaccinationEvent[] {
  return (profile.events ?? []).filter((event) => event.vaccineId === vaccineId);
}

describe('regression 1: recording OPV dose 1 does not complete OPV 2 and 3', () => {
  const first = mustRecord([member()], {
    vaccineId: 'opv',
    date: '2024-01-01',
    doseNumber: 1,
    centre: 'Mohakhali EPI centre',
  });
  const profile = first.profiles[0];

  it('leaves one event in the ledger, not four', () => {
    expect(doseCount(profile)).toBe(1);
    expect(eventsFor(profile, 'opv')).toHaveLength(1);
    expect(doseHistory(profile).opv.satisfiedDoseNumbers).toEqual([1]);
  });

  it('marks only the first OPV milestone complete', () => {
    const opv = dosesFor(profile, 'opv');
    expect(opv.map((dose) => dose.doseNumber)).toEqual([1, 2, 3, 4]);
    expect(opv.map((dose) => dose.status)).toEqual(['completed', 'overdue', 'overdue', 'overdue']);
    expect(opv[0].actualDate).toBe('2024-01-01');
    expect(opv[0].attribution).toBe('exact');
    expect(opv[0].recordId).toBe(first.event.id);
    expect(opv[0].centre).toBe('Mohakhali EPI centre');
    // The other three carry no record at all — not a copy of the first.
    for (const dose of opv.slice(1)) {
      expect(dose.recordId).toBeUndefined();
      expect(dose.actualDate).toBeUndefined();
      expect(dose.attribution).toBe('none');
    }
  });

  it('reports the remaining doses as outstanding everywhere else too', () => {
    const stats = calculateVaccinationStats(profile.dateOfBirth, profile);
    expect(stats.completed).toBe(1);
    expect(stats.overdue).toBe(15);
    expect(stats.progressPercentage).toBe(6);

    expect(getOverdueVaccinations(profile.dateOfBirth, profile)).toHaveLength(15);

    const catchUp = generateCatchUpPlan(profile.dateOfBirth, profile).find(
      (plan) => plan.vaccineId === 'opv',
    );
    expect(catchUp?.missedDoses).toEqual([2, 3, 4]);
    expect(catchUp?.missedDoseIds).toEqual(['opv#2@42d', 'opv#3@70d', 'opv#4@98d']);
    // The app has no sourced minimum interval for Bangladesh, so it does not
    // invent a next date: it says the family needs medical advice.
    expect(catchUp?.recommendedNextDate).toBeNull();
    expect(catchUp?.minimumInterval).toBeNull();
    expect(catchUp?.requiresMedicalAdvice).toBe(true);

    const timeline = generateFamilyTimeline([profile]).filter((entry) => entry.vaccineId === 'opv');
    expect(timeline.filter((entry) => entry.status === 'completed')).toHaveLength(1);
    expect(timeline.filter((entry) => entry.status === 'overdue')).toHaveLength(3);
  });

  it('keeps the next three OPV doses independent of each other', () => {
    const second = mustRecord(first.profiles, {
      vaccineId: 'opv',
      date: '2024-02-12',
      doseNumber: 2,
    });
    const third = mustRecord(second.profiles, {
      vaccineId: 'opv',
      date: '2024-03-11',
      doseNumber: 3,
    });
    const grown = third.profiles[0];

    expect(doseCount(grown)).toBe(3);
    expect(doseHistory(grown).opv.satisfiedDoseNumbers).toEqual([1, 2, 3]);
    expect(dosesFor(grown, 'opv').map((dose) => dose.status)).toEqual([
      'completed',
      'completed',
      'completed',
      'overdue',
    ]);
    // Three distinct records, three distinct ids — the first is still there.
    expect(eventsFor(grown, 'opv').map((event) => event.id)).toEqual([
      first.event.id,
      second.event.id,
      third.event.id,
    ]);
    expect(eventsFor(grown, 'opv').map((event) => event.date)).toEqual([
      '2024-01-01',
      '2024-02-12',
      '2024-03-11',
    ]);
  });
});

describe('regression 2: recording Pentavalent dose 1 does not complete doses 2 and 3', () => {
  const first = mustRecord([member()], {
    vaccineId: 'pentavalent',
    date: '2024-02-12',
    doseNumber: 1,
    manufacturer: 'Global Pharma',
    batch: 'PENTA-118',
  });
  const profile = first.profiles[0];

  it('completes exactly one of the three Pentavalent milestones', () => {
    const penta = dosesFor(profile, 'pentavalent');
    expect(penta).toHaveLength(3);
    expect(penta.map((dose) => dose.status)).toEqual(['completed', 'overdue', 'overdue']);
    expect(penta.map((dose) => dose.scheduledDoseId)).toEqual([
      'pentavalent#1@42d',
      'pentavalent#2@70d',
      'pentavalent#3@98d',
    ]);
    expect(penta[0].batch).toBe('PENTA-118');
    expect(penta[0].manufacturer).toBe('Global Pharma');
    expect(doseHistory(profile).pentavalent.satisfiedDoseNumbers).toEqual([1]);
  });

  it('does not let one Pentavalent dose speak for another vaccine either', () => {
    expect(doseCount(profile)).toBe(1);
    expect(Object.keys(doseHistory(profile))).toEqual(['pentavalent']);
    const stats = calculateVaccinationStats(profile.dateOfBirth, profile);
    expect(stats.completed).toBe(1);
    expect(stats.dosesRecorded).toBe(1);
    expect(generateCatchUpPlan(profile.dateOfBirth, profile).map((plan) => plan.vaccineId)).toEqual(
      expect.arrayContaining(['opv', 'pcv', 'mr', 'tcv']),
    );
  });

  it('records doses 2 and 3 against their own milestones', () => {
    const second = mustRecord(first.profiles, {
      vaccineId: 'pentavalent',
      date: '2024-03-11',
      doseNumber: 2,
    });
    const third = mustRecord(second.profiles, {
      vaccineId: 'pentavalent',
      date: '2024-04-08',
      doseNumber: 3,
    });
    const grown = third.profiles[0];

    expect(dosesFor(grown, 'pentavalent').map((dose) => dose.status)).toEqual([
      'completed',
      'completed',
      'completed',
    ]);
    expect(dosesFor(grown, 'pentavalent').map((dose) => dose.actualDate)).toEqual([
      '2024-02-12',
      '2024-03-11',
      '2024-04-08',
    ]);
    // The series is finished, and the rest of the schedule is untouched.
    expect(calculateVaccinationStats(grown.dateOfBirth, grown).completed).toBe(3);
    expect(
      generateCatchUpPlan(grown.dateOfBirth, grown).some(
        (plan) => plan.vaccineId === 'pentavalent',
      ),
    ).toBe(false);
  });
});

describe('regression 3: correcting one dose never changes another', () => {
  const one = mustRecord([member()], {
    vaccineId: 'pentavalent',
    date: '2024-02-12',
    doseNumber: 1,
    centre: 'Mohakhali EPI centre',
    notes: 'no reaction',
  });
  const two = mustRecord(one.profiles, {
    vaccineId: 'pentavalent',
    date: '2024-03-11',
    doseNumber: 2,
    centre: 'Mirpur EPI centre',
  });
  const three = mustRecord(two.profiles, {
    vaccineId: 'pentavalent',
    date: '2024-04-08',
    doseNumber: 3,
    centre: 'Uttara EPI centre',
  });
  const before = three.profiles[0];

  it('changes only the corrected event', () => {
    const corrected = updateDoseEvent(
      [before],
      MEMBER_ID,
      two.event.id,
      { date: '2024-03-18' },
      '2026-01-01T00:00:00.000Z',
    );
    const after = corrected[0];
    const events = eventsFor(after, 'pentavalent');

    expect(events.map((event) => event.date)).toEqual(['2024-02-12', '2024-03-18', '2024-04-08']);
    // The neighbours are the very same objects — not rewritten copies.
    expect(events[0]).toBe(eventsFor(before, 'pentavalent')[0]);
    expect(events[2]).toBe(eventsFor(before, 'pentavalent')[2]);
    expect(events[0].notes).toBe('no reaction');
    expect(events[0].centre).toBe('Mohakhali EPI centre');

    // The correction is traceable on the corrected event only.
    expect(events[1].id).toBe(two.event.id);
    expect(events[1].createdAt).toBe(two.event.createdAt);
    expect(events[1].updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(events[0].updatedAt).toBeUndefined();
    expect(events[2].updatedAt).toBeUndefined();
  });

  it('moves the corrected dose in the schedule and leaves the others', () => {
    const after = updateDoseEvent([before], MEMBER_ID, two.event.id, { date: '2024-03-18' })[0];
    const penta = dosesFor(after, 'pentavalent');
    expect(penta.map((dose) => dose.actualDate)).toEqual([
      '2024-02-12',
      '2024-03-18',
      '2024-04-08',
    ]);
    expect(penta.map((dose) => dose.status)).toEqual(['completed', 'completed', 'completed']);
    expect(penta[1].centre).toBe('Mirpur EPI centre');
  });

  it('can correct the other fields without touching the neighbours', () => {
    const after = updateDoseEvent([before], MEMBER_ID, one.event.id, {
      centre: 'Mohakhali EPI Centre',
      batch: 'PENTA-201',
      notes: 'mild fever',
    })[0];
    const events = eventsFor(after, 'pentavalent');

    expect(events[0]).toMatchObject({
      centre: 'Mohakhali EPI Centre',
      batch: 'PENTA-201',
      notes: 'mild fever',
      date: '2024-02-12',
      doseNumber: 1,
    });
    expect(events[1].centre).toBe('Mirpur EPI centre');
    expect(events[1].batch).toBeUndefined();
    expect(events[2].centre).toBe('Uttara EPI centre');
  });

  it('re-numbering one dose does not rewrite another, and flags the clash', () => {
    // The family checks the paper card: the third visit was really dose 2.
    const after = updateDoseEvent([before], MEMBER_ID, three.event.id, { doseNumber: 2 })[0];
    const events = eventsFor(after, 'pentavalent');

    expect(events[0]).toMatchObject({ doseNumber: 1, date: '2024-02-12' });
    expect(events[1]).toMatchObject({ doseNumber: 2, date: '2024-03-11' });
    expect(events[2]).toMatchObject({ doseNumber: 2, date: '2024-04-08' });
    // The dose that was already recorded as number 2 keeps its clean record.
    expect(events[1].needsReview).toBeUndefined();
    expect(events[2].needsReview).toBe(true);
    expect(events[2].reviewReason).toBe('duplicate-dose-number');

    // Dose 2 is counted once, dose 3 is now missing, and a human is asked.
    const history = doseHistory(after).pentavalent;
    expect(history.satisfiedDoseNumbers).toEqual([1, 2]);
    expect(dosesFor(after, 'pentavalent').map((dose) => dose.status)).toEqual([
      'completed',
      'completed',
      'overdue',
    ]);
    expect(dosesFor(after, 'pentavalent')[1].recordId).toBe(two.event.id);
    expect(reviewQueue([after])[0].events.map((event) => event.id)).toEqual([three.event.id]);
  });

  it('flags a correction into the future instead of accepting it quietly', () => {
    // The date pickers cap at today, so this can only arrive from a backup or a
    // hand-edited file. The dose is kept — it happened — but it is flagged, and
    // the flag travels with the event, not with its position in the ledger.
    const nextYear = `${new Date().getFullYear() + 1}-01-01`;
    const after = updateDoseEvent([before], MEMBER_ID, two.event.id, { date: nextYear })[0];
    const corrected = eventsFor(after, 'pentavalent').find((event) => event.id === two.event.id)!;

    expect(corrected.date).toBe(nextYear);
    expect(corrected.needsReview).toBe(true);
    expect(corrected.reviewReason).toBe('future-date');
    expect(reviewQueue([after]).map((entry) => entry.events.map((event) => event.id))).toEqual([
      [two.event.id],
    ]);
    // Its neighbours are still clean, and still exactly two of them.
    const clean = eventsFor(after, 'pentavalent').filter((event) => event.id !== two.event.id);
    expect(clean).toHaveLength(2);
    expect(clean.every((event) => event.needsReview === undefined)).toBe(true);
  });
});

describe('regression 4: deleting one dose does not delete the vaccine history', () => {
  const pcv = mustRecord([member()], { vaccineId: 'pcv', date: '2024-02-12', doseNumber: 1 });
  const one = mustRecord(pcv.profiles, { vaccineId: 'opv', date: '2024-01-01', doseNumber: 1 });
  const two = mustRecord(one.profiles, { vaccineId: 'opv', date: '2024-02-12', doseNumber: 2 });
  const three = mustRecord(two.profiles, { vaccineId: 'opv', date: '2024-03-11', doseNumber: 3 });
  const before = three.profiles[0];

  it('removes exactly the named dose', () => {
    const after = removeDose([before], MEMBER_ID, 'opv', two.event.id)[0];

    expect(eventsFor(after, 'opv').map((event) => event.id)).toEqual([
      one.event.id,
      three.event.id,
    ]);
    expect(eventsFor(after, 'opv').map((event) => event.date)).toEqual([
      '2024-01-01',
      '2024-03-11',
    ]);
    expect(doseCount(after)).toBe(3); // two OPV doses + the PCV dose
    // Another vaccine is untouched by an OPV deletion.
    expect(eventsFor(after, 'pcv').map((event) => event.id)).toEqual([pcv.event.id]);

    const opv = dosesFor(after, 'opv');
    expect(opv.map((dose) => dose.status)).toEqual([
      'completed',
      'overdue',
      'completed',
      'overdue',
    ]);
    expect(doseHistory(after).opv.satisfiedDoseNumbers).toEqual([1, 3]);
  });

  it('removes nothing for a stale id or the wrong vaccine', () => {
    expect(doseCount(removeDose([before], MEMBER_ID, 'opv', 'dose-that-does-not-exist')[0])).toBe(
      4,
    );
    // "Delete OPV dose 2" must never reach a Pentavalent/PCV event.
    expect(eventsFor(removeDose([before], MEMBER_ID, 'pcv', one.event.id)[0], 'opv')).toHaveLength(
      3,
    );
    expect(eventsFor(removeDose([before], MEMBER_ID, 'pcv', one.event.id)[0], 'pcv')).toHaveLength(
      1,
    );
    // A different member's doses are out of reach.
    expect(doseCount(removeDose([before], SIBLING_ID, 'opv', one.event.id)[0])).toBe(4);
  });

  it('removes one dose by id alone, whatever the vaccine', () => {
    const after = removeDoseEvent([before], MEMBER_ID, three.event.id)[0];
    expect(eventsFor(after, 'opv').map((event) => event.doseNumber)).toEqual([1, 2]);
    expect(eventsFor(after, 'pcv')).toHaveLength(1);
  });

  it('keeps deleting the whole vaccine history a separate, explicit action', () => {
    const after = removeVaccineHistory([before], MEMBER_ID, 'opv')[0];
    expect(eventsFor(after, 'opv')).toHaveLength(0);
    // The other vaccine survives, and the member is still there.
    expect(eventsFor(after, 'pcv').map((event) => event.id)).toEqual([pcv.event.id]);
    expect(after.name).toBe('Asha');
    expect(dosesFor(after, 'opv').every((dose) => dose.status === 'overdue')).toBe(true);
  });

  it('reports every remaining dose in the family history view', () => {
    const after = removeDose([before], MEMBER_ID, 'opv', two.event.id)[0];
    // Newest first, and the deleted dose is simply absent.
    expect(allDoseEvents([after]).map((event) => event.id)).toEqual([
      three.event.id,
      pcv.event.id,
      one.event.id,
    ]);
    expect(allDoseEvents([after]).map((event) => event.date)).toEqual([
      '2024-03-11',
      '2024-02-12',
      '2024-01-01',
    ]);
  });
});

describe('regression 5: multiple doses of one vaccine survive backup and restore', () => {
  function familyWithSeveralDoses(): { profiles: Profile[]; ids: string[] } {
    let profiles = [member(MEMBER_ID, 'Asha', DOB), member(SIBLING_ID, 'Rafi', '2023-06-01')];
    const ids: string[] = [];
    for (const input of [
      { vaccineId: 'opv', date: '2024-01-01', doseNumber: 1, centre: 'Mohakhali' },
      { vaccineId: 'opv', date: '2024-02-12', doseNumber: 2, centre: 'Mohakhali' },
      { vaccineId: 'opv', date: '2024-03-11', doseNumber: 3, batch: 'OPV-77' },
      { vaccineId: 'pentavalent', date: '2024-02-13', doseNumber: 1 },
    ] as NewDoseEventInput[]) {
      const recorded = mustRecord(profiles, input);
      profiles = recorded.profiles;
      ids.push(recorded.event.id);
    }
    const sibling = mustRecord(
      profiles,
      { vaccineId: 'bcg', date: '2023-06-01', doseNumber: 1 },
      SIBLING_ID,
    );
    ids.push(sibling.event.id);
    return { profiles: sibling.profiles, ids };
  }

  it('restores every dose onto an empty device', () => {
    const { profiles, ids } = familyWithSeveralDoses();
    const backup = JSON.stringify(buildExport(profiles));
    const restored = mergeImport([], backup);

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.added).toBe(2);
    expect(restored.dosesAdded).toBe(5);

    const asha = restored.profiles.find((profile) => profile.id === MEMBER_ID)!;
    expect(doseCount(asha)).toBe(4);
    expect(eventsFor(asha, 'opv').map((event) => event.doseNumber)).toEqual([1, 2, 3]);
    expect(eventsFor(asha, 'opv').map((event) => event.date)).toEqual([
      '2024-01-01',
      '2024-02-12',
      '2024-03-11',
    ]);
    expect(eventsFor(asha, 'opv')[2].batch).toBe('OPV-77');
    expect(doseHistory(asha).opv.satisfiedDoseNumbers).toEqual([1, 2, 3]);
    expect(doseCount(restored.profiles.find((profile) => profile.id === SIBLING_ID)!)).toBe(1);
    expect(new Set(allDoseEvents(restored.profiles).map((event) => event.id))).toEqual(
      new Set(ids),
    );

    // The restored family still schedules correctly.
    expect(dosesFor(asha, 'opv').map((dose) => dose.status)).toEqual([
      'completed',
      'completed',
      'completed',
      'overdue',
    ]);
  });

  it('does not double-count a backup restored twice', () => {
    const { profiles } = familyWithSeveralDoses();
    const backup = JSON.stringify(buildExport(profiles));
    const first = mergeImport([], backup);
    if (!first.ok) throw new Error('restore failed');
    const second = mergeImport(first.profiles, backup);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.dosesAdded).toBe(0);
    expect(second.dosesSkipped).toBe(5);
    expect(doseCount(second.profiles.find((profile) => profile.id === MEMBER_ID)!)).toBe(4);
    expect(allDoseEvents(second.profiles)).toHaveLength(5);
  });

  it('keeps doses recorded after the backup when the backup is restored over them', () => {
    const { profiles } = familyWithSeveralDoses();
    const backup = JSON.stringify(buildExport(profiles));

    // This device keeps working: one more dose is recorded after the backup.
    const later = mustRecord(profiles, { vaccineId: 'pcv', date: '2024-02-12', doseNumber: 1 });
    expect(doseCount(later.profiles[0])).toBe(5);

    const restored = mergeImport(later.profiles, backup);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    // Every dose in the file was already here; the newer one is not lost.
    expect(restored.dosesAdded).toBe(0);
    expect(restored.dosesSkipped).toBe(5);
    const asha = restored.profiles.find((profile) => profile.id === MEMBER_ID)!;
    expect(doseCount(asha)).toBe(5);
    expect(eventsFor(asha, 'pcv')).toHaveLength(1);
    expect(doseHistory(asha).pcv.satisfiedDoseNumbers).toEqual([1]);
  });

  it('carries the ledger, and the derived 2.x map, in the file itself', () => {
    const { profiles } = familyWithSeveralDoses();
    const exported = buildExport(profiles);

    expect(exported.version).toBe(EXPORT_VERSION);
    const asha = exported.profiles.find((profile) => profile.id === MEMBER_ID)!;
    expect(asha.events).toHaveLength(4);
    expect(
      asha.events?.filter((event) => event.vaccineId === 'opv').map((event) => event.seriesId),
    ).toEqual([seriesIdFor('opv'), seriesIdFor('opv'), seriesIdFor('opv')]);
    expect(
      asha.events
        ?.filter((event) => event.vaccineId === 'pentavalent')
        .map((event) => event.seriesId),
    ).toEqual([seriesIdFor('pentavalent')]);
    expect(asha.events?.every((event) => event.profileId === MEMBER_ID)).toBe(true);
    // An older build opening this file still sees the most recent dose per vaccine.
    expect(asha.records.opv.date).toBe('2024-03-11');
    expect(asha.records.opv.doseNumber).toBe(3);
    // ...and it cannot see three OPV doses, which is exactly why it is derived.
    expect(JSON.parse(JSON.stringify(asha.records)).opv).not.toHaveProperty('events');
  });

  it('exports one CSV row per administered dose', () => {
    const { profiles } = familyWithSeveralDoses();
    const asha = profiles.find((profile) => profile.id === MEMBER_ID)!;

    expect(asha.name).toBe('Asha');
    expect(doseCsvCount(profiles)).toBe(5);
    const rows = doseCsvRows(profiles);
    expect(rows[0]).toEqual([...DOSE_CSV_HEADER]);
    expect(rows).toHaveLength(6); // header + five doses
    expect(doseCsvDataRows(profiles)).toHaveLength(5);

    const doseNumber = doseCsvColumn('Dose number');
    const dateGiven = doseCsvColumn('Date given');
    const recordId = doseCsvColumn('Record ID');
    const review = doseCsvColumn('Needs review');
    const ashaRows = rows.slice(1).filter((row) => row[0] === asha.name);
    expect(ashaRows.map((row) => row[doseNumber])).toEqual([1, 2, 1, 3]);
    expect(ashaRows.map((row) => row[dateGiven])).toEqual([
      '2024-01-01',
      '2024-02-12',
      '2024-02-13',
      '2024-03-11',
    ]);
    expect(ashaRows.every((row) => row[review] === 'no')).toBe(true);
    expect(new Set(ashaRows.map((row) => row[recordId])).size).toBe(4);

    // The CSV is real text a spreadsheet can read.
    const csv = toCSV(rows);
    expect(csv.split('\r\n')[0]).toBe(DOSE_CSV_HEADER.join(','));
    expect(csv.split('\r\n')).toHaveLength(6);
  });

  it('leaves an unknown dose number empty in the CSV rather than filling it in', () => {
    const legacy = member('legacy-1', 'Rafi', '2023-06-01', {
      opv: { date: '2023-07-15', centre: 'Mirpur' },
    });
    const rows = doseCsvDataRows([legacy]);
    expect(rows).toHaveLength(1);
    expect(rows[0][doseCsvColumn('Dose number')]).toBe('');
    expect(rows[0][doseCsvColumn('Dose (EN)')]).toBe('');
    expect(rows[0][doseCsvColumn('Needs review')]).toBe('yes');
    expect(rows[0][doseCsvColumn('Provenance')]).toBe('legacy-migration');
    expect(rows[0][doseCsvColumn('Centre')]).toBe('Mirpur');
  });

  it('still lists a member who has no doses yet', () => {
    const rows = doseCsvRows([member()]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveLength(DOSE_CSV_HEADER.length);
    expect(rows[1][0]).toBe('Asha');
    expect(rows[1][doseCsvColumn('Vaccine')]).toBe('');
  });

  it('names an unknown CSV column instead of returning -1', () => {
    expect(() => doseCsvColumn('Blood type')).toThrow(/unknown dose CSV column/);
  });
});

describe('regression 6: legacy profiles migrate without losing information', () => {
  /** Exactly what TikaTrack 2.x wrote to localStorage. */
  const legacyPayload = {
    id: 'legacy-1',
    name: 'Rafi',
    dateOfBirth: '2023-06-01',
    relationship: 'child',
    records: {
      bcg: '2023-06-01',
      opv: { date: '2023-07-15', notes: 'given with pentavalent', centre: 'Mirpur EPI centre' },
      pentavalent: {
        date: '2023-07-15',
        centre: 'Mirpur EPI centre',
        recordedAt: '2023-07-15T09:30:00.000Z',
      },
    },
  };
  const migrated = normaliseProfile(legacyPayload)!;

  it('keeps every date, note and centre', () => {
    expect(migrated.events).toHaveLength(3);
    const byVaccine = new Map((migrated.events ?? []).map((event) => [event.vaccineId, event]));

    expect(byVaccine.get('bcg')?.date).toBe('2023-06-01');
    expect(byVaccine.get('opv')?.date).toBe('2023-07-15');
    expect(byVaccine.get('opv')?.notes).toBe('given with pentavalent');
    expect(byVaccine.get('opv')?.centre).toBe('Mirpur EPI centre');
    expect(byVaccine.get('pentavalent')?.centre).toBe('Mirpur EPI centre');
    // The 2.x creation stamp becomes the event's origin.
    expect(byVaccine.get('pentavalent')?.createdAt).toBe('2023-07-15T09:30:00.000Z');
    expect(migrated.name).toBe('Rafi');
    expect(migrated.dateOfBirth).toBe('2023-06-01');
    expect(migrated.relationship).toBe('child');
    expect(migrated.ledgerMigratedAt).toBeTruthy();
  });

  it('never invents a dose number', () => {
    expect((migrated.events ?? []).every((event) => event.doseNumber === null)).toBe(true);
    expect((migrated.events ?? []).every((event) => event.provenance === 'legacy-migration')).toBe(
      true,
    );
    // ...and says so, per record, for a human to confirm.
    expect((migrated.events ?? []).every((event) => event.needsReview)).toBe(true);
    expect(
      (migrated.events ?? []).every((event) => event.reviewReason === 'legacy-dose-number-unknown'),
    ).toBe(true);
    expect(reviewQueue([migrated])[0].events).toHaveLength(3);
  });

  it('does not treat one legacy record as completing the whole series', () => {
    const history = doseHistory(migrated);
    expect(history.opv.satisfiedDoseNumbers).toEqual([1]);
    expect(history.opv.scheduledDoseCount).toBe(4);
    expect(history.opv.provisionalDoseNumbers).toEqual([1]);
    expect(history.pentavalent.satisfiedDoseNumbers).toEqual([1]);

    const opv = dosesFor(migrated, 'opv');
    expect(opv.map((dose) => dose.status)).toEqual(['completed', 'overdue', 'overdue', 'overdue']);
    // The match is disclosed as provisional, never presented as confirmed.
    expect(opv[0].attribution).toBe('provisional');
    expect(opv[0].needsReview).toBe(true);

    const stats = calculateVaccinationStats(migrated.dateOfBirth, migrated);
    expect(stats.completed).toBe(3); // one dose per legacy record, no more
    expect(stats.dosesRecorded).toBe(3);
    expect(stats.provisional).toBe(3);
    expect(stats.needsReview).toBe(3);

    expect(
      generateCatchUpPlan(migrated.dateOfBirth, migrated).some((plan) => plan.vaccineId === 'opv'),
    ).toBe(true);
  });

  it('keeps the legacy map readable for an older build', () => {
    expect(migrated.records.bcg.date).toBe('2023-06-01');
    expect(migrated.records.opv.notes).toBe('given with pentavalent');
    expect(migrated.records.opv.centre).toBe('Mirpur EPI centre');
    expect(Object.keys(migrated.records).sort()).toEqual(['bcg', 'opv', 'pentavalent']);
  });

  it('survives a backup and restore with nothing added or lost', () => {
    const restored = mergeImport([], JSON.stringify(buildExport([migrated])));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    const profile = restored.profiles[0];

    expect(doseCount(profile)).toBe(3);
    expect((profile.events ?? []).every((event) => event.doseNumber === null)).toBe(true);
    expect((profile.events ?? []).every((event) => event.provenance === 'legacy-migration')).toBe(
      true,
    );
    expect((profile.events ?? []).map((event) => event.id).sort()).toEqual(
      (migrated.events ?? []).map((event) => event.id).sort(),
    );
    expect(doseHistory(profile).opv.satisfiedDoseNumbers).toEqual([1]);
  });

  it('accepts a legacy record that did store a dose number', () => {
    const numbered = normaliseProfile({
      id: 'legacy-2',
      name: 'Nadia',
      dateOfBirth: '2023-06-01',
      records: { pentavalent: { date: '2023-08-01', doseNumber: 2, centre: 'Mirpur' } },
    })!;
    const event = (numbered.events ?? [])[0];

    expect(event.doseNumber).toBe(2);
    expect(event.scheduledDoseId).toBe('pentavalent#2@70d');
    // A record that says which dose it was needs no review.
    expect(event.needsReview).toBeUndefined();
    expect(doseHistory(numbered).pentavalent.satisfiedDoseNumbers).toEqual([2]);
    expect(doseHistory(numbered).pentavalent.completedDoseNumbers).toEqual([2]);
    expect(dosesFor(numbered, 'pentavalent').map((dose) => dose.status)).toEqual([
      'overdue',
      'completed',
      'overdue',
    ]);
  });

  it('lets a confirmed dose number move a record into its real place', () => {
    // The family finds the paper card: the July OPV visit was dose 2, not 1.
    const opvEvent = (migrated.events ?? []).find((event) => event.vaccineId === 'opv')!;
    const resolved = resolveDoseReview([migrated], 'legacy-1', opvEvent.id, 2)[0];
    const confirmed = (resolved.events ?? []).find((event) => event.id === opvEvent.id)!;

    expect(confirmed.doseNumber).toBe(2);
    expect(confirmed.needsReview).toBeUndefined();
    expect(confirmed.reviewReason).toBeUndefined();
    expect(confirmed.date).toBe('2023-07-15');
    expect(confirmed.notes).toBe('given with pentavalent');

    const opv = doseHistory(resolved).opv;
    expect(opv.completedDoseNumbers).toEqual([2]);
    expect(opv.satisfiedDoseNumbers).toEqual([2]);
    expect(opv.provisionalDoseNumbers).toEqual([]);
    // Dose 1 is now open again — nothing was invented to fill it.
    expect(dosesFor(resolved, 'opv').map((dose) => dose.status)).toEqual([
      'overdue',
      'completed',
      'overdue',
      'overdue',
    ]);
    // The other two records are still waiting for review.
    expect(reviewQueue([resolved])[0].events).toHaveLength(2);
  });

  it('migrates the same profile twice without duplicating a dose', () => {
    const twice = normaliseProfile({ ...legacyPayload, ...JSON.parse(JSON.stringify(migrated)) })!;
    expect(doseCount(twice)).toBe(3);
    const again = mergeImport([migrated], JSON.stringify(buildExport([migrated])));
    if (!again.ok) throw new Error('re-import failed');
    expect(doseCount(again.profiles[0])).toBe(3);
    expect(again.dosesAdded).toBe(0);
  });
});

describe('the dose CSV falls back instead of guessing', () => {
  it('prints the raw id for a vaccine the dataset does not know', () => {
    // A private or travel vaccine recorded by an import: the export must still
    // show it, under the only name it has, and must not invent a schedule label.
    const profile = normaliseProfile({
      id: 'csv-1',
      name: 'Asha',
      dateOfBirth: DOB,
      events: [
        {
          id: 'e1',
          vaccineId: 'zonksa',
          date: '2024-05-05',
          doseNumber: 9,
          provenance: 'import',
          centre: 'Private clinic',
        },
      ],
    })!;

    const rows = doseCsvDataRows([profile]);
    expect(rows).toHaveLength(1);
    expect(rows[0][doseCsvColumn('Vaccine')]).toBe('zonksa');
    expect(rows[0][doseCsvColumn('Vaccine (EN)')]).toBe('zonksa');
    expect(rows[0][doseCsvColumn('Dose number')]).toBe(9);
    expect(rows[0][doseCsvColumn('Dose (EN)')]).toBe('');
    expect(rows[0][doseCsvColumn('Centre')]).toBe('Private clinic');
    expect(rows[0][doseCsvColumn('Provenance')]).toBe('import');
    expect(doseCsvCount([profile])).toBe(1);
  });

  it('defaults to English headers and English member columns', () => {
    const profile = member('csv-2', 'Asha', DOB, { bcg: { date: '2024-01-05' } });
    expect(doseCsvRows([profile])[0]).toEqual(doseCsvRows([profile], 'en')[0]);
    const rows = doseCsvDataRows([profile]);
    const bcgName = allVaccines.find((vaccine) => vaccine.id === 'bcg')!.name.en;
    expect(rows[0][doseCsvColumn('Vaccine')]).toBe(bcgName);
  });

  it('localises the member columns into Bangla but keeps the headers', () => {
    const profile = member('csv-3', 'Asha', DOB, { opv: { date: '2024-01-05' } });
    const rows = doseCsvRows([profile], 'bn');
    // The header is an interchange format: a spreadsheet column does not change
    // language, but the value a Bangla-reading family checks does.
    expect(rows[0]).toEqual([...DOSE_CSV_HEADER]);
    const opvName = allVaccines.find((vaccine) => vaccine.id === 'opv')!.name.bn;
    expect(rows[1][doseCsvColumn('Vaccine')]).toBe(opvName);
    expect(rows[1][doseCsvColumn('Vaccine (EN)')]).toBe(
      allVaccines.find((vaccine) => vaccine.id === 'opv')!.name.en,
    );
    // Age is rendered the way the rest of the app renders it for Bangla.
    expect(rows[1][doseCsvColumn('Age')]).not.toBe('');
  });
});
