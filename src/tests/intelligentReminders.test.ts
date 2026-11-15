import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  daysBetween,
  parseISODate,
  startOfToday,
  toISODate,
  todayISO,
  addDays,
} from '../lib/format';
import {
  clearRemindersForProfile,
  DEFAULT_REMINDER_PREFERENCES,
  generateReminders,
  getOverdueReminders,
  getRemindersDueToday,
  getReminderStatistics,
  hasNotificationBeenSent,
  loadReminderPreferences,
  loadReminders,
  markReminderAsAcknowledged,
  markReminderAsSent,
  processDueReminders,
  reminderAlarmOffsets,
  saveReminderPreferences,
  saveReminders,
  sendBrowserNotification,
  updateRemindersForProfile,
  type Reminder,
  type ReminderPreferences,
} from '../lib/intelligentReminders';

const REMINDERS_KEY = 'tikatrack-reminders';
const PREFERENCES_KEY = 'tikatrack-reminder-preferences';
const SENT_KEY = 'tikatrack-sent-notifications';

/** Preferences that never suppress a notification, whatever the clock says. */
const ALWAYS_ON: ReminderPreferences = {
  ...DEFAULT_REMINDER_PREFERENCES,
  quietHoursStart: '00:00',
  quietHoursEnd: '00:00',
};

const ORIGINAL_TZ = process.env.TZ;

/** Run a callback with `process.env.TZ` pinned (Node honours this dynamically). */
function inTimezone(tz: string, run: () => void): void {
  process.env.TZ = tz;
  try {
    run();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A quiet-hours window guaranteed to contain the current local minute. */
function quietHoursCoveringNow(): { start: string; end: string } {
  const now = new Date();
  const centre = now.getHours() * 60 + now.getMinutes();
  const format = (minutes: number) => {
    const wrapped = ((minutes % 1440) + 1440) % 1440;
    return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
  };
  return { start: format(centre - 5), end: format(centre + 5) };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: `rem-${Math.random().toString(36).slice(2)}`,
    profileId: 'p1',
    vaccineId: 'bcg',
    scheduledDate: '2026-04-01',
    reminderDate: todayISO(),
    reminderType: 'before-due',
    daysBefore: 7,
    sent: false,
    acknowledged: false,
    ...overrides,
  };
}

/** A minimal Notification stand-in; jsdom does not implement the real one. */
function installFakeNotification(permission: NotificationPermission = 'granted') {
  const constructed: Array<{ title: string; options: NotificationOptions }> = [];
  const requestPermission = vi.fn().mockResolvedValue(permission);

  class FakeNotification {
    static permission = permission;
    static requestPermission = requestPermission;
    constructor(
      public title: string,
      public options: NotificationOptions = {},
    ) {
      constructed.push({ title, options });
    }
  }

  Object.defineProperty(window, 'Notification', {
    value: FakeNotification,
    configurable: true,
    writable: true,
  });
  return { constructed, requestPermission };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).Notification;
  process.env.TZ = ORIGINAL_TZ;
});

describe('reminder preferences', () => {
  it('ships sane defaults', () => {
    expect(DEFAULT_REMINDER_PREFERENCES).toMatchObject({
      enabled: true,
      daysBefore: [7, 3, 1],
      onDueDate: true,
      onOverdue: true,
      browserNotifications: false,
    });
  });

  it('returns the defaults when nothing is stored', () => {
    expect(loadReminderPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });

  it('merges a partial stored preference over the defaults', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ daysBefore: [14], enabled: false }));
    expect(loadReminderPreferences()).toMatchObject({
      daysBefore: [14],
      enabled: false,
      onDueDate: true, // inherited
    });
  });

  it('falls back to the defaults on corrupt JSON', () => {
    localStorage.setItem(PREFERENCES_KEY, '{oops');
    expect(loadReminderPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });

  it('round-trips through storage', () => {
    const prefs = { ...ALWAYS_ON, overdueInterval: 5 };
    saveReminderPreferences(prefs);
    expect(loadReminderPreferences()).toEqual(prefs);
  });
});

