import type { Language } from '../i18n/types';
import type { Profile } from '../types';
import {
  BANGLADESH_TIMEZONE,
  isValidISODate,
  localiseNumber,
  resolveReferenceTodayISO,
  type CalendarDateOptions,
} from './format';
import { analyzeSchedule } from './smartScheduler';

export type ProgressHorizon = 'active' | 'full';

export interface MemberProgressMeta {
  id: string;
  name: string;
  lightColor: string;
  darkColor: string;
  currentPct: number;
  completedToDate: number;
  dueToDate: number;
  totalCompleted: number;
  totalScheduled: number;
}

export interface FamilyProgressPoint {
  monthKey: string;
  label: string;
  fullLabel: string;
  isCurrentMonth: boolean;
  isFuture: boolean;
  familyCompleted: number | null;
  familyScheduled: number;
  familyPct: number | null;
  [key: string]: string | number | boolean | null;
}

export interface FamilyProgressDataset {
  points: FamilyProgressPoint[];
  members: MemberProgressMeta[];
  currentMonthKey: string;
  hasScheduledDoses: boolean;
}

const LIGHT_SERIES_COLORS = [
  '#047857', // emerald-700
  '#b45309', // amber-700
  '#1d4ed8', // blue-700
  '#c2410c', // terracotta/orange-700
  '#6d28d9', // violet-700
  '#0f766e', // teal-700
];

const DARK_SERIES_COLORS = [
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#60a5fa', // blue-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#2dd4bf', // teal-400
];

const SHORT_MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SHORT_MONTHS_BN = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগ',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];

