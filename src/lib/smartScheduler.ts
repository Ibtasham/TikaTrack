/**
 * Smart Vaccination Scheduling Engine
 *
 * Derives what is due, what is overdue and what is already done from two things
 * only: the member's date of birth and their **dose ledger**.
 *
 * Before 3.0 this engine read `Record<vaccineId, DoseRecord>` — one slot per
 * vaccine — so a single recorded dose marked every dose of that antigen
 * complete, and `doseNumber` was hardcoded to `1`. It now asks the ledger which
 * *specific* dose of a series has been given (`lib/doseLedger`), so OPV-1 no
 * longer completes OPV-2 and OPV-3.
 *
 * What this engine deliberately does **not** do: invent minimum intervals,
 * maximum ages or catch-up dates. None is registered for Bangladesh in the
 * evidence layer (every `minimumIntervalFromPrevious` there is `needs-review`,
 * conflict C-005), so catch-up output says "as soon as possible, with a health
 * worker" instead of a fabricated number of days. The 2.x engine's "today + 7
 * days for every antigen" is gone on purpose.
 */

import { allVaccines, schedule, type Vaccine } from '../data/vaccines';
import {
  BANGLADESH_TIMEZONE,
  addCalendarMonths,
  addDays,
  calculateCalendarAge,
  daysBetween,
  isValidISODate,
  parseISODate,
  resolveReferenceToday,
  resolveReferenceTodayISO,
  toISODate,
  type CalendarDateOptions,
} from './format';
import {
  administeredForDose,
  analyzeDoseHistoryAnomalies,
  doseNumberForMilestone,
  milestoneDoseCount,
  MILESTONE_DOSES,
  SCHEDULE_VERSION,
  sortEvents,
  toDoseHistory,
  type AdministeredDose,
  type DoseAnomaly,
  type DoseHistory,
  type DoseHistoryInput,
} from './doseLedger';
import type { DoseAttribution, DoseStatus, VaccinationEvent } from '../types';

/** How a scheduled dose relates to the ledger. */
export type DoseMatch = DoseAttribution | 'none';

export type ScheduleCalculationBasis = 'birth' | 'age-days' | 'age-months';

export interface ScheduledDose {
  vaccineId: string;
  vaccineName: { en: string; bn: string };
  /** 1-based position of this dose in the vaccine's series. */
  doseNumber: number;
  /** How many doses the milestone schedule contains for this vaccine. */
  scheduledDoseCount: number;
  /** `vaccine.doses` as published in the dataset (may exceed the milestones). */
  totalDoses: number;
  /** Stable reference to the milestone this row came from (`opv#2@42d`). */
  scheduledDoseId: string;
  scheduledDate: string;
  scheduledAge: { days: number; weeks?: number; months?: number };
  /** Whether this milestone date was calculated from birth, fixed days/weeks, or clamped calendar months. */
  calculationBasis: ScheduleCalculationBasis;
  /** Relevant unresolved evidence conflict IDs for clinical transparency. */
  conflictIds: string[];
  status: DoseStatus;
  daysUntilDue: number;
  /** Date actually administered, when the ledger has one for this dose. */
  actualDate?: string;
  /** Ledger event behind `actualDate`, so the UI can edit or delete it. */
  recordId?: string;
  /** `exact` = the dose number was recorded; `provisional` = inferred. */
  attribution: DoseMatch;
  /** `true` when a human should confirm this row (usually a migrated record). */
  needsReview: boolean;
  notes?: string;
  centre?: string;
  batch?: string;
  manufacturer?: string;
  explanation: { en: string; bn: string };
  source: string;
  lastVerified: string;
}

export interface CatchUpPlan {
  vaccineId: string;
  vaccineName: { en: string; bn: string };
  /** Every dose of this vaccine that is still outstanding, ascending. */
  missedDoses: number[];
  /** Milestone ids of the outstanding doses. */
  missedDoseIds: string[];
  /** Human-readable milestone labels for the outstanding doses. */
  missedDoseLabels: { en: string; bn: string }[];
  /**
   * Always `null`. No minimum interval between doses is registered for
   * Bangladesh in the evidence layer, and this app does not invent one.
   */
  minimumInterval: null;
  /**
   * Always `null`, for the same reason. The UI shows "as soon as possible" and
   * points the family at a health worker.
   */
  recommendedNextDate: null;
  /** Where an interval would have come from, if one existed. */
  intervalSource: 'none';
  /** Days since the oldest outstanding dose fell due. */
  daysOverdue: number;
  explanation: { en: string; bn: string };
  /**
   * Always `true`: without registered intervals, catch-up sequencing is a
   * clinical decision. This used to be "overdue by more than 90 days", a
   * threshold with no source.
   */
  requiresMedicalAdvice: boolean;
  /** `true` when any part of the plan rests on a provisional (unconfirmed) dose. */
  requiresReview: boolean;
  /** Unresolved evidence conflict IDs limiting automated catch-up spacing (e.g. C-005, C-006). */
  conflictIds: string[];
  /** `true` when the member is >=7 years old, where pediatric EPI cutoffs require HCW verification. */
  olderAgeCaveat?: boolean;
}