describe('reminder persistence', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadReminders()).toEqual([]);
  });

  it('returns an empty list on corrupt JSON rather than throwing', () => {
    localStorage.setItem(REMINDERS_KEY, '[{broken');
    expect(loadReminders()).toEqual([]);
  });

  it('round-trips reminders', () => {
    const reminders = [makeReminder(), makeReminder({ profileId: 'p2' })];
    saveReminders(reminders);
    expect(loadReminders()).toEqual(reminders);
  });
});

describe('generateReminders', () => {
  // Born 100 days ago: the birth doses are overdue, later milestones upcoming.
  const dob = toISODate(addDays(startOfToday(), -100));

  it('generates nothing when reminders are disabled', () => {
    expect(generateReminders('p1', dob, {}, { ...ALWAYS_ON, enabled: false })).toEqual([]);
  });

  it('creates before-due reminders exactly daysBefore ahead of each dose', () => {
    const reminders = generateReminders('p1', dob, {}, ALWAYS_ON);
    const beforeDue = reminders.filter((r) => r.reminderType === 'before-due');
    expect(beforeDue.length).toBeGreaterThan(0);

    for (const reminder of beforeDue) {
      const scheduled = parseISODate(reminder.scheduledDate)!;
      const reminderDate = parseISODate(reminder.reminderDate)!;
      // The calendar gap must equal the requested lead time, in every timezone.
      expect(daysBetween(reminderDate, scheduled)).toBe(reminder.daysBefore);
      expect(ALWAYS_ON.daysBefore).toContain(reminder.daysBefore);
      // Never in the past — those would be noise.
      expect(reminderDate.getTime()).toBeGreaterThanOrEqual(startOfToday().getTime());
    }
  });

  it('creates on-due reminders on the scheduled date itself', () => {
    const reminders = generateReminders('p1', dob, {}, ALWAYS_ON);
    const onDue = reminders.filter((r) => r.reminderType === 'on-due');
    expect(onDue.length).toBeGreaterThan(0);
    for (const reminder of onDue) {
      expect(reminder.reminderDate).toBe(reminder.scheduledDate);
      expect(reminder.daysBefore).toBe(0);
    }
  });

  it('creates overdue reminders for missed doses, scheduled overdueInterval ahead', () => {
    const reminders = generateReminders('p1', dob, {}, ALWAYS_ON);
    const overdue = reminders.filter((r) => r.reminderType === 'overdue');
    expect(overdue.length).toBeGreaterThan(0);

    for (const reminder of overdue) {
      expect(reminder.reminderDate).toBe(
        toISODate(addDays(startOfToday(), ALWAYS_ON.overdueInterval)),
      );
      // daysBefore is negative for overdue doses: how long ago it was due.
      expect(reminder.daysBefore).toBeLessThan(0);
      expect(reminder.daysBefore).toBe(
        -daysBetween(parseISODate(reminder.scheduledDate)!, startOfToday()),
      );
    }
  });

  it('suppresses reminders for doses already recorded', () => {
    const open = generateReminders('p1', dob, {}, ALWAYS_ON);
    expect(open.some((r) => r.vaccineId === 'bcg')).toBe(true);

    const recorded = generateReminders('p1', dob, { bcg: { date: dob } }, ALWAYS_ON);
    expect(recorded.some((r) => r.vaccineId === 'bcg')).toBe(false);
  });

  it('stamps every reminder with the profile and unique ids', () => {
    const reminders = generateReminders('profile-42', dob, {}, ALWAYS_ON);
    expect(reminders.every((r) => r.profileId === 'profile-42')).toBe(true);
    expect(new Set(reminders.map((r) => r.id)).size).toBe(reminders.length);
    expect(reminders.every((r) => !r.sent && !r.acknowledged)).toBe(true);
  });

  it('respects a custom daysBefore list', () => {
    const reminders = generateReminders('p1', dob, {}, { ...ALWAYS_ON, daysBefore: [14] });
    const leadTimes = new Set(
      reminders.filter((r) => r.reminderType === 'before-due').map((r) => r.daysBefore),
    );
    expect([...leadTimes]).toEqual([14]);
  });

  it('skips on-due and overdue reminders when those toggles are off', () => {
    const reminders = generateReminders(
      'p1',
      dob,
      {},
      {
        ...ALWAYS_ON,
        onDueDate: false,
        onOverdue: false,
      },
    );
    expect(reminders.every((r) => r.reminderType === 'before-due')).toBe(true);
  });

  it('schedules the same calendar dates in every timezone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T20:00:00Z'));

    const perTimezone = ['UTC', 'Asia/Dhaka', 'America/New_York', 'Pacific/Kiritimati'].map(
      (tz) => {
        let pairs: string[] = [];
        let leadTimes: number[] = [];

        inTimezone(tz, () => {
          const reminders = generateReminders('p1', '2026-01-01', {}, ALWAYS_ON);
          expect(reminders.length).toBeGreaterThan(0);

          // Which doses are scheduled, and when, is pure calendar arithmetic
          // from the date of birth — it must not depend on the timezone.
          pairs = [...new Set(reminders.map((r) => `${r.vaccineId}|${r.scheduledDate}`))].sort();

          // Every "before due" reminder sits exactly daysBefore ahead of its dose.
          leadTimes = reminders
            .filter((r) => r.reminderType === 'before-due')
            .map((r) => daysBetween(parseISODate(r.reminderDate)!, parseISODate(r.scheduledDate)!));

          // Overdue lead times *are* relative to the local today, so check them
          // for self-consistency rather than for equality across timezones.
          for (const r of reminders.filter((item) => item.reminderType === 'overdue')) {
            expect(r.daysBefore).toBe(-daysBetween(parseISODate(r.scheduledDate)!, startOfToday()));
          }
        });

        return { tz, pairs, leadTimes };
      },
    );

    for (const { tz, pairs, leadTimes } of perTimezone) {
      expect(pairs, tz).toEqual(perTimezone[0].pairs);
      expect(leadTimes.length, tz).toBeGreaterThan(0);
      expect(
        leadTimes.every((days) => ALWAYS_ON.daysBefore.includes(days)),
        tz,
      ).toBe(true);
    }
  });
});

