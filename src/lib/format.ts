/**
 * Date / number formatting helpers.
 *
 * All functions accept `Language` so the UI can render Bangla numerals and
 * month names without duplicating logic in components.
 */

import type { Language } from '../i18n/types';

const MS_PER_DAY = 86_400_000;

/** Parse a `YYYY-MM-DD` string as a *local* date (avoids UTC off-by-one). */
export function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today, with the time component stripped. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(startOfToday());
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
export function formatAge(dateOfBirth: string, language: Language): string {
  const dob = parseISODate(dateOfBirth);
  if (!dob) return '—';
  const today = startOfToday();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const days = daysBetween(dob, today);

  if (days < 0) return '—';
  if (days < 60) return `${localiseNumber(days, language)} ${language === 'bn' ? 'দিন' : 'd'}`;
  if (years < 1) return `${localiseNumber(months, language)} ${language === 'bn' ? 'মাস' : 'm'}`;
  if (years < 2)
    return `${localiseNumber(years, language)}${language === 'bn' ? ' বছর' : 'y'} ${localiseNumber(
      months,
      language,
    )}${language === 'bn' ? ' মাস' : 'm'}`;
  return `${localiseNumber(years, language)} ${language === 'bn' ? 'বছর' : 'years'}`;
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