export interface FamilyTimelineEvent {
  date: string;
  type: 'vaccination' | 'scheduled' | 'overdue' | 'reminder';
  profileId: string;
  profileName: string;
  vaccineId: string;
  vaccineName: { en: string; bn: string };
  status: DoseStatus;
  doseNumber?: number | null;
  /** The schedule's own name for the dose (`OPV-2`), when there is one. */
  doseLabel?: { en: string; bn: string };
  /** `false` for a dose recorded outside the national milestone schedule. */
  scheduled?: boolean;
  recordId?: string;
  attribution?: DoseMatch;
  needsReview?: boolean;
  notes?: string;
  centre?: string;
}

function conflictIdsForVaccine(vaccineId: string): string[] {
  return vaccineId === 'tcv' ? ['C-005', 'C-006'] : ['C-005'];
}

function basisForMilestone(ageDays: number, ageMonths?: number): ScheduleCalculationBasis {
  if (typeof ageMonths === 'number') return 'age-months';
  if (ageDays === 0) return 'birth';
  return 'age-days';
}

/**
 * Calculate age in days, weeks, months, and years from date of birth.
 */
export function calculateAge(
  dateOfBirth: string,
  options: CalendarDateOptions = {},
): {
  days: number;
  weeks: number;
  months: number;
  years: number;
} {
  const age = calculateCalendarAge(dateOfBirth, options);
  return {
    days: age.days,
    weeks: age.weeks,
    months: age.months,
    years: age.years,
  };
}

/**
 * Calculate scheduled date for a vaccine dose based on age (preferring exact
 * calendar months when `ageMonths` is provided, e.g. 9m and 15m milestones).
 */
export function calculateScheduledDate(
  dateOfBirth: string,
  ageInDays: number,
  ageMonths?: number,
  options: CalendarDateOptions = {},
): string {
  const birth = parseISODate(dateOfBirth);
  if (!birth) {
    return resolveReferenceTodayISO(options);
  }
  if (typeof ageMonths === 'number') {
    return toISODate(addCalendarMonths(birth, ageMonths));
  }
  return toISODate(addDays(birth, ageInDays));
}

/**
 * The dose name the national schedule actually uses (`Pentavalent-3`), rather
 * than the vaccine's generic name (`Pentavalent`).
 */
export function milestoneDoseName(dose: ScheduledDose, language: 'en' | 'bn'): string {
  const byId = MILESTONE_DOSES.find((row) => row.scheduledDoseId === dose.scheduledDoseId);
  if (byId) return byId.label[language];
  const milestone = schedule.find((entry) => entry.ageDays === dose.scheduledAge.days);
  const labelled = milestone?.vaccines.find((vaccine) => vaccine.id === dose.vaccineId);
  return labelled?.name[language] ?? dose.vaccineName[language] ?? dose.vaccineId;
}

/**
 * Determine vaccine status based on current calendar date and scheduled date.
 */
export function determineVaccineStatus(
  scheduledDate: string,
  actualDate?: string,
  options: CalendarDateOptions = {},
): DoseStatus {
  if (actualDate) {
    return 'completed';
  }

  const scheduled = parseISODate(scheduledDate);
  if (!scheduled) return 'upcoming';

  const diffDays = daysBetween(resolveReferenceToday(options), scheduled);

  if (diffDays === 0) {
    return 'due-today';
  } else if (diffDays < 0) {
    return 'overdue';
  } else {
    return 'upcoming';
  }
}

/**
 * Generate the personalised schedule: one row per **milestone dose**, each
 * marked complete only when the ledger holds that specific dose.
 */
export function generatePersonalizedSchedule(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): ScheduledDose[] {
  const doseHistory: DoseHistory = toDoseHistory(history);
  const scheduledDoses: ScheduledDose[] = [];
  const refToday = resolveReferenceToday(options);

  schedule.forEach((milestone) => {
    milestone.vaccines.forEach((vaccineInfo) => {
      const vaccine = allVaccines.find((v) => v.id === vaccineInfo.id);
      if (!vaccine) return;

      const doseNumber = doseNumberForMilestone(vaccine.id, milestone.ageDays) ?? 1;
      const scheduledDoseId =
        MILESTONE_DOSES.find(
          (row) => row.vaccineId === vaccine.id && row.ageDays === milestone.ageDays,
        )?.scheduledDoseId ?? `${vaccine.id}#${doseNumber}@${milestone.ageDays}d`;

      const scheduledDate = calculateScheduledDate(
        dateOfBirth,
        milestone.ageDays,
        milestone.ageMonths,
        options,
      );

      const given: AdministeredDose | undefined = administeredForDose(
        doseHistory,
        vaccine.id,
        doseNumber,
      );
      const status = determineVaccineStatus(scheduledDate, given?.date, options);

      const scheduled = parseISODate(scheduledDate);
      const daysUntilDue = scheduled ? daysBetween(refToday, scheduled) : 0;

      const attribution: DoseMatch = given ? given.attribution : 'none';
      const needsReview = given?.needsReview === true;
      const calculationBasis = basisForMilestone(milestone.ageDays, milestone.ageMonths);
      const conflictIds = conflictIdsForVaccine(vaccine.id);

      const explanation = generateVaccineExplanation(
        vaccine,
        milestone.ageDays,
        status,
        vaccineInfo.name,
        doseNumber,
        milestoneDoseCount(vaccine.id),
        attribution,
        milestone.ageMonths,
      );

      const dose: ScheduledDose = {
        vaccineId: vaccine.id,
        vaccineName: vaccine.name,
        doseNumber,
        scheduledDoseCount: milestoneDoseCount(vaccine.id),
        totalDoses: vaccine.doses,
        scheduledDoseId,
        scheduledDate,
        scheduledAge: {
          days: milestone.ageDays,
          weeks: Math.floor(milestone.ageDays / 7),
          months: milestone.ageMonths ?? Math.floor(milestone.ageDays / 30.44),
        },
        calculationBasis,
        conflictIds,
        status,
        daysUntilDue,
        attribution,
        needsReview,
        explanation,
        source: vaccine.source,
        lastVerified: vaccine.introduced,
      };

      if (given) {
        dose.actualDate = given.date;
        dose.recordId = given.eventId;
        if (given.notes) dose.notes = given.notes;
        if (given.centre) dose.centre = given.centre;
        if (given.batch) dose.batch = given.batch;
        if (given.manufacturer) dose.manufacturer = given.manufacturer;
      }

      scheduledDoses.push(dose);
    });
  });

  return scheduledDoses.sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledAge.days - b.scheduledAge.days,
  );
}

