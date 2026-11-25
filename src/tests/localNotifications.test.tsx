import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider } from '../i18n';
import { ProfilesProvider } from '../contexts/ProfilesContext';
import { ToastProvider } from '../contexts/ToastContext';
import {
  DEFAULT_REMINDER_PREFERENCES,
  saveReminderPreferences,
  type ReminderPreferences,
} from '../lib/intelligentReminders';
import {
  buildScheduledLocalNotifications,
  computeFireAtTimestamp,
  dispatchLocalNotification,
  loadFiredNotificationKeys,
  LocalNotificationService,
  saveLocalNotificationSettings,
} from '../lib/localNotifications';
import { STORAGE_KEYS } from '../lib/storage';
import RemindersPage from '../pages/RemindersPage';

function installWindowNotification(permission: NotificationPermission = 'granted') {
  const constructed: Array<{ title: string; options: NotificationOptions }> = [];
  const requestPermission = vi.fn(async () => permission);

  class FakeNotification {
    static permission = permission;
    static requestPermission = requestPermission;
    onclick: (() => void) | null = null;
    close = vi.fn();

    constructor(title: string, options: NotificationOptions = {}) {
      constructed.push({ title, options });
    }
  }

  Object.defineProperty(window, 'Notification', {
    value: FakeNotification,
    configurable: true,
    writable: true,
  });

  return { constructed, requestPermission, FakeNotification };
}

function setNavigatorOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value: online,
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  setNavigatorOnline(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Local Notification scheduling & quiet hours math', () => {
  it('computes exact local wall-clock fireAt and defers quiet hours to quietHoursEnd', () => {
    const prefs: Pick<ReminderPreferences, 'quietHoursStart' | 'quietHoursEnd'> = {
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };

    const morningMs = computeFireAtTimestamp('2026-06-15', prefs, {
      preferredTime: '09:30',
      preferredHour: 9,
      preferredMinute: 30,
    });
    const morning = new Date(morningMs);
    expect(morning.getFullYear()).toBe(2026);
    expect(morning.getMonth()).toBe(5);
    expect(morning.getDate()).toBe(15);
    expect(morning.getHours()).toBe(9);
    expect(morning.getMinutes()).toBe(30);

    // Late night (23:15) should shift forward to next day 07:00
    const nightShiftedMs = computeFireAtTimestamp('2026-06-15', prefs, {
      preferredTime: '23:15',
      preferredHour: 23,
      preferredMinute: 15,
    });
    const shifted = new Date(nightShiftedMs);
    expect(shifted.getDate()).toBe(16);
    expect(shifted.getHours()).toBe(7);
    expect(shifted.getMinutes()).toBe(0);
  });

  it('builds localized EN & BN scheduled local notifications for upcoming doses', () => {
    const now = new Date(2026, 4, 1, 8, 0, 0, 0); // May 1, 2026 08:00
    // Born May 1, 2026 -> BCG due at birth (2026-05-01), Pentavalent-1 at 6 weeks (2026-06-12)
    const profiles = [{ id: 'child-1', name: 'Ayaan', dateOfBirth: '2026-05-01', events: [] }];
    const prefs: ReminderPreferences = {
      ...DEFAULT_REMINDER_PREFERENCES,
      enabled: true,
      daysBefore: [3, 1],
      onDueDate: true,
      onOverdue: false,
      browserNotifications: true,
    };

    const items = buildScheduledLocalNotifications(
      profiles,
      prefs,
      { preferredTime: '09:00', preferredHour: 9, preferredMinute: 0 },
      { now },
    );

    expect(items.length).toBeGreaterThan(2);
    expect(items[0].reminderDate).toBe('2026-05-01');
    expect(items[0].title.en).toContain('Vaccination Reminder');
    expect(items[0].title.bn).toContain('টিকাদান রিমাইন্ডার');
    expect(items[0].body.en).toContain('Ayaan');
    expect(items[0].recordUrl).toContain('/tracker?');
  });
});

