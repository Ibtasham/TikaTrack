/**
 * Offline Local Notification Service
 *
 * Schedules and triggers local browser notifications for upcoming, due-today,
 * and overdue vaccination doses using the Web Notifications API
 * (`ServiceWorkerRegistration.showNotification` preferred for mobile/PWA
 * reliability, with `new Notification(...)` fallback). Works 100% offline with
 * zero network calls required.
 */

import { allVaccines } from '../data/vaccines';
import {
  addDays,
  daysBetween,
  parseISODate,
  resolveReferenceToday,
  type CalendarDateOptions,
} from './format';
import {
  DEFAULT_REMINDER_PREFERENCES,
  generateReminders,
  loadReminderPreferences,
  type Reminder,
  type ReminderPreferences,
} from './intelligentReminders';
import type { DoseHistoryInput } from './doseLedger';

export const LOCAL_NOTIFICATIONS_PREFS_KEY = 'tikatrack.localNotifications.prefs';
export const LOCAL_NOTIFICATIONS_QUEUE_KEY = 'tikatrack.localNotifications.queue';
export const LOCAL_NOTIFICATIONS_FIRED_KEY = 'tikatrack.localNotifications.fired';
export const REMINDER_PREFS_CHANGED_EVENT = 'tikatrack:reminder-prefs-changed';

/** Matches `SENT_NOTIFICATIONS_KEY` in `intelligentReminders.ts` for shared deduplication. */
const SHARED_SENT_NOTIFICATIONS_KEY = 'tikatrack-sent-notifications';

/** Browser `setTimeout` uses a signed 32-bit integer (~24.8 days max). Schedule timers within 7 days and resync periodically. */
const MAX_TIMER_WINDOW_MS = 7 * 86_400_000;
const RESYNC_INTERVAL_MS = 6 * 3_600_000;
const MAX_ACTIVE_TIMERS = 40;

export interface LocalNotificationSettings {
  preferredTime: string; // HH:MM local wall clock, default '09:00'
  preferredHour: number;
  preferredMinute: number;
}

export const DEFAULT_LOCAL_NOTIFICATION_SETTINGS: LocalNotificationSettings = {
  preferredTime: '09:00',
  preferredHour: 9,
  preferredMinute: 0,
};

export type LocalNotificationProfileInput = {
  id: string;
  name: string;
  dateOfBirth: string;
} & DoseHistoryInput;

export interface ScheduledLocalNotification {
  id: string;
  dedupeKey: string;
  profileId: string;
  profileName: string;
  vaccineId: string;
  doseNumber?: number;
  scheduledDoseId?: string;
  doseLabel: { en: string; bn: string };
  scheduledDate: string;
  reminderDate: string;
  reminderType: Reminder['reminderType'];
  daysBefore: number;
  fireAt: number;
  fireAtISO: string;
  title: { en: string; bn: string };
  body: { en: string; bn: string };
  tag: string;
  url: string;
  recordUrl: string;
}

export interface LocalNotificationDispatchPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
  recordUrl?: string;
  profileId?: string;
  vaccineId?: string;
  scheduledDate?: string;
  language?: 'en' | 'bn';
  showTriggerTimestampMs?: number;
}

export interface LocalNotificationDispatchResult {
  ok: boolean;
  channel?: 'service-worker' | 'window-notification';
  reason?: 'unsupported' | 'denied' | 'not-granted' | 'error';
}

export interface LocalNotificationSnapshot {
  supported: boolean;
  timestampTriggerSupported: boolean;
  permission: NotificationPermission;
  enabled: boolean;
  settings: LocalNotificationSettings;
  scheduled: ScheduledLocalNotification[];
  nextScheduled: ScheduledLocalNotification | null;
  firedCount: number;
  lastCheckedAt: string | null;
  lastDispatchedAt: string | null;
}

export interface LocalNotificationSyncResult {
  scheduledCount: number;
  dispatchedNow: number;
  deferredByQuietHours: number;
  timersArmed: number;
}