/**
 * Generate explanation for why a vaccine is recommended.
 */
function generateVaccineExplanation(
  vaccine: Vaccine,
  ageInDays: number,
  status: string,
  label: { en: string; bn: string },
  doseNumber: number,
  doseCount: number,
  attribution: DoseMatch,
  ageMonths?: number,
): { en: string; bn: string } {
  const ageText =
    typeof ageMonths === 'number'
      ? { en: `at ${ageMonths} months`, bn: `${ageMonths} মাসে` }
      : ageInDays === 0
        ? { en: 'at birth', bn: 'জন্মের সময়' }
        : ageInDays < 28
          ? { en: `at ${ageInDays} days`, bn: `${ageInDays} দিনে` }
          : ageInDays < 365
            ? {
                en: `at ${Math.floor(ageInDays / 7)} weeks`,
                bn: `${Math.floor(ageInDays / 7)} সপ্তাহে`,
              }
            : {
                en: `at ${Math.floor(ageInDays / 30.44)} months`,
                bn: `${Math.floor(ageInDays / 30.44)} মাসে`,
              };

  const statusText = {
    en:
      status === 'completed'
        ? 'This vaccine has been administered.'
        : status === 'due-today'
          ? 'This vaccine is due today.'
          : status === 'overdue'
            ? 'This vaccine is overdue and should be administered as soon as possible.'
            : 'This vaccine is scheduled for the future.',
    bn:
      status === 'completed'
        ? 'এই টিকা দেওয়া হয়েছে।'
        : status === 'due-today'
          ? 'এই টিকা আজ দেওয়ার কথা।'
          : status === 'overdue'
            ? 'এই টিকা বকেয়া এবং যত তাড়াতাড়ি সম্ভব দেওয়া উচিত।'
            : 'এই টিকা ভবিষ্যতের জন্য নির্ধারিত।',
  };

  const seriesText =
    doseCount > 1
      ? {
          en: ` This is dose ${doseNumber} of ${doseCount} in the series.`,
          bn: ` এটি এই সিরিজের ${doseCount}টি ডোজের মধ্যে ${doseNumber} নম্বর ডোজ।`,
        }
      : { en: '', bn: '' };

  const reviewText =
    attribution === 'provisional'
      ? {
          en: ' The dose number on this record was not confirmed — please check it against the paper card.',
          bn: ' এই রেকর্ডের ডোজ নম্বর নিশ্চিত করা হয়নি — কাগজের কার্ডের সাথে মিলিয়ে দেখুন।',
        }
      : { en: '', bn: '' };

  return {
    en: `${label.en} is recommended ${ageText.en} to prevent ${vaccine.disease.en}. ${vaccine.description.en}${seriesText.en} ${statusText.en}${reviewText.en}`,
    bn: `${label.bn} ${ageText.bn} ${vaccine.disease.bn} প্রতিরোধের জন্য সুপারিশকৃত। ${vaccine.description.bn}${seriesText.bn} ${statusText.bn}${reviewText.bn}`,
  };
}

/**
 * Generate catch-up plan for missed doses.
 *
 * No date and no interval are recommended: neither is registered for Bangladesh
 * (conflict C-005). `requiresMedicalAdvice` is always `true`.
 */