describe('querying reminders', () => {
  it('finds reminders due today, excluding sent ones', () => {
    const due = makeReminder({ reminderDate: todayISO() });
    const sent = makeReminder({ reminderDate: todayISO(), sent: true });
    const tomorrow = makeReminder({ reminderDate: toISODate(addDays(startOfToday(), 1)) });
    const yesterday = makeReminder({ reminderDate: toISODate(addDays(startOfToday(), -1)) });

    expect(getRemindersDueToday([due, sent, tomorrow, yesterday])).toEqual([due]);
  });

  it('treats "due today" as the *local* calendar day', () => {
    // At 2026-03-04T20:00Z it is already 02:00 on 5 March in Dhaka, while New
    // York is still on 4 March. The old UTC-based comparison got "today" wrong
    // in both directions.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T20:00:00Z'));

    inTimezone('Asia/Dhaka', () => {
      expect(todayISO()).toBe('2026-03-05');
      const due = makeReminder({ reminderDate: '2026-03-05' });
      expect(getRemindersDueToday([due])).toEqual([due]);
    });

    inTimezone('America/New_York', () => {
      expect(todayISO()).toBe('2026-03-04');
      const due = makeReminder({ reminderDate: '2026-03-04' });
      const notDue = makeReminder({ reminderDate: '2026-03-05' });
      expect(getRemindersDueToday([due, notDue])).toEqual([due]);
    });
  });

  it('finds overdue reminders, ignoring sent and unparseable entries', () => {
    const overdue = makeReminder({ reminderDate: toISODate(addDays(startOfToday(), -3)) });
    const sentOverdue = makeReminder({
      reminderDate: toISODate(addDays(startOfToday(), -3)),
      sent: true,
    });
    const today = makeReminder({ reminderDate: todayISO() });
    const broken = makeReminder({ reminderDate: 'not-a-date' });

    expect(getOverdueReminders([overdue, sentOverdue, today, broken])).toEqual([overdue]);
  });
});