export function isLocalNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isTimestampTriggerSupported(): boolean {
  if (!isLocalNotificationSupported()) return false;
  try {
    const ctor = window.Notification as unknown as { prototype?: Record<string, unknown> };
    const hasShowTrigger = Boolean(ctor?.prototype && 'showTrigger' in ctor.prototype);
    const hasTriggerCtor =
      typeof (globalThis as { TimestampTrigger?: unknown }).TimestampTrigger === 'function';
    return hasShowTrigger && hasTriggerCtor;
  } catch {
    return false;
  }
}

export function getLocalNotificationPermission(): NotificationPermission {
  if (!isLocalNotificationSupported()) return 'denied';
  try {
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

export async function requestLocalNotificationPermission(): Promise<NotificationPermission> {
  if (!isLocalNotificationSupported()) return 'denied';
  try {
    const result = await Notification.requestPermission();
    localNotificationService.refreshPermission();
    return result;
  } catch {
    return getLocalNotificationPermission();
  }
}

export function parseTimeHHMM(
  value: string | undefined,
  fallbackHour = 9,
  fallbackMinute = 0,
): { hour: number; minute: number; formatted: string } {
  if (typeof value === 'string') {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return {
          hour,
          minute,
          formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        };
      }
    }
  }
  return {
    hour: fallbackHour,
    minute: fallbackMinute,
    formatted: `${String(fallbackHour).padStart(2, '0')}:${String(fallbackMinute).padStart(2, '0')}`,
  };
}

export function loadLocalNotificationSettings(): LocalNotificationSettings {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_PREFS_KEY);
    if (!raw) return DEFAULT_LOCAL_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LocalNotificationSettings>;
    const parsedTime = parseTimeHHMM(
      parsed.preferredTime,
      typeof parsed.preferredHour === 'number' ? parsed.preferredHour : 9,
      typeof parsed.preferredMinute === 'number' ? parsed.preferredMinute : 0,
    );
    return {
      preferredTime: parsedTime.formatted,
      preferredHour: parsedTime.hour,
      preferredMinute: parsedTime.minute,
    };
  } catch {
    return DEFAULT_LOCAL_NOTIFICATION_SETTINGS;
  }
}

export function saveLocalNotificationSettings(
  input: Partial<LocalNotificationSettings> | string,
): LocalNotificationSettings {
  const current = loadLocalNotificationSettings();
  const timeInput =
    typeof input === 'string'
      ? input
      : input.preferredTime ??
        `${String(input.preferredHour ?? current.preferredHour).padStart(2, '0')}:${String(
          input.preferredMinute ?? current.preferredMinute,
        ).padStart(2, '0')}`;
  const parsed = parseTimeHHMM(timeInput, current.preferredHour, current.preferredMinute);
  const next: LocalNotificationSettings = {
    preferredTime: parsed.formatted,
    preferredHour: parsed.hour,
    preferredMinute: parsed.minute,
  };
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore private-mode storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMINDER_PREFS_CHANGED_EVENT));
  }
  return next;
}

export function isTimeInQuietHours(
  date: Date,
  quietHoursStart: string,
  quietHoursEnd: string,
): boolean {
  const start = parseTimeHHMM(quietHoursStart, -1, -1);
  const end = parseTimeHHMM(quietHoursEnd, -1, -1);
  if (start.hour < 0 || end.hour < 0) return false;

  const currentTotal = date.getHours() * 60 + date.getMinutes();
  const startTotal = start.hour * 60 + start.minute;
  const endTotal = end.hour * 60 + end.minute;

  if (startTotal === endTotal) return false;
  if (startTotal > endTotal) {
    return currentTotal >= startTotal || currentTotal < endTotal;
  }
  return currentTotal >= startTotal && currentTotal < endTotal;
}

/**
 * Given a Date inside quiet hours, returns the timestamp (ms) when quiet hours end.
 */