export function generateCatchUpPlan(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): CatchUpPlan[] {
  const doseHistory = toDoseHistory(history);
  const age = calculateAge(dateOfBirth, options);
  const today = resolveReferenceToday(options);
  const olderAgeCaveat = age.years >= 7;
  const byVaccine = new Map<
    string,
    {
      vaccine: Vaccine;
      missed: number[];
      ids: string[];
      labels: { en: string; bn: string }[];
      maxOverdueDays: number;
      provisional: boolean;
    }
  >();

  schedule.forEach((milestone) => {
    const scheduledDate = calculateScheduledDate(
      dateOfBirth,
      milestone.ageDays,
      milestone.ageMonths,
      options,
    );
    const scheduled = parseISODate(scheduledDate);
    const milestoneOverdueDays = scheduled
      ? daysBetween(scheduled, today)
      : age.days - milestone.ageDays;
    if (milestoneOverdueDays < 0) return;

    milestone.vaccines.forEach((vaccineInfo) => {
      const vaccine = allVaccines.find((v) => v.id === vaccineInfo.id);
      if (!vaccine) return;

      const doseNumber = doseNumberForMilestone(vaccine.id, milestone.ageDays) ?? 1;
      const given = administeredForDose(doseHistory, vaccine.id, doseNumber);
      if (given) return;

      const scheduledDoseId =
        MILESTONE_DOSES.find(
          (row) => row.vaccineId === vaccine.id && row.ageDays === milestone.ageDays,
        )?.scheduledDoseId ?? `${vaccine.id}#${doseNumber}@${milestone.ageDays}d`;

      const entry = byVaccine.get(vaccine.id) ?? {
        vaccine,
        missed: [],
        ids: [],
        labels: [],
        maxOverdueDays: milestoneOverdueDays,
        provisional: false,
      };
      entry.missed.push(doseNumber);
      entry.ids.push(scheduledDoseId);
      entry.labels.push(vaccineInfo.name);
      entry.maxOverdueDays = Math.max(entry.maxOverdueDays, milestoneOverdueDays);
      const state = doseHistory[vaccine.id];
      if (state && state.provisionalDoseNumbers.length > 0) entry.provisional = true;
      byVaccine.set(vaccine.id, entry);
    });
  });

  const plans: CatchUpPlan[] = [];
  for (const { vaccine, missed, ids, labels, maxOverdueDays, provisional } of byVaccine.values()) {
    const daysOverdue = Math.max(maxOverdueDays, 0);
    const missedList = missed.map((_, index) => labels[index]?.en ?? vaccine.name.en).join(', ');
    const missedListBn = missed.map((_, index) => labels[index]?.bn ?? vaccine.name.bn).join(', ');
    const conflictIds = conflictIdsForVaccine(vaccine.id);
    const ageNoteEn = olderAgeCaveat
      ? ' Note: because the member is aged 7+ years, an EPI health worker must verify current age eligibility.'
      : '';
    const ageNoteBn = olderAgeCaveat
      ? ' দ্রষ্টব্য: সদস্যের বয়স ৭ বছর বা তার বেশি হওয়ায় বর্তমানে ইপিআই ডোজটি প্রযোজ্য কিনা স্বাস্থ্যকর্মীর সাথে যাচাই করুন।'
      : '';

    plans.push({
      vaccineId: vaccine.id,
      vaccineName: vaccine.name,
      missedDoses: [...missed].sort((a, b) => a - b),
      missedDoseIds: ids,
      missedDoseLabels: labels,
      minimumInterval: null,
      recommendedNextDate: null,
      intervalSource: 'none',
      daysOverdue,
      explanation: {
        en: `${vaccine.name.en}: ${missedList} ${missed.length > 1 ? 'are' : 'is'} still outstanding, the oldest by ${daysOverdue} days. No minimum interval between doses is registered for Bangladesh, so a health worker should plan the order and timing. TikaTrack does not recommend a date.${ageNoteEn}`,
        bn: `${vaccine.name.bn}: ${missedListBn} এখনও বাকি আছে, এর মধ্যে সবচেয়ে পুরোনোটি ${daysOverdue} দিন আগে দেওয়ার কথা ছিল। বাংলাদেশের জন্য ডোজের মধ্যে সর্বনিম্ন বিরতি নিবন্ধিত নেই, তাই একজন স্বাস্থ্যকর্মী ক্রম ও সময় নির্ধারণ করবেন। টিকাট্র্যাক কোনো তারিখ সুপারিশ করে না।${ageNoteBn}`,
      },
      requiresMedicalAdvice: true,
      requiresReview: provisional,
      conflictIds,
      ...(olderAgeCaveat ? { olderAgeCaveat: true } : {}),
    });
  }

  return plans.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Generate family timeline with all events, including unscheduled/private doses.
 */
export function generateFamilyTimeline(
  profiles: Array<{
    id: string;
    name: string;
    dateOfBirth: string;
    events?: readonly VaccinationEvent[];
    records?: Record<string, { date: string; notes?: string }>;
  }>,
  options: CalendarDateOptions = {},
): FamilyTimelineEvent[] {
  const events: FamilyTimelineEvent[] = [];

  profiles.forEach((profile) => {
    const scheduledDoses = generatePersonalizedSchedule(profile.dateOfBirth, profile, options);
    const matchedRecordIds = new Set<string>();

    scheduledDoses.forEach((dose) => {
      if (dose.recordId) matchedRecordIds.add(dose.recordId);
      events.push({
        date: dose.actualDate || dose.scheduledDate,
        type:
          dose.status === 'completed'
            ? 'vaccination'
            : dose.status === 'overdue'
              ? 'overdue'
              : dose.status === 'due-today'
                ? 'reminder'
                : 'scheduled',
        profileId: profile.id,
        profileName: profile.name,
        vaccineId: dose.vaccineId,
        vaccineName: dose.vaccineName,
        status: dose.status,
        doseNumber: dose.doseNumber,
        doseLabel: {
          en: milestoneDoseName(dose, 'en'),
          bn: milestoneDoseName(dose, 'bn'),
        },
        scheduled: true,
        recordId: dose.recordId,
        attribution: dose.attribution,
        needsReview: dose.needsReview,
        notes: dose.notes,
        centre: dose.centre,
      });
    });

    for (const event of profile.events ?? []) {
      if (matchedRecordIds.has(event.id)) continue;
      const vaccine = allVaccines.find((candidate) => candidate.id === event.vaccineId);
      events.push({
        date: event.date,
        type: 'vaccination',
        profileId: profile.id,
        profileName: profile.name,
        vaccineId: event.vaccineId,
        vaccineName: vaccine?.name ?? { en: event.vaccineId, bn: event.vaccineId },
        status: 'completed',
        doseNumber: event.doseNumber,
        scheduled: false,
        recordId: event.id,
        attribution: event.doseNumber === null ? 'provisional' : 'exact',
        needsReview: event.needsReview === true,
        notes: event.notes,
        centre: event.centre,
      });
    }
  });

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export interface VaccinationStats {
  totalScheduled: number;
  completed: number;
  upcoming: number;
  overdue: number;
  dueToday: number;
  progressPercentage: number;
  /** Doses actually in the ledger, including ones outside the milestone schedule. */
  dosesRecorded: number;
  /** Completed rows whose dose number was inferred rather than recorded. */
  provisional: number;
  /** Ledger events a human should confirm. */
  needsReview: number;
  /** Completed scheduled doses confirmed with an exact dose number. */
  confirmedCompleted: number;
  /** Completed scheduled doses matched provisionally (alias of `provisional` for clarity). */
  provisionalCompleted: number;
  /** Total scheduled doses whose target date has arrived on or before `referenceDate`. */
  dueToDateTotal: number;
  /** Scheduled doses already completed among those due on or before `referenceDate`. */
  completedDueToDate: number;
  /** Percentage of doses due to date that have been completed (100% if none due yet). */
  ageEligibleProgressPercentage: number;
  /** Recorded doses that do not satisfy a national milestone (unscheduled, duplicates, excess). */
  offScheduleDosesRecorded: number;
  /** Ledger events that carry uncertain/unconfirmed fields or flags. */
  uncertainRecordsCount: number;
  /** Reference calendar date used for all comparisons (`YYYY-MM-DD`). */
  referenceDate: string;
  /** Timezone identifier used to compute `referenceDate`. */
  timezone: string;
}

/**
 * Calculate vaccination statistics for a profile.
 */
export function calculateVaccinationStats(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): VaccinationStats {
  const doseHistory = toDoseHistory(history);
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, doseHistory, options);
  const referenceDate = resolveReferenceTodayISO(options);
  const timezone =
    options.timezone === 'local'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
      : options.timezone ?? BANGLADESH_TIMEZONE;

  const completed = scheduledDoses.filter((d) => d.status === 'completed').length;
  const upcoming = scheduledDoses.filter((d) => d.status === 'upcoming').length;
  const overdue = scheduledDoses.filter((d) => d.status === 'overdue').length;
  const dueToday = scheduledDoses.filter((d) => d.status === 'due-today').length;
  const totalScheduled = scheduledDoses.length;

  const progressPercentage =
    totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;

  const confirmedCompleted = scheduledDoses.filter(
    (d) => d.status === 'completed' && d.attribution === 'exact',
  ).length;
  const provisionalCompleted = scheduledDoses.filter(
    (d) => d.status === 'completed' && d.attribution === 'provisional',
  ).length;

  const dueToDateRows = scheduledDoses.filter((d) => d.scheduledDate <= referenceDate);
  const dueToDateTotal = dueToDateRows.length;
  const completedDueToDate = dueToDateRows.filter((d) => d.status === 'completed').length;
  const ageEligibleProgressPercentage =
    dueToDateTotal > 0 ? Math.round((completedDueToDate / dueToDateTotal) * 100) : 100;

  const matchedRecordIds = new Set(
    scheduledDoses.map((d) => d.recordId).filter((id): id is string => Boolean(id)),
  );

  const dosesRecorded = Object.values(doseHistory).reduce(
    (total, state) => total + state.administered.length,
    0,
  );
  const offScheduleDosesRecorded = Object.values(doseHistory).reduce(
    (total, state) =>
      total + state.administered.filter((dose) => !matchedRecordIds.has(dose.eventId)).length,
    0,
  );
  const needsReview = Object.values(doseHistory).reduce(
    (total, state) => total + state.administered.filter((dose) => dose.needsReview).length,
    0,
  );

  return {
    totalScheduled,
    completed,
    upcoming,
    overdue,
    dueToday,
    progressPercentage,
    dosesRecorded,
    provisional: provisionalCompleted,
    needsReview,
    confirmedCompleted,
    provisionalCompleted,
    dueToDateTotal,
    completedDueToDate,
    ageEligibleProgressPercentage,
    offScheduleDosesRecorded,
    uncertainRecordsCount: needsReview,
    referenceDate,
    timezone,
  };
}

/**
 * Get next upcoming vaccination for a profile.
 */
export function getNextUpcomingVaccination(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): ScheduledDose | null {
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, toDoseHistory(history), options);
  const upcoming = scheduledDoses.filter(
    (d) => d.status === 'upcoming' || d.status === 'due-today',
  );

  if (upcoming.length === 0) return null;

  return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];
}

