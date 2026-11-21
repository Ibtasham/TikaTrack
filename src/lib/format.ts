/**
 * Date / number formatting helpers.
 *
 * All functions accept `Language` so the UI can render Bangla numerals and
 * month names without duplicating logic in components.
 */

import type { Language } from '../i18n/types';

const MS_PER_DAY = 86_400_000;
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Official Bangladesh national time zone (UTC+6 year-round, no DST). */
export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';

export type CalendarTimezoneMode = 'local' | 'Asia/Dhaka';

export interface CalendarDateOptions {
  /** Override "today" with an explicit `YYYY-MM-DD` date (for deterministic calculation/tests). */
  asOfDate?: string;
  /** Resolve "today" in device-local time or explicit Bangladesh standard time (`Asia/Dhaka`). */
  timezone?: CalendarTimezoneMode;
  /** Optional clock instant to evaluate against when `asOfDate` is omitted. */
  now?: Date;
}

/** Check whether a string is a valid calendar date in strict `YYYY-MM-DD` form. */
export function isValidISODate(value: string): boolean {
  if (!value) return false;
  const match = ISO_DATE_ONLY.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  date.setFullYear(year);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Parse a `YYYY-MM-DD` string as a *local* calendar date (rejects invalid rollover like Feb 29 on non-leap years). */
export function parseISODate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = ISO_DATE_ONLY.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    date.setFullYear(year);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  // Only allow full ISO timestamp strings when explicitly timestamped; reject arbitrary strings.
  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Today, with the time component stripped. */
export function startOfToday(referenceNow: Date = new Date()): Date {
  return new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate());
}

/** Current calendar date in Bangladesh (`Asia/Dhaka`, UTC+6), formatted as `YYYY-MM-DD`. */
export function todayBangladeshISO(referenceNow: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BANGLADESH_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(referenceNow);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fallback below if ICU timezone data is unavailable.
  }
  // Bangladesh observes UTC+6 year-round with no daylight saving time.
  const dhakaMs = referenceNow.getTime() + 6 * 60 * 60 * 1000;
  const dhaka = new Date(dhakaMs);
  return `${dhaka.getUTCFullYear()}-${String(dhaka.getUTCMonth() + 1).padStart(2, '0')}-${String(dhaka.getUTCDate()).padStart(2, '0')}`;
}

/** Local Date object representing today's Bangladesh (`Asia/Dhaka`) calendar date at midnight. */
export function startOfBangladeshToday(referenceNow: Date = new Date()): Date {
  return parseISODate(todayBangladeshISO(referenceNow)) ?? startOfToday(referenceNow);
}