describe('sent / acknowledged tracking', () => {
  it('marks a reminder sent and records the notification id', () => {
    const reminder = makeReminder({ scheduledDate: '2026-05-01', reminderDate: '2026-04-24' });
    saveReminders([reminder]);

    expect(hasNotificationBeenSent(reminder)).toBe(false);
    markReminderAsSent(reminder.id);

    const [stored] = loadReminders();
    expect(stored.sent).toBe(true);
    expect(stored.sentAt).toBeTruthy();
    expect(hasNotificationBeenSent(stored)).toBe(true);
  });

  it('dedupes on profile+vaccine+date+type, not on the random id', () => {
    const first = makeReminder({ id: 'a', reminderDate: '2026-04-24' });
    saveReminders([first]);
    markReminderAsSent('a');

    // A regenerated reminder for the same dose/date has a different id but the
    // same notification identity, so it must still count as sent.
    const regenerated = makeReminder({ id: 'b', reminderDate: '2026-04-24' });
    expect(hasNotificationBeenSent(regenerated)).toBe(true);
  });

  it('ignores an unknown reminder id', () => {
    saveReminders([makeReminder({ id: 'keep' })]);
    expect(() => markReminderAsSent('nope')).not.toThrow();
    expect(loadReminders()[0].sent).toBe(false);
  });

  it('marks a reminder acknowledged', () => {
    const reminder = makeReminder({ id: 'ack-me' });
    saveReminders([reminder]);

    markReminderAsAcknowledged('ack-me');

    const [stored] = loadReminders();
    expect(stored.acknowledged).toBe(true);
    expect(stored.acknowledgedAt).toBeTruthy();
  });

  it('caps the sent-notification log', () => {
    for (let i = 0; i < 1200; i += 1) {
      saveReminders([makeReminder({ id: `r${i}`, reminderDate: `2026-04-${pad((i % 28) + 1)}` })]);
      markReminderAsSent(`r${i}`);
    }
    const logged: string[] = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]');
    expect(logged.length).toBeLessThanOrEqual(1000);
  });
});

describe('getReminderStatistics', () => {
  it('counts totals, sent, pending, acknowledged and by type', () => {
    const stats = getReminderStatistics([
      makeReminder({ reminderType: 'before-due', sent: true }),
      makeReminder({ reminderType: 'on-due', acknowledged: true }),
      makeReminder({ reminderType: 'overdue' }),
    ]);

    expect(stats).toEqual({
      total: 3,
      sent: 1,
      pending: 2,
      acknowledged: 1,
      byType: { beforeDue: 1, onDue: 1, overdue: 1 },
    });
  });

  it('reports zeros for an empty list', () => {
    expect(getReminderStatistics([])).toEqual({
      total: 0,
      sent: 0,
      pending: 0,
      acknowledged: 0,
      byType: { beforeDue: 0, onDue: 0, overdue: 0 },
    });
  });
});

