import type { User } from 'firebase/auth';
import type { Profile } from '../types';
import {
  buildUpcomingPushDoses,
  loadReminderPreferences,
  type PushDosePayload,
  type ReminderPreferences,
} from './intelligentReminders';
import { ensurePushServiceWorker } from './serviceWorker';

export interface WebPushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  endpoint: string | null;
}

export interface SubscribeWebPushResult {
  ok: boolean;
  error?: string;
  permission: NotificationPermission;
  subscribed: boolean;
  queuedDoses: number;
  dispatchedNow: number;
}

export function isWebPushSupported(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return false;
  }
  const host = window.location?.hostname ?? '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext && !isLocal) {
    return false;
  }
  return true;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function optionalAuthHeader(firebaseUser?: User | null): Promise<Record<string, string>> {
  if (!firebaseUser) return {};
  try {
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const existingReg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    if (!existingReg?.pushManager) return null;
    return await existingReg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: 'denied',
      subscribed: false,
      endpoint: null,
    };
  }
  const sub = await getExistingPushSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(sub),
    endpoint: sub?.endpoint ?? null,
  };
}

export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/push/vapid-public-key');
  if (!res.ok) {
    throw new Error('Could not fetch VAPID public key from server.');
  }
  const data = (await res.json()) as { publicKey?: string };
  if (!data.publicKey) {
    throw new Error('Server returned an empty VAPID public key.');
  }
  return data.publicKey;
}

export async function subscribeToWebPush(params: {
  profiles: Profile[];
  preferences?: ReminderPreferences;
  language: 'en' | 'bn';
  firebaseUser?: User | null;
}): Promise<SubscribeWebPushResult> {
  if (!isWebPushSupported()) {
    return {
      ok: false,
      error: 'unsupported',
      permission: 'denied',
      subscribed: false,
      queuedDoses: 0,
      dispatchedNow: 0,
    };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      error: 'permission-denied',
      permission,
      subscribed: false,
      queuedDoses: 0,
      dispatchedNow: 0,
    };
  }

  try {
    const registration = await ensurePushServiceWorker();
    if (!registration?.pushManager) {
      return {
        ok: false,
        error: 'worker-unavailable',
        permission,
        subscribed: false,
        queuedDoses: 0,
        dispatchedNow: 0,
      };
    }

    const publicKey = await fetchVapidPublicKey();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
      throw new Error('Browser produced an incomplete PushSubscription.');
    }

    const prefs = params.preferences ?? loadReminderPreferences();
    const doses: PushDosePayload[] = buildUpcomingPushDoses(params.profiles);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await optionalAuthHeader(params.firebaseUser)),
    };

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: {
          endpoint: serialized.endpoint,
          keys: {
            p256dh: serialized.keys.p256dh,
            auth: serialized.keys.auth,
          },
        },
        language: params.language,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
        leadHours: 48,
        enabled: prefs.enabled,
        doses,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to register push subscription on server.');
    }

    const body = (await res.json()) as { queuedDoses?: number; dispatchedNow?: number };
    return {
      ok: true,
      permission,
      subscribed: true,
      queuedDoses: body.queuedDoses ?? doses.length,
      dispatchedNow: body.dispatchedNow ?? 0,
    };
  } catch (error) {
    console.error('[push] subscribe failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'subscribe-failed',
      permission,
      subscribed: false,
      queuedDoses: 0,
      dispatchedNow: 0,
    };
  }
}

export async function syncWebPushSchedule(params: {
  profiles: Profile[];
  preferences?: ReminderPreferences;
  language: 'en' | 'bn';
  firebaseUser?: User | null;
}): Promise<{ synced: boolean; queuedDoses: number; dispatchedNow: number }> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return { synced: false, queuedDoses: 0, dispatchedNow: 0 };
  }

  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
    return { synced: false, queuedDoses: 0, dispatchedNow: 0 };
  }

  const prefs = params.preferences ?? loadReminderPreferences();
  const doses = buildUpcomingPushDoses(params.profiles);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await optionalAuthHeader(params.firebaseUser)),
  };

  try {
    const res = await fetch('/api/push/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: {
          endpoint: serialized.endpoint,
          keys: {
            p256dh: serialized.keys.p256dh,
            auth: serialized.keys.auth,
          },
        },
        language: params.language,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        quietHoursStart: prefs.quietHoursStart,
        quietHoursEnd: prefs.quietHoursEnd,
        leadHours: 48,
        enabled: prefs.enabled,
        doses,
      }),
    });

    if (!res.ok) return { synced: false, queuedDoses: 0, dispatchedNow: 0 };
    const body = (await res.json()) as { queuedDoses?: number; dispatchedNow?: number };
    return {
      synced: true,
      queuedDoses: body.queuedDoses ?? doses.length,
      dispatchedNow: body.dispatchedNow ?? 0,
    };
  } catch {
    return { synced: false, queuedDoses: 0, dispatchedNow: 0 };
  }
}

export async function unsubscribeFromWebPush(firebaseUser?: User | null): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    /* proceed to server cleanup even if browser already dropped subscription */
  }

  try {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(await optionalAuthHeader(firebaseUser)),
      },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* non-fatal */
  }

  return true;
}

export async function sendTestWebPush(
  language: 'en' | 'bn',
  sampleDose?: Partial<PushDosePayload>,
  firebaseUser?: User | null,
): Promise<{ ok: boolean; error?: string }> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return { ok: false, error: 'not-subscribed' };
  }

  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
    return { ok: false, error: 'invalid-subscription' };
  }

  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await optionalAuthHeader(firebaseUser)),
      },
      body: JSON.stringify({
        subscription: {
          endpoint: serialized.endpoint,
          keys: {
            p256dh: serialized.keys.p256dh,
            auth: serialized.keys.auth,
          },
        },
        language,
        sampleDose,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'push-failed' };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'network-error',
    };
  }
}