/** Resolve reference calendar "today" from optional `asOfDate`, `timezone`, or `now`. */
export function resolveReferenceToday(options: CalendarDateOptions = {}): Date {
  if (options.asOfDate) {
    const parsed = parseISODate(options.asOfDate);
    if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  const instant = options.now ?? new Date();
  if (options.timezone === BANGLADESH_TIMEZONE) {
    return startOfBangladeshToday(instant);
  }
  return startOfToday(instant);
}

/** Resolve reference calendar "today" as strict `YYYY-MM-DD`. */
export function resolveReferenceTodayISO(options: CalendarDateOptions = {}): string {
  return toISODate(resolveReferenceToday(options));
}

/** Whole days between two dates (`to - from`), ignoring time of day. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Add whole calendar months, clamping to the last day of short months (e.g. Jan 31 + 1m → Feb 28/29). */
export function addCalendarMonths(date: Date, months: number): Date {
  const targetMonthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const targetDay = Math.min(date.getDate(), lastDayOfTargetMonth);
  return new Date(targetYear, normalizedMonth, targetDay);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(startOfToday());
}

export interface CalendarAgeBreakdown {
  days: number;
  weeks: number;
  /** Completed months remainder within current year (0–11). */
  months: number;
  /** Total completed calendar months since birth. */
  totalMonths: number;
  years: number;
  remainingDays: number;
  isValid: boolean;
  isFutureDob: boolean;
  isLeapBirth: boolean;
  referenceDate: string;
}

/**
 * Exact calendar-aware age breakdown relative to `options.asOfDate` / `timezone` / today.
 *
 * Clamps month-end / leap-day (Feb 29) anniversaries consistently with `addCalendarMonths`,
 * and safely clamps future or malformed dates of birth to zeros instead of throwing or
 * producing negative counts.
 */
export function calculateCalendarAge(
  dateOfBirth: string,
  options: CalendarDateOptions = {},
): CalendarAgeBreakdown {
  const today = resolveReferenceToday(options);
  const referenceDate = toISODate(today);
  const birth = parseISODate(dateOfBirth);

  if (!birth) {
    return {
      days: 0,
      weeks: 0,
      months: 0,
      totalMonths: 0,
      years: 0,
      remainingDays: 0,
      isValid: false,
      isFutureDob: false,
      isLeapBirth: false,
      referenceDate,
    };
  }

  const isLeapBirth = birth.getMonth() === 1 && birth.getDate() === 29;
  const rawDays = daysBetween(birth, today);
  if (rawDays < 0) {
    return {
      days: 0,
      weeks: 0,
      months: 0,
      totalMonths: 0,
      years: 0,
      remainingDays: 0,
      isValid: true,
      isFutureDob: true,
      isLeapBirth,
      referenceDate,
    };
  }

  const days = rawDays;
  const weeks = Math.floor(days / 7);

  // Month anniversary day in today's month is clamped to month length (so Feb 29 / 31st births
  // reach their calendar-month anniversary on Feb 28 / Apr 30).
  const lastDayOfTodayMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const anniversaryDayInTodayMonth = Math.min(birth.getDate(), lastDayOfTodayMonth);

  let totalMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < anniversaryDayInTodayMonth) {
    totalMonths -= 1;
  }
  if (totalMonths < 0) totalMonths = 0;

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const lastAnniversary = addCalendarMonths(birth, totalMonths);
  const remainingDays = Math.max(0, daysBetween(lastAnniversary, today));

  return {
    days,
    weeks,
    months,
    totalMonths,
    years,
    remainingDays,
    isValid: true,
    isFutureDob: false,
    isLeapBirth,
    referenceDate,
  };
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert ASCII digits to Bangla digits when the active language is `bn`. */
export function localiseNumber(value: number | string, language: Language): string {
  const text = String(value);
  if (language !== 'bn') return text;
  return text.replace(/\d/g, (digit) => BN_DIGITS[Number(digit)]);
}

/** e.g. `5 March 2024` / `৫ মার্চ ২০২৪`. */
export function formatDate(value: string | Date, language: Language): string {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '—';
  const months = language === 'bn' ? MONTHS_BN : MONTHS_EN;
  return `${localiseNumber(date.getDate(), language)} ${months[date.getMonth()]} ${localiseNumber(
    date.getFullYear(),
    language,
  )}`;
}

/** e.g. `2024-03` -> `March 2024`. */
export function formatMonth(monthKey: string, language: Language): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const months = language === 'bn' ? MONTHS_BN : MONTHS_EN;
  return `${months[month - 1]} ${localiseNumber(year, language)}`;
}

/** Human age string, e.g. `2y 4m` / `২ বছর ৪ মাস`. */
export function formatAge(
  dateOfBirth: string,
  language: Language,
  options: CalendarDateOptions = {},
): string {
  const age = calculateCalendarAge(dateOfBirth, options);
  if (!age.isValid || age.isFutureDob) return '—';
  if (age.days < 60) return `${localiseNumber(age.days, language)} ${language === 'bn' ? 'দিন' : 'd'}`;
  if (age.years < 1) {
    return `${localiseNumber(age.months, language)} ${language === 'bn' ? 'মাস' : 'm'}`;
  }
  if (age.years < 2) {
    return `${localiseNumber(age.years, language)}${language === 'bn' ? ' বছর' : 'y'} ${localiseNumber(
      age.months,
      language,
    )}${language === 'bn' ? ' মাস' : 'm'}`;
  }
  return `${localiseNumber(age.years, language)} ${language === 'bn' ? 'বছর' : 'years'}`;
}

/** `+12 days` / `-3 days` style relative label. */
export function formatRelativeDays(days: number, language: Language): string {
  const value = localiseNumber(Math.abs(days), language);
  if (days === 0) return language === 'bn' ? 'আজ' : 'today';
  const noun = language === 'bn' ? 'দিন' : days === 1 || days === -1 ? 'day' : 'days';
  return days > 0 ? `${value} ${noun}` : `-${value} ${noun}`;
}

/** Month key used to group charts, e.g. `2024-03`. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
