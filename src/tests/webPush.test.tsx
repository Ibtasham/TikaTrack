import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import swTemplate from '../../sw.template.js?raw';
import {
  buildPushNotificationPayload,
  computeLocalClinicDueMs,
  dispatchDue48HourPushForRecord,
  findDue48HourPushAlerts,
  isLocalQuietHours,
  type PushDoseItem,
  type PushSubscriptionRecord,
} from '../lib/webPushServer';
import {
  subscribeToWebPush,
  syncWebPushSchedule,
  unsubscribeFromWebPush,
  urlBase64ToUint8Array,
} from '../lib/pushClient';
import { buildUpcomingPushDoses } from '../lib/intelligentReminders';
import { I18nProvider } from '../i18n';
import { ProfilesProvider } from '../contexts/ProfilesContext';
import { ToastProvider } from '../contexts/ToastContext';
import RemindersPage from '../pages/RemindersPage';

function makeDose(overrides: Partial<PushDoseItem> = {}): PushDoseItem {
  return {
    profileId: 'child-1',
    profileName: 'Ayaan',
    vaccineId: 'penta',
    vaccineNameEn: 'Pentavalent (DTP-HepB-Hib)',
    vaccineNameBn: 'পেন্টাভ্যালেন্ট',
    doseNumber: 1,
    scheduledDoseId: 'penta-1',
    doseLabelEn: 'Pentavalent-1',
    doseLabelBn: 'পেন্টাভ্যালেন্ট-১',
    scheduledDate: '2026-05-10',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<PushSubscriptionRecord> = {}): PushSubscriptionRecord {
  return {
    id: 'sub-1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/example-endpoint',
    keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
    userUid: null,
    language: 'en',
    timezoneOffsetMinutes: -360, // Asia/Dhaka UTC+6
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    leadHours: 48,
    enabled: true,
    doses: [makeDose()],
    sentKeys: [],
    lastNotifiedAt: null,
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('48-hour Web Push schedule engine', () => {
  it('calculates local clinic morning due timestamp accurately for UTC+6', () => {
    const dueMs = computeLocalClinicDueMs('2026-05-10', -360, 9);
    // 2026-05-10 09:00 Asia/Dhaka (+06:00) === 2026-05-10T03:00:00.000Z
    expect(dueMs).toBe(Date.parse('2026-05-10T03:00:00.000Z'));
  });

  it('does not trigger more than 48 hours before due date, then triggers at exactly 48 hours prior', () => {
    const record = makeRecord();

    // 49 hours before 2026-05-10T03:00:00Z => 2026-05-08T02:00:00Z (08:00 Dhaka)
    const beforeWindow = Date.parse('2026-05-08T02:00:00.000Z');
    expect(findDue48HourPushAlerts(record, beforeWindow)).toEqual([]);

    // Exactly 48 hours before => 2026-05-08T03:00:00Z (09:00 Dhaka)
    const exact48h = Date.parse('2026-05-08T03:00:00.000Z');
    const alerts = findDue48HourPushAlerts(record, exact48h);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].payload.title).toContain('48 Hours');
    expect(alerts[0].payload.body).toContain('Ayaan');
    expect(alerts[0].payload.body).toContain('Pentavalent-1');
    expect(alerts[0].payload.recordUrl).toContain('/tracker?');
  });

  it('skips doses that are already past due or already marked as sent', () => {
    const record = makeRecord();

    // Past due: 2026-05-10T04:00:00Z (10:00 Dhaka on due date)
    const pastDue = Date.parse('2026-05-10T04:00:00.000Z');
    expect(findDue48HourPushAlerts(record, pastDue)).toEqual([]);

    // Deduplication within window
    const at48h = Date.parse('2026-05-08T03:00:00.000Z');
    const [alert] = findDue48HourPushAlerts(record, at48h);
    const sentRecord = makeRecord({ sentKeys: [alert.dedupeKey] });
    expect(findDue48HourPushAlerts(sentRecord, at48h)).toEqual([]);
  });

  it('respects overnight quiet hours in the subscriber local timezone', () => {
    // 2026-05-08T17:30:00Z is 23:30 Asia/Dhaka (inside 22:00–07:00 quiet hours)
    const nightDhaka = Date.parse('2026-05-08T17:30:00.000Z');
    expect(isLocalQuietHours(nightDhaka, -360, '22:00', '07:00')).toBe(true);
    expect(findDue48HourPushAlerts(makeRecord(), nightDhaka)).toEqual([]);

    // 2026-05-09T02:00:00Z is 08:00 Asia/Dhaka (outside quiet hours)
    const morningDhaka = Date.parse('2026-05-09T02:00:00.000Z');
    expect(isLocalQuietHours(morningDhaka, -360, '22:00', '07:00')).toBe(false);
    expect(findDue48HourPushAlerts(makeRecord(), morningDhaka)).toHaveLength(1);
  });

  it('builds localized Bengali 48-hour push payloads', () => {
    const payload = buildPushNotificationPayload(makeDose(), 'bn');
    expect(payload.title).toContain('৪৮ ঘণ্টা');
    expect(payload.body).toContain('পেন্টাভ্যালেন্ট-১');
    expect(payload.actions).toHaveLength(2);
  });

  it('dispatches via web-push sender and cleans up expired 410 subscriptions', async () => {
    const sender = vi.fn().mockResolvedValue({ statusCode: 201 });
    const record = makeRecord();
    const at48h = Date.parse('2026-05-08T03:00:00.000Z');

    const okRes = await dispatchDue48HourPushForRecord(record, { nowMs: at48h, sender });
    expect(okRes).toEqual({ sent: 1, skipped: 0, expired: false });
    expect(sender).toHaveBeenCalledTimes(1);

    const expiredSender = vi.fn().mockRejectedValue({ statusCode: 410 });
    const freshRecord = makeRecord({ endpoint: 'https://fcm.googleapis.com/expired' });
    const goneRes = await dispatchDue48HourPushForRecord(freshRecord, {
      nowMs: at48h,
      sender: expiredSender,
    });
    expect(goneRes).toEqual({ sent: 0, skipped: 0, expired: true });
  });
});

describe('Service Worker push & notificationclick runtime', () => {
  it('renders incoming push notifications and opens deep links on click', async () => {
    const source = swTemplate
      .split('{{CACHE_NAME}}')
      .join('tikatrack-vTEST')
      .split('{{BASE}}')
      .join('/');

    const listeners = new Map<string, Array<(e: never) => void>>();
    const showNotification = vi.fn(async () => undefined);
    const openWindow = vi.fn(async () => undefined);
    const matchAll = vi.fn(async () => []);

    const selfStub = {
      location: new URL('https://tikatrack.test/'),
      addEventListener(type: string, handler: (e: never) => void) {
        listeners.set(type, [...(listeners.get(type) ?? []), handler]);
      },
      skipWaiting: vi.fn(async () => undefined),
      registration: { showNotification },
      clients: { claim: vi.fn(async () => undefined), matchAll, openWindow },
    };

    const run = new Function(
      'self',
      'caches',
      'clients',
      'fetch',
      'Response',
      'console',
      source,
    ) as (...args: unknown[]) => void;

    run(selfStub, { keys: async () => [], open: async () => ({}) }, selfStub.clients, vi.fn(), {}, console);

    const pushPending: Promise<unknown>[] = [];
    const pushEvent = {
      data: {
        json: () => ({
          title: 'Vaccination in 48 Hours: OPV-1',
          body: 'Ayaan needs OPV-1 on 2026-05-10.',
          url: '/reminders?member=p1',
          recordUrl: '/tracker?member=p1&vaccine=opv&dose=1&action=record',
          tag: 'opv-48h',
        }),
      },
      waitUntil: (p: Promise<unknown>) => pushPending.push(p),
    };

    for (const h of listeners.get('push') ?? []) h(pushEvent as never);
    await Promise.all(pushPending);

    expect(showNotification).toHaveBeenCalledWith(
      'Vaccination in 48 Hours: OPV-1',
      expect.objectContaining({
        body: 'Ayaan needs OPV-1 on 2026-05-10.',
        icon: '/icons/icon-192.png',
        tag: 'opv-48h',
      }),
    );

    const clickPending: Promise<unknown>[] = [];
    const close = vi.fn();
    const clickEvent = {
      action: 'record',
      notification: {
        close,
        data: {
          url: '/reminders?member=p1',
          recordUrl: '/tracker?member=p1&vaccine=opv&dose=1&action=record',
        },
      },
      waitUntil: (p: Promise<unknown>) => clickPending.push(p),
    };

    for (const h of listeners.get('notificationclick') ?? []) h(clickEvent as never);
    await Promise.all(clickPending);

    expect(close).toHaveBeenCalledTimes(1);
    expect(openWindow).toHaveBeenCalledWith(
      'https://tikatrack.test/tracker?member=p1&vaccine=opv&dose=1&action=record',
    );
  });
});

describe('Client Web Push integration', () => {
  it('converts base64url VAPID key cleanly', () => {
    const bytes = urlBase64ToUint8Array('SGVsbG8');
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('builds upcoming push doses from profiles', () => {
    const dob = new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10);
    const doses = buildUpcomingPushDoses([
      { id: 'p1', name: 'Baby Sara', dateOfBirth: dob, events: [] },
    ]);
    expect(doses.length).toBeGreaterThan(0);
    expect(doses[0].profileName).toBe('Baby Sara');
  });

  it('subscribes, syncs, and unsubscribes via PushManager + API endpoints', async () => {
    let activeSub: unknown = null;
    const unsubscribeMock = vi.fn(async () => {
      activeSub = null;
      return true;
    });
    const fakeSub = {
      endpoint: 'https://push.example.test/sub-1',
      toJSON: () => ({
        endpoint: 'https://push.example.test/sub-1',
        keys: { p256dh: 'p256dh-test', auth: 'auth-test' },
      }),
      unsubscribe: unsubscribeMock,
    };

    const subscribeMock = vi.fn(async () => {
      activeSub = fakeSub;
      return fakeSub;
    });

    const registration = {
      active: {},
      pushManager: {
        getSubscription: vi.fn(async () => activeSub),
        subscribe: subscribeMock,
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn(async () => registration),
        getRegistration: vi.fn(async () => registration),
        ready: Promise.resolve(registration),
      },
      configurable: true,
    });
    Object.defineProperty(window, 'PushManager', { value: function () {}, configurable: true });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn(async () => 'granted') },
      configurable: true,
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/push/vapid-public-key') {
        return new Response(JSON.stringify({ publicKey: 'SGVsbG8' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ subscribed: true, synced: true, queuedDoses: 3, dispatchedNow: 0 }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const subResult = await subscribeToWebPush({
      profiles: [{ id: 'p1', name: 'Ayaan', dateOfBirth: '2026-01-01', records: {}, events: [] }],
      language: 'en',
    });
    expect(subResult.ok).toBe(true);
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );

    const syncResult = await syncWebPushSchedule({
      profiles: [{ id: 'p1', name: 'Ayaan', dateOfBirth: '2026-01-01', records: {}, events: [] }],
      language: 'bn',
    });
    expect(syncResult.synced).toBe(true);

    await unsubscribeFromWebPush();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('renders 48-Hour Web Push controls and 2 days (48h) option on RemindersPage', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'PushManager', { value: function () {}, configurable: true });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn(async () => null),
        register: vi.fn(async () => ({ active: {}, pushManager: { getSubscription: async () => null } })),
      },
      configurable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn(async () => 'default') },
      configurable: true,
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
      expect(screen.getByText('48-Hour Web Push Reminders')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Enable 48h Web Push' })).toBeInTheDocument();
    const chip48h = screen.getByRole('button', { name: '2 days (48h)' });
    expect(chip48h).toBeInTheDocument();
    await user.click(chip48h);
    expect(chip48h).toHaveAttribute('aria-pressed', 'true');
  });
});