export function computeNextQuietHoursExitMs(
  date: Date,
  quietHoursStart: string,
  quietHoursEnd: string,
): number {
  const start = parseTimeHHMM(quietHoursStart, 22, 0);
  const end = parseTimeHHMM(quietHoursEnd, 7, 0);
  const currentTotal = date.getHours() * 60 + date.getMinutes();
  const startTotal = start.hour * 60 + start.minute;
  const endTotal = end.hour * 60 + end.minute;

  const exit = new Date(date.getTime());
  exit.setSeconds(0, 0);

  if (startTotal > endTotal) {
    // Overnight quiet hours (e.g. 22:00 -> 07:00)
    if (currentTotal >= startTotal) {
      exit.setDate(exit.getDate() + 1);
    }
    exit.setHours(end.hour, end.minute, 0, 0);
    return exit.getTime();
  }

  // Same-day quiet hours (e.g. 13:00 -> 15:00)
  exit.setHours(end.hour, end.minute, 0, 0);
  if (exit.getTime() <= date.getTime()) {
    exit.setDate(exit.getDate() + 1);
  }
  return exit.getTime();
}

/**
 * Compute exact local epoch ms to fire a notification for `reminderDateISO`,
 * respecting preferred time-of-day and shifting forward past quiet hours.
 */
export function computeFireAtTimestamp(
  reminderDateISO: string,
  preferences: Pick<ReminderPreferences, 'quietHoursStart' | 'quietHoursEnd'>,
  settings: LocalNotificationSettings = DEFAULT_LOCAL_NOTIFICATION_SETTINGS,
): number {
  const parsedDate = parseISODate(reminderDateISO);
  if (!parsedDate) return Date.now();

  const candidate = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    settings.preferredHour,
    settings.preferredMinute,
    0,
    0,
  );

  if (isTimeInQuietHours(candidate, preferences.quietHoursStart, preferences.quietHoursEnd)) {
    return computeNextQuietHoursExitMs(
      candidate,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
    );
  }
  return candidate.getTime();
}

export function buildLocalDedupeKey(reminder: Pick<
  Reminder,
  'profileId' | 'vaccineId' | 'doseNumber' | 'scheduledDoseId' | 'reminderDate' | 'reminderType'
>): string {
  const dose = reminder.doseNumber ?? reminder.scheduledDoseId ?? 'any';
  return `${reminder.profileId}-${reminder.vaccineId}-${dose}-${reminder.reminderDate}-${reminder.reminderType}`;
}

export function loadFiredNotificationKeys(): Set<string> {
  const combined = new Set<string>();
  for (const key of [LOCAL_NOTIFICATIONS_FIRED_KEY, SHARED_SENT_NOTIFICATIONS_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.length > 0) combined.add(item);
        }
      }
    } catch {
      // Ignore malformed storage entries
    }
  }
  return combined;
}

export function markLocalNotificationFired(dedupeKey: string): void {
  for (const key of [LOCAL_NOTIFICATIONS_FIRED_KEY, SHARED_SENT_NOTIFICATIONS_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      const next = Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
      if (!next.includes(dedupeKey)) {
        next.push(dedupeKey);
      }
      localStorage.setItem(key, JSON.stringify(next.slice(-1000)));
    } catch {
      // Ignore storage errors
    }
  }
}

