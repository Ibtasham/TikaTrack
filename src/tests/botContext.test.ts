import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildBotContext,
  relativeDays,
  renderBotContext,
  shouldPersonalise,
} from '../lib/botContext';
import { formatAge, formatDate, todayISO } from '../lib/format';
import { MILESTONE_DOSES, SCHEDULE_VERSION, seriesIdFor } from '../lib/doseLedger';
import { calculateScheduledDate } from '../lib/smartScheduler';
import type { DoseRecord, Profile, VaccinationEvent } from '../types';

/**
 * A fixed "today" so every expectation below is exact rather than relative to
 * whenever the suite happens to run. 06:00Z is the same calendar date in Dhaka
 * (UTC+6), New York (UTC−5) and Kiritimati (UTC+14), which is what CI checks.
 */
const TODAY = new Date('2026-11-12T06:00:00Z');

function records(...ids: Array<[string, string]>): Record<string, DoseRecord> {
  return Object.fromEntries(ids.map(([id, date]) => [id, { date }]));
}

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    name: 'Ayesha',
    dateOfBirth: '2026-07-12', // 4 months old on TODAY
    records: {},
    ...overrides,
  };
}

/**
 * The 2.x shape for the same child: one record per vaccine.
 *
 * Kept because it is what an upgrading user actually has, and because it is the
 * fixture that proves a single record no longer completes a whole series.
 */
const ALL_RECORDED = records(
  ['bcg', '2026-07-13'],
  ['opv', '2026-10-19'],
  ['pentavalent', '2026-10-19'],
  ['pcv', '2026-10-19'],
  ['mr', '2027-04-09'],
  ['tcv', '2027-10-06'],
);