describe('processDueReminders', () => {
  const profiles = [{ id: 'p1', name: 'Ayesha', dateOfBirth: '2026-01-01' }];

  it('does nothing when reminders are disabled', async () => {
    saveReminders([makeReminder()]);
    await expect(processDueReminders(profiles, { ...ALWAYS_ON, enabled: false })).resolves.toEqual({
      sent: 0,
      skipped: 0,
    });
  });

  it('does nothing during quiet hours', async () => {
    saveReminders([makeReminder()]);
    const { start, end } = quietHoursCoveringNow();
    await expect(
      processDueReminders(profiles, { ...ALWAYS_ON, quietHoursStart: start, quietHoursEnd: end }),
    ).resolves.toEqual({ sent: 0, skipped: 0 });
  });

  it('marks a due reminder sent, then skips it as a duplicate', async () => {
    saveReminders([makeReminder({ vaccineId: 'bcg' })]);

    await expect(processDueReminders(profiles, ALWAYS_ON)).resolves.toEqual({
      sent: 1,
      skipped: 0,
    });
    expect(loadReminders()[0].sent).toBe(true);

    // Regenerated (unsent) reminder for the same dose/date: dedupe must catch it.
    saveReminders([makeReminder({ vaccineId: 'bcg', sent: false })]);
    await expect(processDueReminders(profiles, ALWAYS_ON)).resolves.toEqual({
      sent: 0,
      skipped: 1,
    });
  });

  it('ignores reminders whose profile no longer exists', async () => {
    saveReminders([makeReminder({ profileId: 'ghost' })]);
    await expect(processDueReminders(profiles, ALWAYS_ON)).resolves.toEqual({
      sent: 0,
      skipped: 0,
    });
  });

  it('ignores reminders for an unknown vaccine', async () => {
    saveReminders([makeReminder({ vaccineId: 'not-a-real-vaccine' })]);
    await expect(processDueReminders(profiles, ALWAYS_ON)).resolves.toEqual({
      sent: 0,
      skipped: 0,
    });
  });

  it('counts a blocked browser notification as skipped', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveReminders([makeReminder()]);
    // jsdom has no Notification at all -> sendBrowserNotification returns false.
    await expect(
      processDueReminders(profiles, { ...ALWAYS_ON, browserNotifications: true }),
    ).resolves.toEqual({ sent: 0, skipped: 1 });
    expect(loadReminders()[0].sent).toBe(false);
  });

  it('sends a browser notification in the chosen language when permitted', async () => {
    const fake = installFakeNotification('granted');
    saveReminders([makeReminder({ vaccineId: 'bcg', reminderType: 'on-due' })]);

    await expect(
      processDueReminders(profiles, { ...ALWAYS_ON, browserNotifications: true }, 'bn'),
    ).resolves.toEqual({ sent: 1, skipped: 0 });

    expect(fake.constructed).toHaveLength(1);
    expect(fake.constructed[0].title).toContain('টিকাদান রিমাইন্ডার');
    expect(fake.constructed[0].options.body).toContain('Ayesha');
    // Regression: this used to point at /vaccine-icon.png, which does not exist.
    expect(fake.constructed[0].options.icon).toContain('icons/icon-192.png');
  });

  it('sends an English notification by default', async () => {
    const fake = installFakeNotification('granted');
    saveReminders([makeReminder({ vaccineId: 'bcg' })]);

    await processDueReminders(profiles, { ...ALWAYS_ON, browserNotifications: true });
    expect(fake.constructed[0].title).toContain('Vaccination Reminder');
  });
});

describe('sendBrowserNotification', () => {
  it('returns false when notifications are unsupported', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(sendBrowserNotification('t', 'b', 'tag')).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('returns false when permission is denied', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    installFakeNotification('denied');
    await expect(sendBrowserNotification('t', 'b', 'tag')).resolves.toBe(false);
  });

  it('requests permission when it has not been decided yet', async () => {
    const fake = installFakeNotification('default');
    // requestPermission resolves with the same value we installed; simulate a grant.
    fake.requestPermission.mockResolvedValue('granted');
    (window.Notification as unknown as { permission: string }).permission = 'default';

    await expect(sendBrowserNotification('t', 'b', 'tag')).resolves.toBe(true);
    expect(fake.requestPermission).toHaveBeenCalledOnce();
  });

  it('returns false when the permission request is refused', async () => {
    const fake = installFakeNotification('default');
    fake.requestPermission.mockResolvedValue('denied');
    (window.Notification as unknown as { permission: string }).permission = 'default';

    await expect(sendBrowserNotification('t', 'b', 'tag')).resolves.toBe(false);
  });

  it('returns false when constructing the notification throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'Notification', {
      value: class {
        static permission = 'granted';
        constructor() {
          throw new Error('blocked by the browser');
        }
      },
      configurable: true,
      writable: true,
    });

    await expect(sendBrowserNotification('t', 'b', 'tag')).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
  });
});