function buildLocalizedCopy(
  reminder: Reminder,
  profileName: string,
  doseLabel: { en: string; bn: string },
): { title: { en: string; bn: string }; body: { en: string; bn: string } } {
  const title = {
    en: `Vaccination Reminder: ${doseLabel.en}`,
    bn: `টিকাদান রিমাইন্ডার: ${doseLabel.bn}`,
  };

  if (reminder.reminderType === 'before-due') {
    const days = reminder.daysBefore;
    return {
      title,
      body: {
        en: `${profileName}'s ${doseLabel.en} dose is due in ${days} ${days === 1 ? 'day' : 'days'} (${reminder.scheduledDate}).`,
        bn: `${profileName}-এর ${doseLabel.bn} ডোজ ${days} দিন পর (${reminder.scheduledDate}) নির্ধারিত আছে।`,
      },
    };
  }

  if (reminder.reminderType === 'on-due') {
    return {
      title,
      body: {
        en: `${profileName}'s ${doseLabel.en} vaccination is due today (${reminder.scheduledDate}).`,
        bn: `${profileName}-এর ${doseLabel.bn} টিকা আজ (${reminder.scheduledDate}) নেওয়ার সময় হয়েছে।`,
      },
    };
  }

  const overdueDays = Math.abs(reminder.daysBefore);
  return {
    title,
    body: {
      en: `${profileName}'s ${doseLabel.en} dose is overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} (was due ${reminder.scheduledDate}).`,
      bn: `${profileName}-এর ${doseLabel.bn} ডোজ ${overdueDays} দিন বকেয়া (নির্ধারিত ছিল ${reminder.scheduledDate})।`,
    },
  };
}

/**
 * Pure schedule builder for local notifications across all family profiles.
 * Runs 100% locally from cached/stored profiles & EPI schedule data.
 */
