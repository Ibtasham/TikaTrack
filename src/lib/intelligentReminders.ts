/**
 * Intelligent Vaccination Reminder System
 *
 * Manages vaccination reminders with:
 * - Configurable reminder intervals
 * - Duplicate prevention
 * - Multi-profile support
 * - Notification preferences
 * - Browser notification integration
 */

import { allVaccines } from '../data/vaccines';
import {
  addDays,
  daysBetween,
  parseISODate,
  resolveReferenceToday,
  resolveReferenceTodayISO,
  startOfToday,
  toISODate,
  todayISO,
  type CalendarDateOptions,
} from './format';
import { createId } from './id';
import { generatePersonalizedSchedule, milestoneDoseName } from './smartScheduler';
import type { DoseHistoryInput } from './doseLedger';

export interface Reminder {
  id: string;
  profileId: string;
  vaccineId: string;
  /**
   * Which dose of the series this reminder is for, and the milestone it belongs
   * to. Without these, four OPV reminders for one child are indistinguishable
   * and a notification cannot say which visit is due.
   */
  doseNumber?: number;
  scheduledDoseId?: string;
  /** The schedule's own label for the dose (`OPV-2`, `পেন্টাভ্যালেন্ট-৩`). */
  doseLabel?: { en: string; bn: string };
  scheduledDate: string;
  reminderDate: string;
  reminderType: 'before-due' | 'on-due' | 'overdue';
  daysBefore: number;
  sent: boolean;
  sentAt?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface ReminderPreferences {
  enabled: boolean;
  daysBefore: number[]; // [7, 3, 1] means remind 7 days, 3 days, and 1 day before
  onDueDate: boolean;
  onOverdue: boolean;
  overdueInterval: number; // Days between overdue reminders
  browserNotifications: boolean;
  emailNotifications: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true,
  daysBefore: [7, 3, 1],
  onDueDate: true,
  onOverdue: true,
  overdueInterval: 3,
  browserNotifications: false,
  emailNotifications: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const REMINDER_LEAD_DAYS_OPTIONS = [14, 7, 3, 2, 1] as const;

export interface PushDosePayload {
  profileId: string;
  profileName: string;
  vaccineId: string;
  vaccineNameEn: string;
  vaccineNameBn: string;
  doseNumber: number;
  scheduledDoseId: string;
  doseLabelEn: string;
  doseLabelBn: string;
  scheduledDate: string;
}

/**
 * Extract unrecorded upcoming/due scheduled doses across every family profile
 * for server-side 48-hour Web Push notification scheduling.
 */
export function buildUpcomingPushDoses(
  profiles: Array<{ id: string; name: string; dateOfBirth: string } & DoseHistoryInput>,
  options: CalendarDateOptions = {},
): PushDosePayload[] {
  const vaccineById = new Map(allVaccines.map((v) => [v.id, v]));
  const items: PushDosePayload[] = [];
  const today = resolveReferenceToday(options);

  for (const profile of profiles) {
    const schedule = generatePersonalizedSchedule(profile.dateOfBirth, profile, options);
    for (const dose of schedule) {
      if (dose.status === 'completed') continue;
      const dueDate = parseISODate(dose.scheduledDate);
      if (!dueDate || dueDate < today) continue;

      const vaccine = vaccineById.get(dose.vaccineId);
      items.push({
        profileId: profile.id,
        profileName: profile.name,
        vaccineId: dose.vaccineId,
        vaccineNameEn: vaccine?.name.en ?? dose.vaccineId,
        vaccineNameBn: vaccine?.name.bn ?? dose.vaccineId,
        doseNumber: dose.doseNumber,
        scheduledDoseId: dose.scheduledDoseId,
        doseLabelEn: milestoneDoseName(dose, 'en'),
        doseLabelBn: milestoneDoseName(dose, 'bn'),
        scheduledDate: dose.scheduledDate,
      });
    }
  }

  return items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/**
 * Return doses due within the next 48 hours (0 to 2 calendar days away).
 */
export function findUpcoming48HourDoses(
  profiles: Array<{ id: string; name: string; dateOfBirth: string } & DoseHistoryInput>,
  options: CalendarDateOptions = {},
): PushDosePayload[] {
  const today = resolveReferenceToday(options);
  return buildUpcomingPushDoses(profiles, options).filter((item) => {
    const due = parseISODate(item.scheduledDate);
    if (!due) return false;
    const daysAway = daysBetween(today, due);
    return daysAway >= 0 && daysAway <= 2;
  });
}

const REMINDERS_STORAGE_KEY = 'tikatrack-reminders';
const PREFERENCES_STORAGE_KEY = 'tikatrack-reminder-preferences';
const SENT_NOTIFICATIONS_KEY = 'tikatrack-sent-notifications';

/**
 * Alarm offsets (minutes before an all-day event) derived from the user's own
 * reminder settings.
 *
 * One list per export, so a `.ics` file rings at exactly the same moments the
 * in-app reminders would have — the calendar is a second channel for the same
 * schedule, not a second schedule.
 */
export function reminderAlarmOffsets(
  preferences: ReminderPreferences = loadReminderPreferences(),
): number[] {
  if (!preferences.enabled) return [];

  const minutes = [
    ...preferences.daysBefore.map((days) => days * 24 * 60),
    ...(preferences.onDueDate ? [0] : []),
  ];

  return [...new Set(minutes)]
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a);
}

/**
 * Load reminder preferences from localStorage
 */
export function loadReminderPreferences(): ReminderPreferences {
  const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_REMINDER_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_REMINDER_PREFERENCES;
    }
  }
  return DEFAULT_REMINDER_PREFERENCES;
}