describe('LocalNotificationService offline timer & delivery engine', () => {
  it('schedules and triggers a local notification while completely offline without duplicate firing', async () => {
    vi.useFakeTimers();
    const start = new Date(2026, 4, 1, 8, 55, 0, 0); // 08:55 local
    vi.setSystemTime(start);
    setNavigatorOnline(false);

    const { constructed } = installWindowNotification('granted');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn(async () => undefined) },
      configurable: true,
    });

    saveLocalNotificationSettings('09:00');
    const prefs: ReminderPreferences = {
      ...DEFAULT_REMINDER_PREFERENCES,
      enabled: true,
      daysBefore: [],
      onDueDate: true,
      onOverdue: false,
      browserNotifications: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };

    // Profile born today -> BCG + OPV-0 due 2026-05-01 at 09:00 (in 5 minutes)
    const profiles = [{ id: 'child-1', name: 'Nora', dateOfBirth: '2026-05-01', events: [] }];
    const service = new LocalNotificationService();

    const syncRes = await service.syncSchedule(profiles, prefs, 'en', start);
    expect(syncRes.dispatchedNow).toBe(0);
    expect(syncRes.timersArmed).toBeGreaterThan(0);
    expect(constructed).toHaveLength(0);

    // Advance 5 minutes to 09:00 while offline -> timers fire automatically
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 50);
    });

    const firedCount = constructed.length;
    expect(firedCount).toBeGreaterThan(0);
    expect(constructed[0].options.body).toContain('Nora');
    expect(loadFiredNotificationKeys().size).toBe(firedCount);

    // Resyncing right after must NOT duplicate already-fired notifications
    const resync = await service.syncSchedule(profiles, prefs, 'en', new Date(start.getTime() + 6 * 60_000));
    expect(resync.dispatchedNow).toBe(0);
    expect(constructed).toHaveLength(firedCount);

    service.clearAllTimers();
  });

  it('defers due local notifications during quiet hours and fires them when quiet hours end', async () => {
    vi.useFakeTimers();
    const quietNow = new Date(2026, 4, 1, 23, 0, 0, 0); // 23:00 inside 22:00-07:00
    vi.setSystemTime(quietNow);
    setNavigatorOnline(false);

    const { constructed } = installWindowNotification('granted');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn(async () => undefined) },
      configurable: true,
    });

    saveLocalNotificationSettings('09:00'); // 09:00 already passed earlier on 2026-05-01
    const prefs: ReminderPreferences = {
      ...DEFAULT_REMINDER_PREFERENCES,
      enabled: true,
      daysBefore: [],
      onDueDate: true,
      onOverdue: false,
      browserNotifications: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
    const profiles = [{ id: 'child-1', name: 'Zayan', dateOfBirth: '2026-05-01', events: [] }];
    const service = new LocalNotificationService();

    const syncRes = await service.syncSchedule(profiles, prefs, 'en', quietNow);
    expect(syncRes.dispatchedNow).toBe(0);
    expect(syncRes.deferredByQuietHours).toBeGreaterThan(0);
    expect(constructed).toHaveLength(0);

    // Advance 8 hours to 07:00 next morning -> quiet-hours-exit timer fires catch-up
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8 * 3_600_000 + 100);
    });

    expect(constructed.length).toBeGreaterThan(0);
    expect(constructed[0].options.body).toContain('Zayan');

    service.clearAllTimers();
  });

  it('prefers ServiceWorkerRegistration.showNotification when active and supports TimestampTrigger', async () => {
    installWindowNotification('granted');
    const showNotification = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn(async () => ({ showNotification })),
      },
      configurable: true,
    });

    const res = await dispatchLocalNotification({
      title: 'Vaccination Reminder: BCG',
      body: 'Ayaan BCG due today',
      tag: 'local-bcg',
      url: '/reminders',
      recordUrl: '/tracker?member=p1&vaccine=bcg&action=record',
      language: 'en',
    });

    expect(res).toEqual({ ok: true, channel: 'service-worker' });
    expect(showNotification).toHaveBeenCalledWith(
      'Vaccination Reminder: BCG',
      expect.objectContaining({
        body: 'Ayaan BCG due today',
        actions: [{ action: 'record', title: 'Record dose' }],
      }),
    );

    // Verify TimestampTrigger progressive enhancement when exposed by browser
    const ctor = window.Notification as unknown as { prototype: Record<string, unknown> };
    ctor.prototype.showTrigger = null;
    const triggerInstances: number[] = [];
    (globalThis as unknown as { TimestampTrigger?: new (ts: number) => { timestamp: number } }).TimestampTrigger =
      class {
        timestamp: number;
        constructor(ts: number) {
          this.timestamp = ts;
          triggerInstances.push(ts);
        }
      };

    const futureTs = Date.now() + 3600_000;
    const triggerRes = await dispatchLocalNotification({
      title: 'Scheduled BCG',
      body: 'Due soon',
      tag: 'local-trigger',
      showTriggerTimestampMs: futureTs,
    });
    expect(triggerRes.ok).toBe(true);
    expect(triggerInstances).toEqual([futureTs]);

    delete ctor.prototype.showTrigger;
    delete (globalThis as unknown as { TimestampTrigger?: unknown }).TimestampTrigger;
  });
});

describe('RemindersPage Offline Local Notifications UI', () => {
  it('renders offline local notification controls, enables alerts offline, and sends a test alert', async () => {
    const user = userEvent.setup();
    setNavigatorOnline(false);

    const { constructed, FakeNotification } = installWindowNotification('default');
    FakeNotification.requestPermission.mockImplementation(async () => {
      FakeNotification.permission = 'granted';
      return 'granted';
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn(async () => null),
        register: vi.fn(async () => ({ active: {} })),
      },
      configurable: true,
    });

    const dob = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    localStorage.setItem(
      STORAGE_KEYS.profiles,
      JSON.stringify([{ id: 'p1', name: 'Mina', dateOfBirth: dob, events: [], records: {} }]),
    );
    saveReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      enabled: true,
      browserNotifications: false,
    });

    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <ProfilesProvider>
              <RemindersPage />
            </ProfilesProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Offline Local Notifications')).toBeInTheDocument();
    });

    const enableBtn = screen.getByRole('button', { name: 'Enable local alerts' });
    await user.click(enableBtn);

    await waitFor(() => {
      expect(screen.getByText('Offline local alerts active on this device')).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: 'Test offline alert' });
    await user.click(testBtn);

    await waitFor(() => {
      expect(constructed.length).toBeGreaterThan(0);
    });
  });
});