export function buildScheduledLocalNotifications(
  profiles: LocalNotificationProfileInput[],
  preferences: ReminderPreferences = DEFAULT_REMINDER_PREFERENCES,
  settings: LocalNotificationSettings = loadLocalNotificationSettings(),
  options: CalendarDateOptions & { includeAlreadyFired?: boolean } = {},
): ScheduledLocalNotification[] {
  if (!preferences.enabled || profiles.length === 0) return [];

  const vaccineById = new Map(allVaccines.map((v) => [v.id, v]));
  const firedKeys = options.includeAlreadyFired ? new Set<string>() : loadFiredNotificationKeys();
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const prefix = basePath === '/' ? '' : basePath;
  const referenceToday = resolveReferenceToday(options);

  const items: ScheduledLocalNotification[] = [];
  const seenKeys = new Set<string>();

  for (const profile of profiles) {
    const generated = generateReminders(
      profile.id,
      profile.dateOfBirth,
      profile,
      preferences,
      options,
    );

    for (const reminder of generated) {
      const dedupeKey = buildLocalDedupeKey(reminder);
      if (firedKeys.has(dedupeKey) || seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const vaccine = vaccineById.get(reminder.vaccineId);
      const doseLabel = reminder.doseLabel ?? {
        en: vaccine?.name.en ?? reminder.vaccineId,
        bn: vaccine?.name.bn ?? reminder.vaccineId,
      };
      const copy = buildLocalizedCopy(reminder, profile.name, doseLabel);

      // For overdue items whose reminderDate was pushed forward by overdueInterval,
      // ensure catch-up also evaluates cleanly relative to referenceToday.
      const scheduledDateObj = parseISODate(reminder.scheduledDate);
      const effectiveDateISO =
        reminder.reminderType === 'overdue' &&
        scheduledDateObj &&
        daysBetween(scheduledDateObj, referenceToday) > 0
          ? `${referenceToday.getFullYear()}-${String(referenceToday.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(referenceToday.getDate()).padStart(2, '0')}`
          : reminder.reminderDate;

      const fireAt = computeFireAtTimestamp(effectiveDateISO, preferences, settings);
      const recordParams = new URLSearchParams({
        member: profile.id,
        vaccine: reminder.vaccineId,
        ...(reminder.doseNumber ? { dose: String(reminder.doseNumber) } : {}),
        action: 'record',
      });

      items.push({
        id: `local-${dedupeKey}`,
        dedupeKey,
        profileId: profile.id,
        profileName: profile.name,
        vaccineId: reminder.vaccineId,
        doseNumber: reminder.doseNumber,
        scheduledDoseId: reminder.scheduledDoseId,
        doseLabel,
        scheduledDate: reminder.scheduledDate,
        reminderDate: effectiveDateISO,
        reminderType: reminder.reminderType,
        daysBefore: reminder.daysBefore,
        fireAt,
        fireAtISO: new Date(fireAt).toISOString(),
        title: copy.title,
        body: copy.body,
        tag: `tikatrack-local-${dedupeKey}`,
        url: `${prefix}/reminders?member=${encodeURIComponent(profile.id)}`,
        recordUrl: `${prefix}/tracker?${recordParams.toString()}`,
      });
    }

    // Ensure at least a 0-day catch-up reminder for today's due doses if `onDueDate` is enabled
    // (already covered by generateReminders, plus keep overdue catch-up clean above).
    void addDays;
  }

  return items.sort((a, b) => a.fireAt - b.fireAt);
}

/**
 * Dispatch a local notification immediately (or register a `TimestampTrigger`
 * when `showTriggerTimestampMs` is provided and supported).
 * Works completely offline without hitting any backend.
 */
export async function dispatchLocalNotification(
  payload: LocalNotificationDispatchPayload,
): Promise<LocalNotificationDispatchResult> {
  if (!isLocalNotificationSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  let permission = getLocalNotificationPermission();
  if (permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }
  if (permission === 'default') {
    permission = await requestLocalNotificationPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: permission === 'denied' ? 'denied' : 'not-granted' };
    }
  }

  const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
  const targetUrl = payload.url ?? `${import.meta.env.BASE_URL}reminders`;
  const recordUrl = payload.recordUrl ?? `${import.meta.env.BASE_URL}tracker`;
  const recordLabel = payload.language === 'bn' ? 'ডোজ রেকর্ড করুন' : 'Record dose';

  let showTrigger: unknown;
  if (
    typeof payload.showTriggerTimestampMs === 'number' &&
    payload.showTriggerTimestampMs > Date.now() &&
    isTimestampTriggerSupported()
  ) {
    try {
      const TriggerCtor = (
        globalThis as unknown as { TimestampTrigger: new (ts: number) => unknown }
      ).TimestampTrigger;
      showTrigger = new TriggerCtor(payload.showTriggerTimestampMs);
    } catch {
      showTrigger = undefined;
    }
  }

  const baseData = {
    url: targetUrl,
    recordUrl,
    profileId: payload.profileId ?? null,
    vaccineId: payload.vaccineId ?? null,
    scheduledDate: payload.scheduledDate ?? null,
  };

  // Prefer ServiceWorkerRegistration.showNotification so mobile Chrome / PWAs work reliably
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration =
        typeof navigator.serviceWorker.getRegistration === 'function'
          ? await navigator.serviceWorker.getRegistration()
          : undefined;
      if (registration && typeof registration.showNotification === 'function') {
        const swOptions: NotificationOptions & {
          renotify?: boolean;
          actions?: Array<{ action: string; title: string }>;
          showTrigger?: unknown;
        } = {
          body: payload.body,
          tag: payload.tag,
          icon,
          badge: icon,
          renotify: true,
          data: baseData,
          actions: [{ action: 'record', title: recordLabel }],
          ...(showTrigger ? { showTrigger } : {}),
        };
        await registration.showNotification(payload.title, swOptions);
        return { ok: true, channel: 'service-worker' };
      }
    } catch {
      // Fall back to window.Notification constructor below
    }
  }

  // Only fire immediate window.Notification if this isn't a future TimestampTrigger request
  if (showTrigger) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon,
      badge: icon,
      data: baseData,
    });
    notification.onclick = () => {
      try {
        window.focus();
        window.location.assign(targetUrl);
        notification.close();
      } catch {
        // Ignore navigation errors in headless/test environments
      }
    };
    return { ok: true, channel: 'window-notification' };
  } catch (error) {
    console.error('Failed to trigger local notification:', error);
    return { ok: false, reason: 'error' };
  }
}