/**
 * Get all overdue vaccinations for a profile.
 */
export function getOverdueVaccinations(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): ScheduledDose[] {
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, toDoseHistory(history), options);
  return scheduledDoses.filter((d) => d.status === 'overdue');
}

export type CatchUpValidationReason =
  | 'vaccine-not-found'
  | 'invalid-date'
  | 'past-date'
  | 'too-young'
  | 'already-recorded'
  | 'valid';

/**
 * Validate a proposed catch-up date.
 *
 * Checks only what this app actually knows: that the vaccine exists, that the
 * date is valid and not in the past, that the proposed date is not before the
 * member reaches the target milestone age, and that the dose has not already
 * been recorded. Never invents minimum intervals between doses.
 */
export function validateCatchUpSchedule(
  dateOfBirth: string,
  vaccineId: string,
  proposedDate: string,
  history: DoseHistoryInput = {},
  doseNumber?: number | null,
  options: CalendarDateOptions = {},
): { isValid: boolean; reason: { en: string; bn: string }; code: CatchUpValidationReason } {
  const vaccine = allVaccines.find((v) => v.id === vaccineId);
  if (!vaccine) {
    return {
      isValid: false,
      code: 'vaccine-not-found',
      reason: {
        en: 'Vaccine not found',
        bn: 'টিকা পাওয়া যায়নি',
      },
    };
  }

  if (!isValidISODate(proposedDate)) {
    return {
      isValid: false,
      code: 'invalid-date',
      reason: { en: 'That date could not be read', bn: 'তারিখটি পড়া যায়নি' },
    };
  }

  const proposed = parseISODate(proposedDate);
  if (!proposed) {
    return {
      isValid: false,
      code: 'invalid-date',
      reason: { en: 'That date could not be read', bn: 'তারিখটি পড়া যায়নি' },
    };
  }

  if (proposed < resolveReferenceToday(options)) {
    return {
      isValid: false,
      code: 'past-date',
      reason: {
        en: 'Proposed date must be in the future',
        bn: 'প্রস্তাবিত তারিখ ভবিষ্যতে হতে হবে',
      },
    };
  }

  // Check dose-specific milestone target date (falling back to the earliest milestone for this vaccine)
  const targetMilestone =
    (typeof doseNumber === 'number' && doseNumber > 0
      ? MILESTONE_DOSES.find((m) => m.vaccineId === vaccineId && m.doseNumber === doseNumber)
      : undefined) ?? MILESTONE_DOSES.find((m) => m.vaccineId === vaccineId);

  if (targetMilestone && isValidISODate(dateOfBirth)) {
    const earliestEligibleDate = calculateScheduledDate(
      dateOfBirth,
      targetMilestone.ageDays,
      targetMilestone.ageMonths,
      options,
    );
    if (proposedDate < earliestEligibleDate) {
      const basisLabelEn =
        typeof targetMilestone.ageMonths === 'number'
          ? `${targetMilestone.ageMonths} months`
          : targetMilestone.ageDays === 0
            ? 'birth'
            : `${Math.floor(targetMilestone.ageDays / 7)} weeks`;
      const basisLabelBn =
        typeof targetMilestone.ageMonths === 'number'
          ? `${targetMilestone.ageMonths} মাস`
          : targetMilestone.ageDays === 0
            ? 'জন্ম'
            : `${Math.floor(targetMilestone.ageDays / 7)} সপ্তাহ`;

      return {
        isValid: false,
        code: 'too-young',
        reason: {
          en: `Child is too young on ${proposedDate}. Earliest eligible milestone age (${basisLabelEn}) starts on ${earliestEligibleDate}.`,
          bn: `${proposedDate} তারিখে শিশুর বয়স কম। ন্যূনতম ধাপ (${basisLabelBn}) শুরু হবে ${earliestEligibleDate} তারিখে।`,
        },
      };
    }
  }

  if (typeof doseNumber === 'number' && doseNumber > 0) {
    const given = administeredForDose(toDoseHistory(history), vaccineId, doseNumber);
    if (given) {
      return {
        isValid: false,
        code: 'already-recorded',
        reason: {
          en: `Dose ${doseNumber} of ${vaccine.name.en} is already recorded as given on ${given.date}.`,
          bn: `${vaccine.name.bn}-এর ${doseNumber} নম্বর ডোজ ${given.date} তারিখে দেওয়া হিসেবে আগেই যুক্ত আছে।`,
        },
      };
    }
  }

  return {
    isValid: true,
    code: 'valid',
    reason: {
      en: 'Catch-up schedule is safe and valid',
      bn: 'ক্যাচ-আপ শিডিউল নিরাপদ এবং বৈধ',
    },
  };
}