/**
 * Save reminder preferences to localStorage
 */
export function saveReminderPreferences(preferences: ReminderPreferences): void {
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

/**
 * Load reminders from localStorage
 */
export function loadReminders(): Reminder[] {
  const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Save reminders to localStorage
 */
export function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
}

/**
 * Load sent notifications to prevent duplicates
 */
function loadSentNotifications(): Set<string> {
  const saved = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch {
      return new Set();
    }
  }
  return new Set();
}

/**
 * Save sent notifications
 */
function saveSentNotifications(notifications: Set<string>): void {
  // Keep only last 1000 notifications to prevent storage bloat
  const arr = Array.from(notifications).slice(-1000);
  localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(arr));
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(preferences: ReminderPreferences): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHours, startMinutes] = preferences.quietHoursStart.split(':').map(Number);
  const [endHours, endMinutes] = preferences.quietHoursEnd.split(':').map(Number);

  if (
    !Number.isFinite(startHours) ||
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endHours) ||
    !Number.isFinite(endMinutes)
  ) {
    return false;
  }

  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutesTotal > endMinutesTotal) {
    return currentMinutes >= startMinutesTotal || currentMinutes < endMinutesTotal;
  }

  return currentMinutes >= startMinutesTotal && currentMinutes < endMinutesTotal;
}

/**
 * Generate unique notification ID to prevent duplicates
 */
function generateNotificationId(reminder: Reminder): string {
  // The dose is part of the identity: the same vaccine recurs at several
  // milestones, and two of them can share a reminder date.
  const dose = reminder.doseNumber ?? reminder.scheduledDoseId ?? 'any';
  return `${reminder.profileId}-${reminder.vaccineId}-${dose}-${reminder.reminderDate}-${reminder.reminderType}`;
}

/**
 * Generate reminders for a profile based on schedule
 */
/**
 * Generate reminders for a profile based on the schedule and its dose ledger.
 *
 * `history` may be a profile, a ledger or a legacy 2.x `records` map — see
 * `doseLedger.toDoseHistory`. Completion is evaluated **per dose**, so recording
 * OPV-1 no longer silences the OPV-2, OPV-3 and OPV-4 reminders.
 */
