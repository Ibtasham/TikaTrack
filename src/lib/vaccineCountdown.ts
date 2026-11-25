import {
  BANGLADESH_TIMEZONE,
  daysBetween,
  parseISODate,
  resolveReferenceToday,
  type CalendarDateOptions,
} from './format';
import { analyzeSchedule, type ScheduledDose } from './smartScheduler';
import type { Profile } from '../types';

export type CountdownMode = 'due-today' | 'upcoming' | 'overdue-only' | 'complete';

export interface CountdownBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export interface VaccineCountdownState {
  profile: Profile;
  /** `true` when resolved via `relationship === 'self'`, `false` when falling back to first profile. */
  isSelfDesignated: boolean;
  mode: CountdownMode;
  /** Primary dose being counted down (or oldest overdue dose in `overdue-only` mode). */
  targetDose: ScheduledDose | null;
  /** All doses falling on the same scheduled date as `targetDose`. */
  sameDayDoses: ScheduledDose[];
  /** Next scheduled milestone after `targetDose`'s visit date, if one exists. */
  followingDose: ScheduledDose | null;
  /** Target local instant (`YYYY-MM-DD 09:00:00`) used for the live countdown. */
  targetInstant: Date | null;
  countdown: CountdownBreakdown;
  /** Calendar days remaining (0 when due today, negative when overdue). */
  daysRemaining: number;
  overdueCount: number;
  completedCount: number;
  totalScheduledCount: number;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Standard Bangladesh DGHS EPI outreach session morning start hour (09:00). */
export const EPI_SESSION_START_HOUR = 9;

/**
 * Resolve the primary user profile from household members.
 * Prefers a member explicitly marked `relationship === 'self'`, falling back to
 * the first household profile (`profiles[0]`).
 */
export function selectPrimaryProfile(profiles: Profile[]): Profile | null {
  if (profiles.length === 0) return null;
  return profiles.find((profile) => profile.relationship === 'self') ?? profiles[0];
}

/**
 * Convert a `YYYY-MM-DD` milestone date into the clinic session start timestamp
 * (`09:00:00` local time) for live day/hour/minute/second countdowns.
 */
export function computeTargetDateInstant(
  scheduledDate: string,
  hour = EPI_SESSION_START_HOUR,
): Date | null {
  const parsed = parseISODate(scheduledDate);
  if (!parsed) return null;
  parsed.setHours(hour, 0, 0, 0);
  return parsed;
}

/** Break a millisecond duration into whole days, hours, minutes, and seconds. */
export function splitCountdownMs(totalMs: number): CountdownBreakdown {
  const clamped = Math.max(0, Math.floor(totalMs));
  const days = Math.floor(clamped / MS_PER_DAY);
  const hours = Math.floor((clamped % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((clamped % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((clamped % MS_PER_MINUTE) / MS_PER_SECOND);
  return { days, hours, minutes, seconds, totalMs: clamped };
}

/**
 * Compute the next-dose countdown state for the primary user profile.
 */
export function buildVaccineCountdownState(
  profiles: Profile[],
  options: CalendarDateOptions & { profileId?: string } = {},
): VaccineCountdownState | null {
  const selected =
    (options.profileId ? profiles.find((p) => p.id === options.profileId) : undefined) ??
    selectPrimaryProfile(profiles);

  if (!selected) return null;

  const calendarOptions: CalendarDateOptions = {
    timezone: BANGLADESH_TIMEZONE,
    ...options,
  };
  const now = options.now ?? new Date();
  const refToday = resolveReferenceToday(calendarOptions);
  const analysis = analyzeSchedule(selected.dateOfBirth, selected, calendarOptions);

  const dueTodayDose = analysis.dueToday[0] ?? null;
  const upcomingDose = analysis.upcoming[0] ?? null;
  const overdueDose = analysis.potentiallyOverdue[0] ?? null;

  const isSelfDesignated = selected.relationship === 'self';
  const overdueCount = analysis.potentiallyOverdue.length;
  const completedCount = analysis.stats.completed;
  const totalScheduledCount = analysis.stats.totalScheduled;

  if (dueTodayDose) {
    const sameDayDoses = analysis.dueToday.filter(
      (dose) => dose.scheduledDate === dueTodayDose.scheduledDate,
    );
    const followingDose =
      analysis.upcoming.find((dose) => dose.scheduledDate > dueTodayDose.scheduledDate) ?? null;

    return {
      profile: selected,
      isSelfDesignated,
      mode: 'due-today',
      targetDose: dueTodayDose,
      sameDayDoses,
      followingDose,
      targetInstant: computeTargetDateInstant(dueTodayDose.scheduledDate),
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 },
      daysRemaining: 0,
      overdueCount,
      completedCount,
      totalScheduledCount,
    };
  }

  if (upcomingDose) {
    const sameDayDoses = analysis.upcoming.filter(
      (dose) => dose.scheduledDate === upcomingDose.scheduledDate,
    );
    const followingDose =
      analysis.upcoming.find((dose) => dose.scheduledDate > upcomingDose.scheduledDate) ?? null;
    const targetInstant = computeTargetDateInstant(upcomingDose.scheduledDate);
    const targetDateObj = parseISODate(upcomingDose.scheduledDate);
    const daysRemaining = targetDateObj ? daysBetween(refToday, targetDateObj) : upcomingDose.daysUntilDue;
    const rawDiffMs = targetInstant ? targetInstant.getTime() - now.getTime() : 0;

    return {
      profile: selected,
      isSelfDesignated,
      mode: 'upcoming',
      targetDose: upcomingDose,
      sameDayDoses,
      followingDose,
      targetInstant,
      countdown: splitCountdownMs(rawDiffMs),
      daysRemaining,
      overdueCount,
      completedCount,
      totalScheduledCount,
    };
  }

  if (overdueDose) {
    const sameDayDoses = analysis.potentiallyOverdue.filter(
      (dose) => dose.scheduledDate === overdueDose.scheduledDate,
    );
    return {
      profile: selected,
      isSelfDesignated,
      mode: 'overdue-only',
      targetDose: overdueDose,
      sameDayDoses,
      followingDose: null,
      targetInstant: computeTargetDateInstant(overdueDose.scheduledDate),
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 },
      daysRemaining: overdueDose.daysUntilDue,
      overdueCount,
      completedCount,
      totalScheduledCount,
    };
  }

  return {
    profile: selected,
    isSelfDesignated,
    mode: 'complete',
    targetDose: null,
    sameDayDoses: [],
    followingDose: null,
    targetInstant: null,
    countdown: { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 },
    daysRemaining: 0,
    overdueCount: 0,
    completedCount,
    totalScheduledCount,
  };
}