export class LocalNotificationService {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private resyncTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private deferredDueQueue: ScheduledLocalNotification[] = [];
  private lastProfiles: LocalNotificationProfileInput[] = [];
  private lastPreferences: ReminderPreferences = DEFAULT_REMINDER_PREFERENCES;
  private lastLanguage: 'en' | 'bn' = 'en';
  private cachedSnapshot: LocalNotificationSnapshot;
  private syncing = false;

  constructor() {
    this.cachedSnapshot = {
      supported: isLocalNotificationSupported(),
      timestampTriggerSupported: isTimestampTriggerSupported(),
      permission: getLocalNotificationPermission(),
      enabled: false,
      settings: loadLocalNotificationSettings(),
      scheduled: [],
      nextScheduled: null,
      firedCount: loadFiredNotificationKeys().size,
      lastCheckedAt: null,
      lastDispatchedAt: null,
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LocalNotificationSnapshot => {
    return this.cachedSnapshot;
  };

  refreshPermission(): void {
    const permission = getLocalNotificationPermission();
    this.updateSnapshot({
      supported: isLocalNotificationSupported(),
      timestampTriggerSupported: isTimestampTriggerSupported(),
      permission,
      enabled:
        this.lastPreferences.enabled &&
        this.lastPreferences.browserNotifications &&
        permission === 'granted',
    });
  }

  clearAllTimers(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    if (this.resyncTimer !== null) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
  }

  async syncSchedule(
    profiles: LocalNotificationProfileInput[],
    preferences: ReminderPreferences = loadReminderPreferences(),
    language: 'en' | 'bn' = 'en',
    nowDate: Date = new Date(),
  ): Promise<LocalNotificationSyncResult> {
    if (this.syncing) {
      return {
        scheduledCount: this.cachedSnapshot.scheduled.length,
        dispatchedNow: 0,
        deferredByQuietHours: 0,
        timersArmed: this.timers.size,
      };
    }

    this.syncing = true;
    try {
      this.lastProfiles = profiles;
      this.lastPreferences = preferences;
      this.lastLanguage = language;

      this.clearAllTimers();

      const settings = loadLocalNotificationSettings();
      const permission = getLocalNotificationPermission();
      const supported = isLocalNotificationSupported();
      const enabled = preferences.enabled && preferences.browserNotifications && permission === 'granted';

      const scheduled = buildScheduledLocalNotifications(profiles, preferences, settings, {
        now: nowDate,
      });

      try {
        localStorage.setItem(
          LOCAL_NOTIFICATIONS_QUEUE_KEY,
          JSON.stringify(
            scheduled.slice(0, 100).map((item) => ({
              id: item.id,
              dedupeKey: item.dedupeKey,
              fireAtISO: item.fireAtISO,
              title: item.title[language],
              scheduledDate: item.scheduledDate,
            })),
          ),
        );
      } catch {
        // Ignore storage errors
      }

      const nowMs = nowDate.getTime();
      const inQuietHours = isTimeInQuietHours(
        nowDate,
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
      );

      let dispatchedNow = 0;
      let deferredByQuietHours = 0;
      const dispatchedKeys = new Set<string>();
      let lastDispatchedAt = this.cachedSnapshot.lastDispatchedAt;

      if (enabled && (scheduled.length > 0 || this.deferredDueQueue.length > 0)) {
        const dueItemsMap = new Map<string, ScheduledLocalNotification>();
        for (const deferredItem of this.deferredDueQueue) {
          dueItemsMap.set(deferredItem.dedupeKey, deferredItem);
        }
        for (const item of scheduled) {
          if (item.fireAt <= nowMs) {
            dueItemsMap.set(item.dedupeKey, item);
          }
        }
        const alreadyFired = loadFiredNotificationKeys();
        const dueItems = Array.from(dueItemsMap.values()).filter(
          (item) => !alreadyFired.has(item.dedupeKey),
        );

        if (dueItems.length > 0) {
          if (inQuietHours) {
            this.deferredDueQueue = dueItems;
            deferredByQuietHours = dueItems.length;
            const exitMs = computeNextQuietHoursExitMs(
              nowDate,
              preferences.quietHoursStart,
              preferences.quietHoursEnd,
            );
            const delay = Math.max(1000, exitMs - nowMs);
            if (delay <= MAX_TIMER_WINDOW_MS) {
              const handle = setTimeout(() => {
                void this.syncSchedule(
                  this.lastProfiles,
                  this.lastPreferences,
                  this.lastLanguage,
                  new Date(),
                );
              }, delay);
              this.timers.set('__quiet_hours_exit__', handle);
            }
          } else {
            this.deferredDueQueue = [];
            for (const item of dueItems) {
              const result = await dispatchLocalNotification({
                title: item.title[language],
                body: item.body[language],
                tag: item.tag,
                url: item.url,
                recordUrl: item.recordUrl,
                profileId: item.profileId,
                vaccineId: item.vaccineId,
                scheduledDate: item.scheduledDate,
                language,
              });
              if (result.ok) {
                markLocalNotificationFired(item.dedupeKey);
                dispatchedKeys.add(item.dedupeKey);
                dispatchedNow++;
                lastDispatchedAt = new Date().toISOString();
              }
            }
          }
        } else {
          this.deferredDueQueue = [];
        }

        // Arm JS timers for upcoming items within MAX_TIMER_WINDOW_MS
        const remainingFuture = scheduled.filter(
          (item) => item.fireAt > nowMs && !dispatchedKeys.has(item.dedupeKey),
        );

        let armed = 0;
        for (const item of remainingFuture) {
          if (armed >= MAX_ACTIVE_TIMERS) break;
          const delayMs = item.fireAt - nowMs;
          if (delayMs > MAX_TIMER_WINDOW_MS) continue;

          const timer = setTimeout(() => {
            void this.fireScheduledItem(item, language);
          }, delayMs);
          this.timers.set(item.dedupeKey, timer);
          armed++;
        }

        // Progressive enhancement: register OS-level TimestampTrigger for upcoming items if supported
        if (isTimestampTriggerSupported()) {
          for (const item of remainingFuture.slice(0, 8)) {
            void dispatchLocalNotification({
              title: item.title[language],
              body: item.body[language],
              tag: item.tag,
              url: item.url,
              recordUrl: item.recordUrl,
              profileId: item.profileId,
              vaccineId: item.vaccineId,
              scheduledDate: item.scheduledDate,
              language,
              showTriggerTimestampMs: item.fireAt,
            });
          }
        }

        // Periodic resync for items beyond the 7-day JS timer window
        if (remainingFuture.some((item) => item.fireAt - nowMs > MAX_TIMER_WINDOW_MS)) {
          this.resyncTimer = setTimeout(() => {
            void this.syncSchedule(
              this.lastProfiles,
              this.lastPreferences,
              this.lastLanguage,
              new Date(),
            );
          }, RESYNC_INTERVAL_MS);
        }
      }

      const activeQueue = scheduled.filter((item) => !dispatchedKeys.has(item.dedupeKey));
      this.updateSnapshot({
        supported,
        timestampTriggerSupported: isTimestampTriggerSupported(),
        permission,
        enabled,
        settings,
        scheduled: activeQueue,
        nextScheduled: activeQueue[0] ?? null,
        firedCount: loadFiredNotificationKeys().size,
        lastCheckedAt: nowDate.toISOString(),
        lastDispatchedAt,
      });

      return {
        scheduledCount: activeQueue.length,
        dispatchedNow,
        deferredByQuietHours,
        timersArmed: this.timers.size,
      };
    } finally {
      this.syncing = false;
    }
  }

  private async fireScheduledItem(
    item: ScheduledLocalNotification,
    language: 'en' | 'bn',
  ): Promise<void> {
    this.timers.delete(item.dedupeKey);

    if (!this.lastPreferences.enabled || !this.lastPreferences.browserNotifications) {
      return;
    }
    if (loadFiredNotificationKeys().has(item.dedupeKey)) {
      return;
    }

    const now = new Date();
    if (
      isTimeInQuietHours(
        now,
        this.lastPreferences.quietHoursStart,
        this.lastPreferences.quietHoursEnd,
      )
    ) {
      // Reschedule past quiet hours exit
      await this.syncSchedule(this.lastProfiles, this.lastPreferences, language, now);
      return;
    }

    const result = await dispatchLocalNotification({
      title: item.title[language],
      body: item.body[language],
      tag: item.tag,
      url: item.url,
      recordUrl: item.recordUrl,
      profileId: item.profileId,
      vaccineId: item.vaccineId,
      scheduledDate: item.scheduledDate,
      language,
    });

    if (result.ok) {
      markLocalNotificationFired(item.dedupeKey);
      const remaining = this.cachedSnapshot.scheduled.filter(
        (entry) => entry.dedupeKey !== item.dedupeKey,
      );
      this.updateSnapshot({
        scheduled: remaining,
        nextScheduled: remaining[0] ?? null,
        firedCount: loadFiredNotificationKeys().size,
        lastDispatchedAt: now.toISOString(),
      });
    }
  }

  async sendTestNotification(
    language: 'en' | 'bn' = 'en',
    sample?: ScheduledLocalNotification | null,
  ): Promise<LocalNotificationDispatchResult> {
    const title = sample
      ? sample.title[language]
      : language === 'bn'
        ? 'টিকাট্র্যাক অফলাইন রিমাইন্ডার পরীক্ষা'
        : 'TikaTrack Offline Reminder Test';
    const body = sample
      ? sample.body[language]
      : language === 'bn'
        ? 'ইন্টারনেট ছাড়াই এই ডিভাইসে স্থানীয় ভ্যাকসিন রিমাইন্ডার কাজ করছে।'
        : 'Local vaccination reminders are active on this device and work without internet access.';

    const result = await dispatchLocalNotification({
      title,
      body,
      tag: 'tikatrack-local-test',
      url: sample?.url ?? `${import.meta.env.BASE_URL}reminders`,
      recordUrl: sample?.recordUrl ?? `${import.meta.env.BASE_URL}tracker`,
      language,
    });

    this.refreshPermission();
    if (result.ok) {
      this.updateSnapshot({ lastDispatchedAt: new Date().toISOString() });
    }
    return result;
  }

  private updateSnapshot(partial: Partial<LocalNotificationSnapshot>): void {
    this.cachedSnapshot = {
      ...this.cachedSnapshot,
      ...partial,
    };
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const localNotificationService = new LocalNotificationService();

export function subscribeLocalNotifications(listener: () => void): () => void {
  return localNotificationService.subscribe(listener);
}

export function getLocalNotificationSnapshot(): LocalNotificationSnapshot {
  return localNotificationService.getSnapshot();
}

export async function syncLocalNotificationSchedule(
  profiles: LocalNotificationProfileInput[],
  preferences: ReminderPreferences = loadReminderPreferences(),
  language: 'en' | 'bn' = 'en',
  now: Date = new Date(),
): Promise<LocalNotificationSyncResult> {
  return localNotificationService.syncSchedule(profiles, preferences, language, now);
}

export async function checkDueLocalNotificationsNow(
  profiles: LocalNotificationProfileInput[],
  preferences: ReminderPreferences = loadReminderPreferences(),
  language: 'en' | 'bn' = 'en',
): Promise<LocalNotificationSyncResult> {
  return localNotificationService.syncSchedule(profiles, preferences, language, new Date());
}

export async function sendTestLocalNotification(
  language: 'en' | 'bn' = 'en',
  sample?: ScheduledLocalNotification | null,
): Promise<LocalNotificationDispatchResult> {
  return localNotificationService.sendTestNotification(language, sample);
}