export function generateReminders(
  profileId: string,
  dateOfBirth: string,
  history: DoseHistoryInput,
  preferences: ReminderPreferences,
  options: CalendarDateOptions = {},
): Reminder[] {
  if (!preferences.enabled) return [];

  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, history, options);
  const reminders: Reminder[] = [];
  const today = resolveReferenceToday(options);
  const seenKeys = new Set<string>();

  const pushUnique = (reminder: Reminder) => {
    const key = generateNotificationId(reminder);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    reminders.push(reminder);
  };

  scheduledDoses.forEach((dose) => {
    // Completed doses (including early administrations) must not generate future reminders.
    if (dose.status === 'completed') return;

    const scheduledDate = parseISODate(dose.scheduledDate);
    if (!scheduledDate) return;

    // Generate "before due" reminders
    if (preferences.daysBefore.length > 0) {
      preferences.daysBefore.forEach((daysBefore) => {
        const reminderDate = addDays(scheduledDate, -daysBefore);

        // Only create reminder if it's in the future or today
        if (reminderDate >= today) {
          pushUnique({
            id: createId('rem'),
            profileId,
            vaccineId: dose.vaccineId,
            doseNumber: dose.doseNumber,
            scheduledDoseId: dose.scheduledDoseId,
            doseLabel: {
              en: milestoneDoseName(dose, 'en'),
              bn: milestoneDoseName(dose, 'bn'),
            },
            scheduledDate: dose.scheduledDate,
            reminderDate: toISODate(reminderDate),
            reminderType: 'before-due',
            daysBefore,
            sent: false,
            acknowledged: false,
          });
        }
      });
    }

    // Generate "on due date" reminder
    if (preferences.onDueDate && scheduledDate >= today) {
      pushUnique({
        id: createId('rem'),
        profileId,
        vaccineId: dose.vaccineId,
        doseNumber: dose.doseNumber,
        scheduledDoseId: dose.scheduledDoseId,
        doseLabel: {
          en: milestoneDoseName(dose, 'en'),
          bn: milestoneDoseName(dose, 'bn'),
        },
        scheduledDate: dose.scheduledDate,
        reminderDate: dose.scheduledDate,
        reminderType: 'on-due',
        daysBefore: 0,
        sent: false,
        acknowledged: false,
      });
    }

    // Generate "overdue" reminders
    if (preferences.onOverdue && dose.status === 'overdue') {
      const daysOverdue = daysBetween(scheduledDate, today);
      const nextReminderDate = addDays(today, preferences.overdueInterval);

      pushUnique({
        id: createId('rem'),
        profileId,
        vaccineId: dose.vaccineId,
        doseNumber: dose.doseNumber,
        scheduledDoseId: dose.scheduledDoseId,
        doseLabel: {
          en: milestoneDoseName(dose, 'en'),
          bn: milestoneDoseName(dose, 'bn'),
        },
        scheduledDate: dose.scheduledDate,
        reminderDate: toISODate(nextReminderDate),
        reminderType: 'overdue',
        daysBefore: -daysOverdue,
        sent: false,
        acknowledged: false,
      });
    }
  });

  return reminders;
}

/**
 * Get reminders due today
 */
export function getRemindersDueToday(
  reminders: Reminder[],
  options: CalendarDateOptions = {},
): Reminder[] {
  const today = options.now || options.timezone ? resolveReferenceTodayISO(options) : todayISO();
  return reminders.filter((r) => r.reminderDate === today && !r.sent);
}

/**
 * Get overdue reminders
 */
export function getOverdueReminders(reminders: Reminder[]): Reminder[] {
  const today = startOfToday();

  return reminders.filter((r) => {
    const reminderDate = parseISODate(r.reminderDate);
    return reminderDate !== null && reminderDate < today && !r.sent;
  });
}

/**
 * Mark reminder as sent
 */
export function markReminderAsSent(reminderId: string): void {
  const reminders = loadReminders();
  const reminder = reminders.find((r) => r.id === reminderId);

  if (reminder) {
    reminder.sent = true;
    reminder.sentAt = new Date().toISOString();
    saveReminders(reminders);

    // Track sent notification to prevent duplicates
    const sentNotifications = loadSentNotifications();
    sentNotifications.add(generateNotificationId(reminder));
    saveSentNotifications(sentNotifications);
  }
}

/**
 * Mark reminder as acknowledged
 */
export function markReminderAsAcknowledged(reminderId: string): void {
  const reminders = loadReminders();
  const reminder = reminders.find((r) => r.id === reminderId);

  if (reminder) {
    reminder.acknowledged = true;
    reminder.acknowledgedAt = new Date().toISOString();
    saveReminders(reminders);
  }
}

