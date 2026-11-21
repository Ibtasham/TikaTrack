/**
 * Scheduling Engine & Intelligence Regression Suite
 *
 * Verifies calendar accuracy (leap years, clamped month milestones, week-based
 * infant visits), Bangladesh (Asia/Dhaka UTC+6) calendar boundaries, per-dose
 * attribution and progress accounting, anomaly detection, historical record
 * corrections, reminder safety, unresolved evidence caveats (C-005 / C-006),
 * and the upgraded UI across SmartTracker & ScheduleTimeline.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import {
  BANGLADESH_TIMEZONE,
  calculateCalendarAge,
  isValidISODate,
  parseISODate,
  resolveReferenceTodayISO,
} from '../lib/format';
import {
  analyzeDoseHistoryAnomalies,
  buildEvent,
  checkDuplicateDose,
  SCHEDULE_VERSION,
  scheduledDoseIdFor,
  seriesIdFor,
  updateEvent,
} from '../lib/doseLedger';
import { createProfile, normaliseDoseRecord, normaliseProfile, recordDoseEvent } from '../lib/profileStore';
import {
  analyzeSchedule,
  calculateScheduledDate,
  calculateVaccinationStats,
  determineVaccineStatus,
  generateCatchUpPlan,
  generatePersonalizedSchedule,
  validateCatchUpSchedule,
} from '../lib/smartScheduler';
import {
  DEFAULT_REMINDER_PREFERENCES,
  findUpcoming48HourDoses,
  generateReminders,
  processDueReminders,
  saveReminders,
} from '../lib/intelligentReminders';
import { evaluateScenarioReadiness } from '../data/readinessScenarios';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';
import type { VaccinationEvent } from '../types';

const en = translations.en;

function makeEvent(overrides: Partial<VaccinationEvent> & Pick<VaccinationEvent, 'id' | 'vaccineId' | 'date'>): VaccinationEvent {
  const doseNumber = overrides.doseNumber === undefined ? 1 : overrides.doseNumber;
  return {
    profileId: 'p-test',
    scheduleVersion: SCHEDULE_VERSION,
    seriesId: seriesIdFor(overrides.vaccineId),
    doseNumber,
    scheduledDoseId: scheduledDoseIdFor(overrides.vaccineId, doseNumber),
    createdAt: '2026-01-01T00:00:00.000Z',
    provenance: 'manual',
    ...overrides,
  };
}

describe('Calendar accuracy, leap years & strict ISO validation', () => {
  it('handles 2024-02-29 leap-day birth across fixed-day and clamped calendar-month milestones', () => {
    const dob = '2024-02-29';

    // Infant 6w / 10w / 14w milestones use exact day multiples (42d / 70d / 98d)
    expect(calculateScheduledDate(dob, 42)).toBe('2024-04-11');
    expect(calculateScheduledDate(dob, 70)).toBe('2024-05-09');
    expect(calculateScheduledDate(dob, 98)).toBe('2024-06-06');

    // 9-month (MR-1) & 15-month (MR-2 / TCV) use calendar months
    expect(calculateScheduledDate(dob, 270, 9)).toBe('2024-11-29');
    expect(calculateScheduledDate(dob, 450, 15)).toBe('2025-05-29');

    // Non-leap 1st birthday anniversary clamps Feb 29 -> Feb 28
    const dayBeforeAnniv = calculateCalendarAge(dob, {
      asOfDate: '2025-02-27',
      timezone: BANGLADESH_TIMEZONE,
    });
    expect(dayBeforeAnniv.years).toBe(0);
    expect(dayBeforeAnniv.months).toBe(11);
    expect(dayBeforeAnniv.isLeapBirth).toBe(true);

    const clampedAnniv = calculateCalendarAge(dob, {
      asOfDate: '2025-02-28',
      timezone: BANGLADESH_TIMEZONE,
    });
    expect(clampedAnniv.years).toBe(1);
    expect(clampedAnniv.months).toBe(0);
    expect(clampedAnniv.remainingDays).toBe(0);
    expect(clampedAnniv.days).toBe(365);

    // Month-end clamping: 31 May + 9 months -> 28 Feb (non-leap 2025)
    expect(calculateScheduledDate('2024-05-31', 270, 9)).toBe('2025-02-28');
  });

  it('rejects non-existent calendar dates everywhere without silent Date rollover', () => {
    for (const invalid of ['2025-02-29', '2024-04-31', '2024-13-01', '2024-00-10', 'not-a-date']) {
      expect(isValidISODate(invalid)).toBe(false);
      expect(parseISODate(invalid)).toBeNull();
      expect(buildEvent('p-1', { vaccineId: 'bcg', date: invalid }).error).toBe('invalid-date');
      expect(createProfile({ name: 'Test Child', dateOfBirth: invalid }).error).toBe('invalid-dob');
      expect(normaliseDoseRecord(invalid)).toBeNull();
      expect(normaliseProfile({ id: 'p-1', name: 'Test', dateOfBirth: invalid, records: {} })).toBeNull();
      expect(validateCatchUpSchedule('2024-01-01', 'bcg', invalid).code).toBe('invalid-date');
    }

    const readinessBadDate = evaluateScenarioReadiness(['senior'], null, '2025-02-29');
    expect(readinessBadDate.items.length).toBeGreaterThan(0);
    expect(readinessBadDate.items.every((item) => item.latestClinicDate === null)).toBe(true);
  });

  it('clamps future dates of birth cleanly in calendar age and marks isFutureDob', () => {
    const age = calculateCalendarAge('2030-05-01', {
      asOfDate: '2026-03-01',
      timezone: BANGLADESH_TIMEZONE,
    });
    expect(age.isValid).toBe(true);
    expect(age.isFutureDob).toBe(true);
    expect(age.days).toBe(0);
    expect(age.months).toBe(0);
    expect(age.years).toBe(0);
  });
});

describe('Bangladesh (Asia/Dhaka UTC+6) calendar & timezone boundaries', () => {
  it('resolves 20:00Z as next calendar day in Asia/Dhaka vs UTC/New York', () => {
    // 20:00 UTC on 4 March = 02:00 AM on 5 March in Dhaka (UTC+6)
    const boundaryInstant = new Date('2026-03-04T20:00:00.000Z');

    expect(resolveReferenceTodayISO({ timezone: BANGLADESH_TIMEZONE, now: boundaryInstant })).toBe(
      '2026-03-05',
    );

    // Newborn born 2026-03-05 is accepted in Asia/Dhaka mode at 2026-03-04T20:00Z
    const dhakaBirth = createProfile(
      { name: 'Dhaka Newborn', dateOfBirth: '2026-03-05' },
      { timezone: BANGLADESH_TIMEZONE, now: boundaryInstant },
    );
    expect(dhakaBirth.profile?.dateOfBirth).toBe('2026-03-05');

    // BCG dose recorded on 2026-03-05 is accepted in Asia/Dhaka mode
    const built = buildEvent(
      'p-dhaka',
      { vaccineId: 'bcg', date: '2026-03-05', doseNumber: 1 },
      boundaryInstant.toISOString(),
      { timezone: BANGLADESH_TIMEZONE, now: boundaryInstant },
    );
    expect(built.event?.date).toBe('2026-03-05');

    // Scheduled date 2026-03-05 is 'due-today' under Dhaka clock
    expect(
      determineVaccineStatus('2026-03-05', undefined, {
        timezone: BANGLADESH_TIMEZONE,
        now: boundaryInstant,
      }),
    ).toBe('due-today');

    const upcoming48 = findUpcoming48HourDoses(
      [{ id: 'p-1', name: 'Nadia', dateOfBirth: '2026-03-05', events: [] }],
      { timezone: BANGLADESH_TIMEZONE, now: boundaryInstant },
    );
    expect(upcoming48.some((d) => d.vaccineId === 'bcg' && d.scheduledDate === '2026-03-05')).toBe(
      true,
    );
  });
});

describe('Per-dose attribution, progress accounting & anomaly detection', () => {
  it('never marks OPV-2/3/4 complete from OPV-1 alone and distinguishes exact vs provisional progress', () => {
    const dob = '2025-01-01';
    const events: VaccinationEvent[] = [
      makeEvent({ id: 'bcg-1', vaccineId: 'bcg', doseNumber: 1, date: '2025-01-02' }),
      makeEvent({ id: 'opv-1', vaccineId: 'opv', doseNumber: 1, date: '2025-01-02' }),
      // Legacy unnumbered OPV -> provisional slot 2
      makeEvent({
        id: 'opv-prov',
        vaccineId: 'opv',
        doseNumber: null,
        scheduledDoseId: null,
        date: '2025-02-15',
        provenance: 'legacy-migration',
        needsReview: true,
        reviewReason: 'legacy-dose-number-unknown',
      }),
    ];

    const analysis = analyzeSchedule(dob, events, { asOfDate: '2026-06-01' });

    expect(analysis.completedConfirmed.map((d) => d.scheduledDoseId)).toEqual(['bcg#1@0d', 'opv#1@0d']);
    expect(analysis.completedProvisional.map((d) => d.scheduledDoseId)).toEqual(['opv#2@42d']);
    expect(analysis.stats.confirmedCompleted).toBe(2);
    expect(analysis.stats.provisionalCompleted).toBe(1);
    expect(analysis.stats.dueToDateTotal).toBe(analysis.stats.totalScheduled);
    expect(analysis.stats.completedDueToDate).toBe(3);

    const opvCatchUp = analysis.catchUpPlans.find((p) => p.vaccineId === 'opv');
    expect(opvCatchUp?.missedDoses).toEqual([3, 4]);
    expect(opvCatchUp?.requiresReview).toBe(true);
  });

  it('detects duplicates, pre-birth dates, chronological inversions, out-of-range and excess unattributed records without mutating neighbours', () => {
    const dob = '2024-06-01';
    const e1 = makeEvent({ id: 'e-bcg-pre', vaccineId: 'bcg', doseNumber: 1, date: '2024-05-15' });
    const e2 = makeEvent({ id: 'e-opv-2', vaccineId: 'opv', doseNumber: 2, date: '2024-07-01' });
    const e3 = makeEvent({ id: 'e-opv-1', vaccineId: 'opv', doseNumber: 1, date: '2024-07-15' });
    const e4 = makeEvent({ id: 'e-opv-dup', vaccineId: 'opv', doseNumber: 1, date: '2024-07-15' });
    const e5 = makeEvent({ id: 'e-mr-oob', vaccineId: 'mr', doseNumber: 5, date: '2025-04-01' });
    const e6 = makeEvent({
      id: 'e-pcv-u1',
      vaccineId: 'pcv',
      doseNumber: null,
      scheduledDoseId: null,
      date: '2024-07-20',
    });
    const e7 = makeEvent({
      id: 'e-pcv-u2',
      vaccineId: 'pcv',
      doseNumber: 1,
      date: '2024-07-13',
    });
    const e8 = makeEvent({
      id: 'e-pcv-u3',
      vaccineId: 'pcv',
      doseNumber: 2,
      date: '2024-08-10',
    });
    const e9 = makeEvent({
      id: 'e-pcv-u4',
      vaccineId: 'pcv',
      doseNumber: 3,
      date: '2024-09-10',
    });

    const ledger = [e1, e2, e3, e4, e5, e6, e7, e8, e9];
    const anomalies = analyzeDoseHistoryAnomalies(ledger, dob, { asOfDate: '2026-06-01' });
    const types = new Set(anomalies.map((a) => a.type));

    expect(types.has('before-dob')).toBe(true);
    expect(types.has('chronological-inversion')).toBe(true);
    expect(types.has('duplicate-dose-number')).toBe(true);
    expect(types.has('exact-same-visit-duplicate')).toBe(true);
    expect(types.has('dose-number-out-of-range')).toBe(true);
    expect(types.has('excess-unattributed')).toBe(true);

    // Pre-save duplicate check distinguishes same-visit duplicate from same-dose-number conflict
    const sameVisit = checkDuplicateDose(ledger, {
      vaccineId: 'opv',
      date: '2024-07-15',
      doseNumber: 1,
    });
    expect(sameVisit.hasExactSameVisitDuplicate).toBe(true);
    expect(sameVisit.hasSameDoseNumber).toBe(true);

    const diffVisitSameDose = checkDuplicateDose(ledger, {
      vaccineId: 'opv',
      date: '2024-08-20',
      doseNumber: 1,
    });
    expect(diffVisitSameDose.hasExactSameVisitDuplicate).toBe(false);
    expect(diffVisitSameDose.hasSameDoseNumber).toBe(true);

    // Historical correction preserves id, createdAt, stamps updatedAt, and leaves siblings untouched
    const corrected = updateEvent([e2, e3], 'e-opv-2', { date: '2024-08-10' }, '2026-06-02T10:00:00.000Z');
    const updatedRow = corrected.find((e) => e.id === 'e-opv-2')!;
    const untouchedRow = corrected.find((e) => e.id === 'e-opv-1')!;
    expect(updatedRow.date).toBe('2024-08-10');
    expect(updatedRow.createdAt).toBe(e2.createdAt);
    expect(updatedRow.updatedAt).toBe('2026-06-02T10:00:00.000Z');
    expect(untouchedRow).toBe(e3);
  });

  it('tracks off-schedule records and age-eligible percentage accurately for a young infant', () => {
    // Born 2026-03-01, checked on 2026-03-10 (9 days old -> only birth doses BCG & OPV-0 are due)
    const dob = '2026-03-01';
    const events: VaccinationEvent[] = [
      makeEvent({ id: 'bcg-1', vaccineId: 'bcg', doseNumber: 1, date: '2026-03-01' }),
      makeEvent({ id: 'flu-1', vaccineId: 'influenza', doseNumber: 1, date: '2026-03-08' }),
    ];

    const stats = calculateVaccinationStats(dob, events, { asOfDate: '2026-03-10' });
    expect(stats.dueToDateTotal).toBe(2); // bcg + opv dose 1
    expect(stats.completedDueToDate).toBe(1); // bcg only
    expect(stats.ageEligibleProgressPercentage).toBe(50);
    expect(stats.offScheduleDosesRecorded).toBe(1); // influenza not in national routine milestones
    expect(stats.dosesRecorded).toBe(2);
  });
});

describe('Medical safety boundaries, catch-up limits & reminders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('never invents minimum intervals or catch-up dates and flags C-005, C-006 and 7+ age caveat', () => {
    const dobOlderChild = '2016-01-01';
    const plans = generateCatchUpPlan(dobOlderChild, {}, { asOfDate: '2026-03-01' });

    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.minimumInterval).toBeNull();
      expect(plan.recommendedNextDate).toBeNull();
      expect(plan.intervalSource).toBe('none');
      expect(plan.requiresMedicalAdvice).toBe(true);
      expect(plan.conflictIds).toContain('C-005');
      expect(plan.olderAgeCaveat).toBe(true);
      expect(plan.explanation.en).toContain('TikaTrack does not recommend a date');
      expect(plan.explanation.en).toContain('aged 7+ years');
    }

    const tcvPlan = plans.find((p) => p.vaccineId === 'tcv');
    expect(tcvPlan?.conflictIds).toEqual(['C-005', 'C-006']);

    const schedule = generatePersonalizedSchedule('2024-02-29', {}, { asOfDate: '2026-03-01' });
    const mr1 = schedule.find((d) => d.scheduledDoseId === 'mr#1@270d');
    expect(mr1?.calculationBasis).toBe('age-months');
    expect(mr1?.scheduledDate).toBe('2024-11-29');

    // validateCatchUpSchedule checks 9m MR-1 against 2024-11-29 (not 270 days = 2024-11-25)
    const tooEarlyForCalendarMonth = validateCatchUpSchedule(
      '2024-02-29',
      'mr',
      '2024-11-26',
      {},
      1,
      { asOfDate: '2024-06-01' },
    );
    expect(tooEarlyForCalendarMonth.code).toBe('too-young');
  });

  it('skips reminders for already-completed doses even if scheduled milestone date is still in the future', () => {
    const dob = '2026-01-01';
    // 6-week OPV-1 (opv#2@42d, target 2026-02-12) administered early on 2026-02-01
    const earlyEvents = [
      makeEvent({ id: 'opv-early-2', vaccineId: 'opv', doseNumber: 2, date: '2026-02-01' }),
    ];

    const reminders = generateReminders(
      'p-1',
      dob,
      earlyEvents,
      {
        ...DEFAULT_REMINDER_PREFERENCES,
        daysBefore: [7, 2, 1],
        onDueDate: true,
        onOverdue: false,
      },
      { asOfDate: '2026-02-03' },
    );

    const opv2Reminders = reminders.filter((r) => r.scheduledDoseId === 'opv#2@42d');
    expect(opv2Reminders).toHaveLength(0);
  });

  it('uses doseLabel in notification title and does not crash or suppress on malformed quiet hours', async () => {
    const today = resolveReferenceTodayISO({ timezone: 'local' });
    const notificationSpy = vi.fn();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(notificationSpy, {
        permission: 'granted',
        requestPermission: vi.fn(async () => 'granted'),
      }),
    });

    saveReminders([
      {
        id: 'rem-dose-specific',
        profileId: 'p-1',
        vaccineId: 'opv',
        doseNumber: 2,
        scheduledDoseId: 'opv#2@42d',
        doseLabel: { en: 'OPV-1', bn: 'ওপিভি-১' },
        scheduledDate: today,
        reminderDate: today,
        reminderType: 'on-due',
        daysBefore: 0,
        sent: false,
        acknowledged: false,
      },
    ]);

    const result = await processDueReminders(
      [{ id: 'p-1', name: 'Asha', dateOfBirth: '2026-01-01' }],
      {
        ...DEFAULT_REMINDER_PREFERENCES,
        browserNotifications: true,
        quietHoursStart: 'bad:xx',
        quietHoursEnd: '07:00',
      },
      'en',
    );

    expect(result.sent).toBe(1);
    expect(notificationSpy).toHaveBeenCalledWith(
      'Vaccination Reminder: OPV-1',
      expect.objectContaining({ tag: 'rem-dose-specific' }),
    );
  });
});

describe('Scheduling UI upgrades (SmartTracker & ScheduleTimeline)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('renders Schedule Intelligence & Clinical Limitations breakdown, detects anomalies, and shows older-age catch-up caveat', async () => {
    const user = userEvent.setup();
    const created = createProfile({
      name: 'Tariq Karim',
      dateOfBirth: '2016-05-01',
      relationship: 'child',
    });
    if (!created.profile) throw new Error('Failed to seed profile');

    // Add pre-DOB dose and chronological inversion (OPV-2 before OPV-1)
    let profiles = [created.profile];
    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'bcg',
      doseNumber: 1,
      date: '2016-04-20',
    }).profiles;
    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'opv',
      doseNumber: 2,
      date: '2016-06-01',
    }).profiles;
    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'opv',
      doseNumber: 1,
      date: '2016-06-20',
    }).profiles;
    writeJSON(STORAGE_KEYS.profiles, profiles);

    window.history.pushState({}, '', '/tracker');
    render(<App />);

    await waitFor(() => expect(screen.getAllByText('Tariq Karim').length).toBeGreaterThan(0));

    // Overview shows the Schedule Intelligence & Clinical Limitations card
    expect(screen.getByText(en['tracker.intelligence.title'])).toBeTruthy();

    // Expand clinical breakdown and verify HCW review & C-005/C-006 boundaries
    await user.click(screen.getByRole('button', { name: en['tracker.intelligence.toggleDetails'] }));
    expect(screen.getByText(en['tracker.intelligence.hcwListTitle'])).toBeTruthy();
    expect(screen.getByText(en['tracker.intelligence.anomalyListTitle'])).toBeTruthy();
    expect(screen.getByText(/No automated catch-up dates or minimum intervals \(Conflict C-005\)/)).toBeTruthy();

    // Rejects invalid calendar DOB when editing profile
    await user.click(screen.getByRole('button', { name: en['tracker.member.edit'] }));
    const dobInput = document.getElementById('edit-member-dob') as HTMLInputElement;
    fireEvent.change(dobInput, { target: { value: '2025-02-29' } });
    await user.click(screen.getByRole('button', { name: en['tracker.member.editSave'] }));
    expect(await screen.findByText(en['tracker.add.error.invalid-dob'])).toBeTruthy();
    await user.click(screen.getByRole('button', { name: en['tracker.cancel'] }));

    // Catch-Up tab shows 7+ age eligibility caveat and never shows invented interval
    await user.click(screen.getByRole('tab', { name: en['tracker.catchup'] }));
    expect(await screen.findAllByText(en['tracker.catchUp.olderAgeNote'])).not.toHaveLength(0);
    expect(screen.getAllByText(/No minimum interval between doses is registered for Bangladesh.*C-005/).length).toBeGreaterThan(0);
  });

  it('computes leap-day 9m target date accurately on ScheduleTimeline and rejects future custom DOB', async () => {
    window.history.pushState({}, '', '/schedule');
    render(<App />);
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    const dobInput = document.getElementById('schedule-dob-input') as HTMLInputElement;
    fireEvent.change(dobInput, { target: { value: '2024-02-29' } });

    // 9-month MR-1 uses clamped calendar months: 2024-02-29 -> 2024-11-29 (29 November 2024)
    expect(await screen.findByText(/29 November 2024/)).toBeTruthy();
    expect(screen.getAllByText(/Calculated by calendar months \(9m\)/).length).toBeGreaterThan(0);

    // Future calendar DOB renders explicit validation alert
    fireEvent.change(dobInput, { target: { value: '2030-01-01' } });
    expect(await screen.findByText(en['schedule.invalidDob'])).toBeTruthy();
  });
});