// ---------------------------------------------------------------------------
// Comprehensive evidence-driven schedule analysis (for intelligent UI & audit)
// ---------------------------------------------------------------------------

export interface ScheduleLimitation {
  id:
    | 'bangladesh-timezone'
    | 'calendar-month-vs-days'
    | 'no-invented-intervals'
    | 'tcv-circular-pending'
    | 'self-reported-verification';
  severity: 'info' | 'clinical';
  title: { en: string; bn: string };
  description: { en: string; bn: string };
}

export interface HcwReviewItem {
  id: string;
  reason:
    | 'overdue-catch-up'
    | 'uncertain-record'
    | 'history-anomaly'
    | 'older-age-eligibility'
    | 'pending-tcv-circular';
  vaccineId?: string;
  eventId?: string;
  conflictIds: string[];
  summary: { en: string; bn: string };
}

export interface ScheduleAnalysis {
  referenceDate: string;
  timezone: string;
  dobValid: boolean;
  isFutureDob: boolean;
  isLeapBirth: boolean;
  age: ReturnType<typeof calculateCalendarAge>;
  stats: VaccinationStats;
  scheduled: ScheduledDose[];
  completedConfirmed: ScheduledDose[];
  completedProvisional: ScheduledDose[];
  dueToday: ScheduledDose[];
  upcoming: ScheduledDose[];
  potentiallyOverdue: ScheduledDose[];
  catchUpPlans: CatchUpPlan[];
  offScheduleEvents: VaccinationEvent[];
  anomalies: DoseAnomaly[];
  hcwReviewItems: HcwReviewItem[];
  limitations: ScheduleLimitation[];
}