/**
 * Check if notification has already been sent (duplicate prevention)
 */
export function hasNotificationBeenSent(reminder: Reminder): boolean {
  const sentNotifications = loadSentNotifications();
  return sentNotifications.has(generateNotificationId(reminder));
}

/**
 * Send browser notification
 */
export async function sendBrowserNotification(
  title: string,
  body: string,
  tag: string,
): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
  }

  try {
    new Notification(title, {
      body,
      tag,
      // Base-aware, and pointing at an asset that actually ships.
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    });
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Process due reminders and send notifications
 */
export async function processDueReminders(
  profiles: Array<{ id: string; name: string; dateOfBirth: string }>,
  preferences: ReminderPreferences,
  language: 'en' | 'bn' = 'en',
): Promise<{ sent: number; skipped: number }> {
  if (!preferences.enabled || isQuietHours(preferences)) {
    return { sent: 0, skipped: 0 };
  }

  const reminders = loadReminders();
  const dueReminders = getRemindersDueToday(reminders);

  let sent = 0;
  let skipped = 0;

  for (const reminder of dueReminders) {
    // Check for duplicates
    if (hasNotificationBeenSent(reminder)) {
      skipped++;
      continue;
    }

    const profile = profiles.find((p) => p.id === reminder.profileId);
    if (!profile) continue;

    const vaccine = allVaccines.find((v) => v.id === reminder.vaccineId);
    if (!vaccine) continue;

    // Create notification content
    const displayLabel = reminder.doseLabel?.[language] ?? vaccine.name[language];
    const title =
      language === 'en'
        ? `Vaccination Reminder: ${displayLabel}`
        : `টিকাদান রিমাইন্ডার: ${displayLabel}`;

    const body =
      language === 'en'
        ? `${profile.name}'s ${reminder.reminderType === 'before-due' ? `${reminder.daysBefore} days before` : reminder.reminderType === 'on-due' ? 'vaccination is due today' : 'vaccination is overdue'}`
        : `${profile.name}-এর ${reminder.reminderType === 'before-due' ? `${reminder.daysBefore} দিন আগে` : reminder.reminderType === 'on-due' ? 'টিকাদান আজ' : 'টিকাদান বকেয়া'}`;

    // Send browser notification if enabled
    if (preferences.browserNotifications) {
      const success = await sendBrowserNotification(title, body, reminder.id);
      if (success) {
        markReminderAsSent(reminder.id);
        sent++;
      } else {
        skipped++;
      }
    } else {
      // Mark as sent even without browser notification
      markReminderAsSent(reminder.id);
      sent++;
    }
  }

  return { sent, skipped };
}

/**
 * Get reminder statistics
 */
export function getReminderStatistics(reminders: Reminder[]): {
  total: number;
  sent: number;
  pending: number;
  acknowledged: number;
  byType: {
    beforeDue: number;
    onDue: number;
    overdue: number;
  };
} {
  return {
    total: reminders.length,
    sent: reminders.filter((r) => r.sent).length,
    pending: reminders.filter((r) => !r.sent).length,
    acknowledged: reminders.filter((r) => r.acknowledged).length,
    byType: {
      beforeDue: reminders.filter((r) => r.reminderType === 'before-due').length,
      onDue: reminders.filter((r) => r.reminderType === 'on-due').length,
      overdue: reminders.filter((r) => r.reminderType === 'overdue').length,
    },
  };
}

/**
 * Clear all reminders for a profile
 */
export function clearRemindersForProfile(profileId: string): void {
  const reminders = loadReminders();
  const filtered = reminders.filter((r) => r.profileId !== profileId);
  saveReminders(filtered);
}

/**
 * Update reminders when profile data changes
 */
export function updateRemindersForProfile(
  profileId: string,
  dateOfBirth: string,
  history: DoseHistoryInput,
  preferences: ReminderPreferences,
): void {
  // Clear existing reminders for this profile
  clearRemindersForProfile(profileId);

  // Generate new reminders
  const newReminders = generateReminders(profileId, dateOfBirth, history, preferences);

  // Save to storage
  const existingReminders = loadReminders();
  saveReminders([...existingReminders, ...newReminders]);
}