/** Every milestone dose recorded with its real dose number: a complete ledger. */
const FULL_LEDGER: VaccinationEvent[] = MILESTONE_DOSES.map((milestone, index) => ({
  id: `dose-full-${index}`,
  profileId: 'profile-1',
  vaccineId: milestone.vaccineId,
  scheduleVersion: SCHEDULE_VERSION,
  seriesId: seriesIdFor(milestone.vaccineId),
  doseNumber: milestone.doseNumber,
  scheduledDoseId: milestone.scheduledDoseId,
  date: calculateScheduledDate('2026-07-12', milestone.ageDays, milestone.ageMonths),
  createdAt: '2026-11-01T00:00:00.000Z',
  provenance: 'manual',
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('shouldPersonalise', () => {
  it.each([
    'When is the next dose due?',
    'what is the schedule for a 4 month old',
    'my child missed a vaccine',
    'catch-up plan please',
    'how many doses of pentavalent',
    'আমার শিশুর পরবর্তী টিকা কবে?',
    'টিকার সময়সূচি কী',
  ])('attaches the record to %s', (query) => {
    expect(shouldPersonalise(query)).toBe(true);
  });

  it.each([
    'what are the side effects of BCG',
    'is the measles vaccine safe',
    'where is the nearest centre',
    '',
    '   ',
  ])('leaves %s to the sourced answer alone', (query) => {
    expect(shouldPersonalise(query)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(shouldPersonalise('WHEN IS IT DUE')).toBe(true);
  });
});

describe('relativeDays', () => {
  it.each([
    [0, 'en', 'today'],
    [1, 'en', 'in 1 day'],
    [12, 'en', 'in 12 days'],
    [-1, 'en', '1 day ago'],
    [-40, 'en', '40 days ago'],
    [0, 'bn', 'আজ'],
    [1, 'bn', '১ দিন পরে'],
    [12, 'bn', '১২ দিন পরে'],
    [-40, 'bn', '৪০ দিন আগে'],
  ])('renders %s days in %s as %s', (days, language, expected) => {
    expect(relativeDays(days as number, language as 'en' | 'bn')).toBe(expected);
  });
});

describe('buildBotContext', () => {
  it('summarises a partially completed schedule', () => {
    const context = buildBotContext(
      profile({
        records: records(
          ['bcg', '2026-07-13'],
          ['opv', '2026-10-19'],
          ['pentavalent', '2026-10-19'],
          ['pcv', '2026-10-19'],
        ),
      }),
      'en',
    );

    expect(context).not.toBeNull();
    expect(context?.memberName).toBe('Ayesha');
    expect(context?.ageText).toBe(formatAge('2026-07-12', 'en'));
    expect(context?.asOf).toBe(todayISO());
    // Four records, four doses — not eleven. Under the 2.x single-slot record
    // these same four entries marked every OPV, Pentavalent and PCV milestone
    // complete (11 of 14, 79%), which is the bug the dose ledger fixes: the
    // remaining seven doses are now reported as overdue.
    expect(context?.completed).toBe(4);
    expect(context?.totalScheduled).toBe(16);
    expect(context?.progressPercentage).toBe(25);
    expect(context?.nextDue?.vaccine).toBe('MR-1');
    expect(context?.nextDue?.isoDate).toBe('2027-04-12');
    expect(context?.nextDue?.daysText).toBe('in 151 days');
    expect(context?.overdue.map((dose) => dose.vaccine)).toEqual([
      'OPV-1',
      'fIPV-1',
      'Pentavalent-2',
      'OPV-2',
      'PCV-2',
      'Pentavalent-3',
      'OPV-3',
      'PCV-3',
      'fIPV-2',
    ]);
    expect(context?.dueToday).toEqual([]);
  });

  it('uses the milestone dose name, not the generic vaccine name', () => {
    const context = buildBotContext(profile({ records: records(['bcg', '2026-07-13']) }), 'en');
    const labels = context?.overdue.map((dose) => dose.vaccine) ?? [];

    expect(labels).toContain('OPV-0');
    expect(labels).toContain('Pentavalent-1');
    expect(labels).toContain('Pentavalent-3');
    expect(labels).not.toContain('Pentavalent');
  });

  it('lists the most overdue dose first and says how long ago it was due', () => {
    const context = buildBotContext(profile({ records: {} }), 'en');

    expect(context?.overdue.length).toBe(13);
    expect(context?.overdue[0].isoDate).toBe('2026-07-12');
    expect(context?.overdue[0].days).toBe(-123);
    expect(context?.overdue[0].daysText).toBe('123 days ago');
    // Ascending daysUntilDue = oldest first, newest overdue last.
    const days = context?.overdue.map((dose) => dose.days) ?? [];
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('flags a dose that falls due today', () => {
    // 9 calendar months before 2026-11-12 puts the MR-1 milestone on TODAY.
    const context = buildBotContext(profile({ dateOfBirth: '2026-02-12', records: {} }), 'en');

    expect(context?.dueToday.map((dose) => dose.vaccine)).toContain('MR-1');
    expect(context?.dueToday[0].days).toBe(0);
    expect(context?.dueToday[0].daysText).toBe('today');
    // A dose due today is not also listed as "next due".
    expect(context?.nextDue?.vaccine).toBe('MR-1');
  });

  it('reports nothing outstanding when every dose is recorded', () => {
    const context = buildBotContext(profile({ events: FULL_LEDGER }), 'en');

    expect(context?.completed).toBe(16);
    expect(context?.nextDue).toBeNull();
    expect(context?.overdue).toEqual([]);
    expect(context?.dueToday).toEqual([]);
  });

  it('counts one dose per legacy record, never a whole series', () => {
    // Six 2.x records for a child whose schedule has 16 milestone doses. BCG and
    // TCV are single-dose, so their records do complete them; OPV, Pentavalent,
    // PCV, fIPV and MR are not, and one record each cannot cover the rest.
    const context = buildBotContext(profile({ records: ALL_RECORDED }), 'en');

    expect(context?.completed).toBe(6);
    expect(context?.totalScheduled).toBe(16);
    expect(context?.progressPercentage).toBe(38);
  });

  it('refuses to guess without a date of birth', () => {
    expect(buildBotContext(profile({ dateOfBirth: '' }), 'en')).toBeNull();
  });

  it('localises vaccine names for Bangla', () => {
    const context = buildBotContext(
      profile({
        records: records(
          ['bcg', '2026-07-13'],
          ['opv', '2026-10-19'],
          ['pentavalent', '2026-10-19'],
          ['pcv', '2026-10-19'],
        ),
      }),
      'bn',
    );

    expect(context?.nextDue?.vaccine).toBe('এমআর-১');
    expect(context?.ageText).toBe(formatAge('2026-07-12', 'bn'));
  });

  it('is stable across time zones for the same calendar day', () => {
    const originalTz = process.env.TZ;
    const build = () => buildBotContext(profile({ records: {} }), 'en')?.nextDue?.isoDate;

    process.env.TZ = 'UTC';
    const utc = build();
    process.env.TZ = 'Asia/Dhaka';
    const dhaka = build();
    process.env.TZ = 'America/New_York';
    const newYork = build();
    process.env.TZ = originalTz;

    expect(dhaka).toBe(utc);
    expect(newYork).toBe(utc);
  });
});

describe('renderBotContext', () => {
  const partial = () =>
    buildBotContext(
      profile({
        records: records(
          ['bcg', '2026-07-13'],
          ['opv', '2026-10-19'],
          ['pentavalent', '2026-10-19'],
          ['pcv', '2026-10-19'],
        ),
      }),
      'en',
    )!;

  it('labels the block as coming from this device', () => {
    const text = renderBotContext(partial(), 'en');

    expect(text).toContain("From Ayesha's record on this device");
    expect(text).toContain('Age:');
    expect(text).toContain('Doses recorded: 4 of 16');
    expect(text).toContain('Next due: MR-1 — 12 April 2027 (in 151 days)');
    expect(text).toContain(`Calculated ${formatDate(todayISO(), 'en')}`);
  });

  it('collapses a long overdue list', () => {
    const text = renderBotContext(buildBotContext(profile({ records: {} }), 'en')!, 'en');

    expect(text).toContain('Overdue: BCG (123 days ago)');
    expect(text).toContain('+10 more');
    // Only the first three are named, so the message stays readable.
    expect(text.match(/\(\d+ days? ago\)/g)).toHaveLength(3);
  });

  it('says so when nothing is outstanding', () => {
    const text = renderBotContext(buildBotContext(profile({ events: FULL_LEDGER }), 'en')!, 'en');
    expect(text).toContain('Nothing outstanding in the national schedule');
    expect(text).not.toContain('Next due');
  });

  it('mentions a dose due today', () => {
    const text = renderBotContext(
      buildBotContext(profile({ dateOfBirth: '2026-02-12' }), 'en')!,
      'en',
    );
    expect(text).toContain('Due today: MR-1');
  });

  it('renders the same facts in Bangla with Bangla digits', () => {
    const context = buildBotContext(
      profile({
        records: records(
          ['bcg', '2026-07-13'],
          ['opv', '2026-10-19'],
          ['pentavalent', '2026-10-19'],
          ['pcv', '2026-10-19'],
        ),
      }),
      'bn',
    )!;
    const text = renderBotContext(context, 'bn');

    expect(text).toContain('এই ডিভাইসে সংরক্ষিত Ayesha-এর তথ্য থেকে');
    expect(text).toContain('টিকা দেওয়া হয়েছে: ১৬টির মধ্যে ৪টি');
    expect(text).toContain('পরবর্তী টিকা: এমআর-১');
    expect(text).toContain('১৫১ দিন পরে');
    expect(text).not.toMatch(/\b10 of 16\b/);
  });

  it('is plain text with one fact per line', () => {
    const lines = renderBotContext(partial(), 'en').split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines.filter((line) => line.startsWith('•')).length).toBeGreaterThanOrEqual(3);
    expect(renderBotContext(partial(), 'en')).not.toContain('<');
  });
});