function extractRawEvents(history: DoseHistoryInput): VaccinationEvent[] {
  if (!history) return [];
  if (Array.isArray(history)) return sortEvents(history as VaccinationEvent[]);
  if (typeof history === 'object' && 'events' in history && Array.isArray(history.events)) {
    return sortEvents(history.events);
  }
  return [];
}

/**
 * Produce a structured, evidence-transparent analysis of a member's
 * immunisation schedule, separating confirmed vs provisional completions,
 * upcoming vs potentially overdue doses, off-schedule records, ledger
 * anomalies, items needing healthcare-worker review, and explicit engine
 * limitations (including unresolved conflicts C-005 and C-006).
 */
export function analyzeSchedule(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
  options: CalendarDateOptions = {},
): ScheduleAnalysis {
  const resolvedOptions: CalendarDateOptions = {
    timezone: BANGLADESH_TIMEZONE,
    ...options,
  };
  const referenceDate = resolveReferenceTodayISO(resolvedOptions);
  const timezone =
    resolvedOptions.timezone === 'local'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
      : resolvedOptions.timezone ?? BANGLADESH_TIMEZONE;

  const age = calculateCalendarAge(dateOfBirth, resolvedOptions);
  const scheduled = generatePersonalizedSchedule(dateOfBirth, history, resolvedOptions);
  const stats = calculateVaccinationStats(dateOfBirth, history, resolvedOptions);
  const catchUpPlans = generateCatchUpPlan(dateOfBirth, history, resolvedOptions);

  const completedConfirmed = scheduled.filter(
    (d) => d.status === 'completed' && d.attribution === 'exact',
  );
  const completedProvisional = scheduled.filter(
    (d) => d.status === 'completed' && d.attribution === 'provisional',
  );
  const dueToday = scheduled.filter((d) => d.status === 'due-today');
  const upcoming = scheduled.filter((d) => d.status === 'upcoming');
  const potentiallyOverdue = scheduled.filter((d) => d.status === 'overdue');

  const rawEvents = extractRawEvents(history);
  const matchedIds = new Set(
    scheduled.map((d) => d.recordId).filter((id): id is string => Boolean(id)),
  );
  const offScheduleEvents = rawEvents.filter((ev) => !matchedIds.has(ev.id));
  const anomalies = analyzeDoseHistoryAnomalies(rawEvents, dateOfBirth, resolvedOptions);

  const hcwReviewItems: HcwReviewItem[] = [];

  for (const plan of catchUpPlans) {
    hcwReviewItems.push({
      id: `hcw:catchup:${plan.vaccineId}`,
      reason: plan.olderAgeCaveat ? 'older-age-eligibility' : 'overdue-catch-up',
      vaccineId: plan.vaccineId,
      conflictIds: plan.conflictIds,
      summary: plan.explanation,
    });
  }

  for (const dose of completedProvisional) {
    hcwReviewItems.push({
      id: `hcw:provisional:${dose.scheduledDoseId}`,
      reason: 'uncertain-record',
      vaccineId: dose.vaccineId,
      eventId: dose.recordId,
      conflictIds: dose.conflictIds,
      summary: {
        en: `${milestoneDoseName(dose, 'en')} was matched provisionally without a recorded dose number (${dose.actualDate ?? ''}). Verify against the paper vaccination card.`,
        bn: `${milestoneDoseName(dose, 'bn')} ডোজ নম্বর ছাড়া সাময়িকভাবে মিলানো হয়েছে (${dose.actualDate ?? ''})। কাগজের টিকা কার্ডের সাথে যাচাই করুন।`,
      },
    });
  }

  for (const anomaly of anomalies) {
    if (
      anomaly.type === 'legacy-dose-number-unknown' ||
      anomaly.type === 'dose-number-unknown'
    ) {
      continue;
    }
    hcwReviewItems.push({
      id: `hcw:anomaly:${anomaly.id}`,
      reason: 'history-anomaly',
      vaccineId: anomaly.vaccineId,
      eventId: anomaly.eventId,
      conflictIds: conflictIdsForVaccine(anomaly.vaccineId),
      summary: anomaly.description,
    });
  }

  const tcvRow = scheduled.find((d) => d.vaccineId === 'tcv');
  if (tcvRow && tcvRow.status !== 'completed') {
    hcwReviewItems.push({
      id: 'hcw:tcv-circular',
      reason: 'pending-tcv-circular',
      vaccineId: 'tcv',
      conflictIds: ['C-006'],
      summary: {
        en: 'Routine EPI primary TCV integration circular (15 months) is pending official publication after the campaign phase (Conflict C-006); confirm local clinic stock.',
        bn: 'ক্যাম্পেইনের পর ১৫ মাস বয়সে নিয়মিত ইপিআই TCV যুক্ত করার সরকারি সার্কুলার এখনও অপেক্ষমাণ (তথ্য বিরোধ C-006); স্থানীয় টিকাদান কেন্দ্রে প্রাপ্যতা যাচাই করুন।',
      },
    });
  }

  const limitations: ScheduleLimitation[] = [
    {
      id: 'bangladesh-timezone',
      severity: 'info',
      title: {
        en: `Bangladesh calendar reference (${BANGLADESH_TIMEZONE}, UTC+6)`,
        bn: `বাংলাদেশ ক্যালেন্ডার সময় অঞ্চল (${BANGLADESH_TIMEZONE}, UTC+6)`,
      },
      description: {
        en: `Eligibility and due-today statuses are evaluated against calendar date ${referenceDate} in ${timezone}, preventing UTC midnight off-by-one shifts.`,
        bn: `বয়স ও আজ প্রাপ্য কিনা তা ${timezone} সময় অনুযায়ী ${referenceDate} তারিখের ভিত্তিতে হিসাব করা হয়, যাতে UTC মধ্যরাতের কারণে তারিখ এক দিন সরে না যায়।`,
      },
    },
    {
      id: 'calendar-month-vs-days',
      severity: 'info',
      title: {
        en: 'Week-based vs calendar-month milestones',
        bn: 'সপ্তাহ-ভিত্তিক ও মাস-ভিত্তিক হিসাবের পার্থক্য',
      },
      description: {
        en: 'Early infant milestones (6, 10, 14 weeks) use exact 7-day intervals (42, 70, 98 days), whereas 9-month (MR-1) and 15-month (MR-2, TCV) milestones use exact calendar months clamped to month-end for 29/30/31 births.',
        bn: 'শিশুর প্রাথমিক ডোজ (৬, ১০, ১৪ সপ্তাহ) যথাক্রমে ৪২, ৭০ ও ৯৮ দিন ব্যবধানে এবং ৯ মাস (MR-1) ও ১৫ মাস (MR-2, TCV) ক্যালেন্ডার মাস অনুযায়ী হিসাব হয়।',
      },
    },
    {
      id: 'no-invented-intervals',
      severity: 'clinical',
      title: {
        en: 'No automated catch-up dates or minimum intervals (Conflict C-005)',
        bn: 'স্বয়ংক্রিয় ক্যাচ-আপ তারিখ বা সর্বনিম্ন বিরতি অনুপস্থিত (C-005)',
      },
      description: {
        en: 'Because Bangladesh DGHS minimum dose-spacing and domestic upper-age cutoffs are not yet backed by an authoritative published circular (Conflict C-005), overdue doses list "consult health worker" instead of inventing dates.',
        bn: 'বাংলাদেশ ডিজিএইচএস-এর আনুষ্ঠানিক সর্বনিম্ন বিরতি ও সর্বোচ্চ বয়সসীমার সার্কুলার নিবন্ধিত না থাকায় (বিরোধ C-005) বকেয়া ডোজের জন্য কোনো কাল্পনিক তারিখ দেখানো হয় না।',
      },
    },
    {
      id: 'tcv-circular-pending',
      severity: 'clinical',
      title: {
        en: 'Typhoid (TCV) routine EPI circular status (Conflict C-006)',
        bn: 'টাইফয়েড (TCV) নিয়মিত ইপিআই সার্কুলার অবস্থা (C-006)',
      },
      description: {
        en: 'TCV is displayed at the 15-month visit, but final DGHS routine rollout timing after campaign launch remains unconfirmed in evidence (C-006).',
        bn: '১৫ মাসে TCV দেখানো হলেও ক্যাম্পেইন-পরবর্তী নিয়মিত ইপিআই প্রাপ্যতার চূড়ান্ত সরকারি সার্কুলার এখনও নিবন্ধিত হয়নি (C-006)।',
      },
    },
    {
      id: 'self-reported-verification',
      severity: 'info',
      title: {
        en: 'Self-reported digital ledger vs EPI clinic card',
        bn: 'ব্যক্তিগত ডিজিটাল রেকর্ড বনাম সরকারি ইপিআই কার্ড',
      },
      description: {
        en: 'TikaTrack stores family-entered records and cannot verify clinic lot validity or replace an official Bangladesh DGHS vaccination card.',
        bn: 'টিকাট্র্যাক পরিবারের নিজস্ব এন্ট্রি সংরক্ষণ করে; এটি সরকারি ইপিআই কার্ড বা স্বাস্থ্যকর্মীর ক্লিনিক্যাল সিদ্ধান্তের বিকল্প নয়।',
      },
    },
  ];

  return {
    referenceDate,
    timezone,
    dobValid: age.isValid,
    isFutureDob: age.isFutureDob,
    isLeapBirth: age.isLeapBirth,
    age,
    stats,
    scheduled,
    completedConfirmed,
    completedProvisional,
    dueToday,
    upcoming,
    potentiallyOverdue,
    catchUpPlans,
    offScheduleEvents,
    anomalies,
    hcwReviewItems,
    limitations,
  };
}

/** Which schedule version the current milestone table represents. */
export function currentScheduleVersion(): string {
  return SCHEDULE_VERSION;
}