describe('profile lifecycle', () => {
  it('clears only the given profile’s reminders', () => {
    saveReminders([
      makeReminder({ id: 'a', profileId: 'p1' }),
      makeReminder({ id: 'b', profileId: 'p2' }),
    ]);

    clearRemindersForProfile('p1');

    expect(loadReminders().map((r) => r.id)).toEqual(['b']);
  });

  it('replaces a profile’s reminders without duplicating them', () => {
    const dob = toISODate(addDays(startOfToday(), -100));
    saveReminders([makeReminder({ id: 'other', profileId: 'p2' })]);

    updateRemindersForProfile('p1', dob, {}, ALWAYS_ON);
    const first = loadReminders().filter((r) => r.profileId === 'p1').length;
    expect(first).toBeGreaterThan(0);

    updateRemindersForProfile('p1', dob, {}, ALWAYS_ON);
    const second = loadReminders().filter((r) => r.profileId === 'p1').length;
    expect(second).toBe(first);
    expect(loadReminders().some((r) => r.id === 'other')).toBe(true);
  });

  it('drops a profile’s reminders once every dose is recorded', () => {
    const dob = toISODate(addDays(startOfToday(), -10));
    updateRemindersForProfile('p1', dob, {}, ALWAYS_ON);
    expect(loadReminders().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// reminderAlarmOffsets — the calendar export must ring when the app would
// ---------------------------------------------------------------------------

describe('reminderAlarmOffsets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('converts the default settings into minutes, longest first', () => {
    expect(reminderAlarmOffsets()).toEqual([7 * 1440, 3 * 1440, 1 * 1440, 0]);
  });

  it('reads the saved preferences when none are passed', () => {
    saveReminderPreferences({ ...ALWAYS_ON, daysBefore: [14, 2], onDueDate: false });
    expect(reminderAlarmOffsets()).toEqual([14 * 1440, 2 * 1440]);
  });

  it('is empty when reminders are switched off', () => {
    expect(reminderAlarmOffsets({ ...ALWAYS_ON, enabled: false })).toEqual([]);
  });

  it('omits the day-of alarm when onDueDate is off', () => {
    expect(reminderAlarmOffsets({ ...ALWAYS_ON, onDueDate: false })).toEqual([
      7 * 1440,
      3 * 1440,
      1 * 1440,
    ]);
  });

  it('collapses duplicate day settings into one alarm', () => {
    const offsets = reminderAlarmOffsets({ ...ALWAYS_ON, daysBefore: [7, 7, 1, 0] });
    expect(offsets).toEqual([7 * 1440, 1 * 1440, 0]);
    expect(new Set(offsets).size).toBe(offsets.length);
  });

  it('drops nonsense values rather than emitting a broken VALARM', () => {
    const offsets = reminderAlarmOffsets({
      ...ALWAYS_ON,
      daysBefore: [-3, Number.NaN, Number.POSITIVE_INFINITY],
      onDueDate: true,
    });
    expect(offsets).toEqual([0]);
  });

  it('sorts descending so calendars that only keep the first alarm keep the earliest warning', () => {
    const offsets = reminderAlarmOffsets({ ...ALWAYS_ON, daysBefore: [1, 30, 7] });
    expect(offsets).toEqual([30 * 1440, 7 * 1440, 1 * 1440, 0]);
  });
});