const FULL_MONTHS_EN = [
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

const FULL_MONTHS_BN = [
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

function addMonthsToMonthKey(monthKeyStr: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKeyStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKeyStr;
  const total = year * 12 + (month - 1) + deltaMonths;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

function enumerateMonthKeys(startKey: string, endKey: string): string[] {
  if (startKey > endKey) return [startKey];
  const keys: string[] = [];
  let cursor = startKey;
  let guard = 0;
  while (cursor <= endKey && guard < 120) {
    keys.push(cursor);
    cursor = addMonthsToMonthKey(cursor, 1);
    guard += 1;
  }
  return keys;
}

function formatShortMonth(monthKeyStr: string, language: Language): string {
  const [yStr, mStr] = monthKeyStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKeyStr;
  const monthName = (language === 'bn' ? SHORT_MONTHS_BN : SHORT_MONTHS_EN)[month - 1] ?? mStr;
  const shortYear = String(year).slice(-2);
  return `${monthName} ${localiseNumber(shortYear, language)}`;
}

function formatFullMonth(monthKeyStr: string, language: Language): string {
  const [yStr, mStr] = monthKeyStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  if (!year || !month) return monthKeyStr;
  const monthName = (language === 'bn' ? FULL_MONTHS_BN : FULL_MONTHS_EN)[month - 1] ?? mStr;
  return `${monthName} ${localiseNumber(year, language)}`;
}

export interface BuildFamilyProgressOptions {
  language?: Language;
  horizon?: ProgressHorizon;
  dateOptions?: CalendarDateOptions;
}

/**
 * Build chronological cumulative vaccination progress series per family member
 * based on each member's personalized EPI scheduled doses and recorded completions.
 */
export function buildFamilyProgressSeries(
  profiles: Profile[],
  options: BuildFamilyProgressOptions = {},
): FamilyProgressDataset {
  const language: Language = options.language ?? 'en';
  const horizon: ProgressHorizon = options.horizon ?? 'active';
  const resolvedDateOptions: CalendarDateOptions = {
    timezone: BANGLADESH_TIMEZONE,
    ...options.dateOptions,
  };
  const referenceDate = resolveReferenceTodayISO(resolvedDateOptions);
  const currentMonthKey = referenceDate.slice(0, 7);

  if (profiles.length === 0) {
    return {
      points: [],
      members: [],
      currentMonthKey,
      hasScheduledDoses: false,
    };
  }

  interface ParsedMember {
    meta: MemberProgressMeta;
    dobMonthKey: string | null;
    scheduledMonths: string[];
    completedMonths: string[];
  }

  const parsedMembers: ParsedMember[] = profiles.map((profile, idx) => {
    const analysis = analyzeSchedule(profile.dateOfBirth, profile, resolvedDateOptions);
    const dobMonthKey = isValidISODate(profile.dateOfBirth)
      ? profile.dateOfBirth.slice(0, 7)
      : null;

    const scheduledMonths: string[] = [];
    const completedMonths: string[] = [];

    for (const dose of analysis.scheduled) {
      if (isValidISODate(dose.scheduledDate)) {
        scheduledMonths.push(dose.scheduledDate.slice(0, 7));
      }
      if (dose.status === 'completed') {
        const rawDone =
          dose.actualDate && isValidISODate(dose.actualDate) ? dose.actualDate : dose.scheduledDate;
        const rawMonth = rawDone.slice(0, 7);
        completedMonths.push(rawMonth > currentMonthKey ? currentMonthKey : rawMonth);
      }
    }

    return {
      meta: {
        id: profile.id,
        name: profile.name,
        lightColor: LIGHT_SERIES_COLORS[idx % LIGHT_SERIES_COLORS.length],
        darkColor: DARK_SERIES_COLORS[idx % DARK_SERIES_COLORS.length],
        currentPct: analysis.stats.ageEligibleProgressPercentage,
        completedToDate: analysis.stats.completedDueToDate,
        dueToDate: analysis.stats.dueToDateTotal,
        totalCompleted: analysis.stats.completed,
        totalScheduled: analysis.stats.totalScheduled,
      },
      dobMonthKey,
      scheduledMonths,
      completedMonths,
    };
  });

  const allScheduledMonths = parsedMembers.flatMap((m) => m.scheduledMonths);
  const allCompletedMonths = parsedMembers.flatMap((m) => m.completedMonths);
  const allEventMonths = [...allScheduledMonths, ...allCompletedMonths];
  const hasScheduledDoses = allScheduledMonths.length > 0;

  let monthKeys: string[];

  if (horizon === 'full') {
    const unique = new Set<string>([currentMonthKey, ...allEventMonths]);
    monthKeys = [...unique].sort();
  } else {
    const pastWindowStart = addMonthsToMonthKey(currentMonthKey, -11);
    const futureWindowEnd = addMonthsToMonthKey(currentMonthKey, 12);

    const earliestRelevant = allEventMonths.reduce<string | null>(
      (min, m) => (min === null || m < min ? m : min),
      null,
    );
    const latestInFutureWindow = allScheduledMonths
      .filter((m) => m <= futureWindowEnd)
      .reduce<string | null>((max, m) => (max === null || m > max ? m : max), null);

    const startMonth =
      earliestRelevant && earliestRelevant > pastWindowStart
        ? earliestRelevant
        : earliestRelevant && earliestRelevant < pastWindowStart
          ? pastWindowStart
          : addMonthsToMonthKey(currentMonthKey, -5);

    const fallbackPastStart =
      startMonth === currentMonthKey && !latestInFutureWindow
        ? addMonthsToMonthKey(currentMonthKey, -5)
        : startMonth;

    const endMonth =
      latestInFutureWindow && latestInFutureWindow > currentMonthKey
        ? latestInFutureWindow
        : currentMonthKey;

    monthKeys = enumerateMonthKeys(fallbackPastStart, endMonth);
  }

  const points: FamilyProgressPoint[] = monthKeys.map((mKey) => {
    const isCurrentMonth = mKey === currentMonthKey;
    const isFuture = mKey > currentMonthKey;

    let familyScheduled = 0;
    let familyCompleted = 0;

    const point: FamilyProgressPoint = {
      monthKey: mKey,
      label: formatShortMonth(mKey, language),
      fullLabel: formatFullMonth(mKey, language),
      isCurrentMonth,
      isFuture,
      familyCompleted: isFuture ? null : 0,
      familyScheduled: 0,
      familyPct: isFuture ? null : 100,
    };

    for (const member of parsedMembers) {
      const id = member.meta.id;
      const schedCum = member.scheduledMonths.filter((m) => m <= mKey).length;
      const doneCum = member.completedMonths.filter((m) => m <= mKey).length;

      const notBornYet =
        member.dobMonthKey !== null &&
        mKey < member.dobMonthKey &&
        schedCum === 0 &&
        doneCum === 0;

      if (notBornYet) {
        point[`scheduled_${id}`] = null;
        point[`completed_${id}`] = null;
        point[`pct_${id}`] = null;
        continue;
      }

      familyScheduled += schedCum;
      point[`scheduled_${id}`] = schedCum;

      if (isFuture) {
        point[`completed_${id}`] = null;
        point[`pct_${id}`] = null;
      } else {
        familyCompleted += doneCum;
        point[`completed_${id}`] = doneCum;
        point[`pct_${id}`] =
          schedCum > 0 ? Math.min(100, Math.round((doneCum / schedCum) * 100)) : 100;
      }
    }

    point.familyScheduled = familyScheduled;
    if (!isFuture) {
      point.familyCompleted = familyCompleted;
      point.familyPct =
        familyScheduled > 0
          ? Math.min(100, Math.round((familyCompleted / familyScheduled) * 100))
          : 100;
    }

    return point;
  });

  return {
    points,
    members: parsedMembers.map((m) => m.meta),
    currentMonthKey,
    hasScheduledDoses,
  };
}
