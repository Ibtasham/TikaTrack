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
import { addDays, daysBetween, parseISODate, startOfToday, toISODate, todayISO } from './format';
import {
  administeredForDose,
  doseNumberForMilestone,
  milestoneDoseCount,
  MILESTONE_DOSES,
  SCHEDULE_VERSION,
  toDoseHistory,
  type AdministeredDose,
  type DoseHistory,
  type DoseHistoryInput,
} from './doseLedger';
import type { DoseAttribution, DoseStatus, VaccinationEvent } from '../types';

/** How a scheduled dose relates to the ledger. */
export type DoseMatch = DoseAttribution | 'none';

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

/**
 * Calculate age in days, weeks, and months from date of birth
 */
export function calculateAge(dateOfBirth: string): {
  days: number;
  weeks: number;
  months: number;
  years: number;
} {
  // `parseISODate` builds a *local* date: `new Date('2026-01-01')` would be
  // UTC midnight, which is the previous calendar day west of Greenwich and
  // silently shifts every age by one.
  const birth = parseISODate(dateOfBirth);
  const today = new Date();

  // An invalid or empty date-of-birth must degrade to zero, never throw: one
  // malformed record should not take down the whole schedule view.
  if (!birth) {
    return { days: 0, weeks: 0, months: 0, years: 0 };
  }

  const days = daysBetween(birth, today);
  const weeks = Math.floor(days / 7);
  // Calendar-based years/months, not days/30.44: a child born exactly nine
  // months ago is nine months old, not eight (floor(273 / 30.44) === 8).
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    // A future date-of-birth is nonsense; clamp rather than report negative age.
    years = 0;
    months = 0;
  }

  return { days, weeks, months, years };
}

/**
 * Calculate scheduled date for a vaccine dose based on age
 */
export function calculateScheduledDate(dateOfBirth: string, ageInDays: number): string {
  const birth = parseISODate(dateOfBirth);
  if (!birth) {
    // Bad date-of-birth: treat the dose as due today instead of returning NaN.
    return todayISO();
  }
  // toISODate (not toISOString): a locally-built date serialised through UTC
  // lands on the previous day for every user east of Greenwich.
  return toISODate(addDays(birth, ageInDays));
}

/**
 * The dose name the national schedule actually uses (`Pentavalent-3`), rather
 * than the vaccine's generic name (`Pentavalent`).
 *
 * `generatePersonalizedSchedule` records one entry per milestone, and the same
 * vaccine appears in several of them; a reminder that says "Pentavalent is due"
 * does not tell a parent which visit to attend.
 */
export function milestoneDoseName(dose: ScheduledDose, language: 'en' | 'bn'): string {
  const byId = MILESTONE_DOSES.find((row) => row.scheduledDoseId === dose.scheduledDoseId);
  if (byId) return byId.label[language];
  // Fallback for a row built by hand (tests, older callers): match on age.
  const milestone = schedule.find((entry) => entry.ageDays === dose.scheduledAge.days);
  const labelled = milestone?.vaccines.find((vaccine) => vaccine.id === dose.vaccineId);
  return labelled?.name[language] ?? dose.vaccineName[language] ?? dose.vaccineId;
}

/**
 * Determine vaccine status based on current date and scheduled date
 */
export function determineVaccineStatus(scheduledDate: string, actualDate?: string): DoseStatus {
  if (actualDate) {
    return 'completed';
  }

  const scheduled = parseISODate(scheduledDate);
  // Unparseable dates keep the previous behaviour: nothing is overdue.
  if (!scheduled) return 'upcoming';

  const diffDays = daysBetween(startOfToday(), scheduled);

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
 *
 * `history` may be a profile, a ledger, a per-vaccine dose history, or a legacy
 * 2.x `records` map — `toDoseHistory` normalises all of them, and every one of
 * those paths ends in the same per-dose attribution.
 */
export function generatePersonalizedSchedule(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
): ScheduledDose[] {
  const doseHistory: DoseHistory = toDoseHistory(history);
  const scheduledDoses: ScheduledDose[] = [];

  // Process each age milestone from the schedule
  schedule.forEach((milestone) => {
    milestone.vaccines.forEach((vaccineInfo) => {
      const vaccine = allVaccines.find((v) => v.id === vaccineInfo.id);
      if (!vaccine) return;

      // Which dose of the series this milestone is. Derived from the milestone
      // table (see `doseLedger.MILESTONE_DOSES`), never assumed to be 1.
      const doseNumber = doseNumberForMilestone(vaccine.id, milestone.ageDays) ?? 1;
      const scheduledDoseId =
        MILESTONE_DOSES.find(
          (row) => row.vaccineId === vaccine.id && row.ageDays === milestone.ageDays,
        )?.scheduledDoseId ?? `${vaccine.id}#${doseNumber}@${milestone.ageDays}d`;

      // Calculate scheduled date
      const scheduledDate = calculateScheduledDate(dateOfBirth, milestone.ageDays);

      // Has *this* dose been given? Not "has this vaccine been recorded".
      const given: AdministeredDose | undefined = administeredForDose(
        doseHistory,
        vaccine.id,
        doseNumber,
      );
      const status = determineVaccineStatus(scheduledDate, given?.date);

      // Calculate days until due (whole calendar days, timezone-safe)
      const scheduled = parseISODate(scheduledDate);
      const daysUntilDue = scheduled ? daysBetween(startOfToday(), scheduled) : 0;

      const attribution: DoseMatch = given ? given.attribution : 'none';
      const needsReview = given?.needsReview === true;

      // Generate explanation
      const explanation = generateVaccineExplanation(
        vaccine,
        milestone.ageDays,
        status,
        vaccineInfo.name,
        doseNumber,
        milestoneDoseCount(vaccine.id),
        attribution,
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
          months: Math.floor(milestone.ageDays / 30.44),
        },
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

  // Sort by scheduled date
  return scheduledDoses.sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  );
}

/**
 * Generate explanation for why a vaccine is recommended
 */
function generateVaccineExplanation(
  vaccine: Vaccine,
  ageInDays: number,
  status: string,
  label: { en: string; bn: string },
  doseNumber: number,
  doseCount: number,
  attribution: DoseMatch,
): { en: string; bn: string } {
  const ageText =
    ageInDays === 0
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

  // Name the specific visit (`Pentavalent-2`), and say which dose of the series
  // it is, so a parent of a child mid-series knows exactly what to ask for.
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
 * One entry per vaccine, listing **every** dose of that vaccine still
 * outstanding. A vaccine with one recorded dose and two outstanding ones appears
 * here with `missedDoses: [2, 3]` — under the 2.x single-slot record it did not
 * appear at all.
 *
 * No date and no interval are recommended: neither is registered for Bangladesh
 * (see the module header). `requiresMedicalAdvice` is always `true`.
 */
export function generateCatchUpPlan(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
): CatchUpPlan[] {
  const doseHistory = toDoseHistory(history);
  const age = calculateAge(dateOfBirth);
  const byVaccine = new Map<
    string,
    {
      vaccine: Vaccine;
      missed: number[];
      ids: string[];
      labels: { en: string; bn: string }[];
      oldest: number;
      provisional: boolean;
    }
  >();

  schedule.forEach((milestone) => {
    if (milestone.ageDays > age.days) return; // Not due yet — nothing to catch up.

    milestone.vaccines.forEach((vaccineInfo) => {
      const vaccine = allVaccines.find((v) => v.id === vaccineInfo.id);
      if (!vaccine) return;

      const doseNumber = doseNumberForMilestone(vaccine.id, milestone.ageDays) ?? 1;
      const given = administeredForDose(doseHistory, vaccine.id, doseNumber);
      if (given) return; // This specific dose has been recorded.

      const scheduledDoseId =
        MILESTONE_DOSES.find(
          (row) => row.vaccineId === vaccine.id && row.ageDays === milestone.ageDays,
        )?.scheduledDoseId ?? `${vaccine.id}#${doseNumber}@${milestone.ageDays}d`;

      const entry = byVaccine.get(vaccine.id) ?? {
        vaccine,
        missed: [],
        ids: [],
        labels: [],
        oldest: milestone.ageDays,
        provisional: false,
      };
      entry.missed.push(doseNumber);
      entry.ids.push(scheduledDoseId);
      entry.labels.push(vaccineInfo.name);
      entry.oldest = Math.min(entry.oldest, milestone.ageDays);
      // A provisional attribution elsewhere in this series means the "missed"
      // list may be wrong: the family might have had this dose and recorded it
      // without a number.
      const state = doseHistory[vaccine.id];
      if (state && state.provisionalDoseNumbers.length > 0) entry.provisional = true;
      byVaccine.set(vaccine.id, entry);
    });
  });

  const plans: CatchUpPlan[] = [];
  for (const { vaccine, missed, ids, labels, oldest, provisional } of byVaccine.values()) {
    const daysOverdue = Math.max(age.days - oldest, 0);
    // Named the way the schedule names them (`OPV-2`, `Pentavalent-3`) rather
    // than by internal dose number: that is what is written on the card a parent
    // is handed, and the two numbering schemes do not always agree (the OPV birth
    // dose is labelled `OPV-0` and is dose 1 of 4).
    const missedList = missed.map((_, index) => labels[index]?.en ?? vaccine.name.en).join(', ');
    const missedListBn = missed.map((_, index) => labels[index]?.bn ?? vaccine.name.bn).join(', ');

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
        en: `${vaccine.name.en}: ${missedList} ${missed.length > 1 ? 'are' : 'is'} still outstanding, the oldest by ${daysOverdue} days. No minimum interval between doses is registered for Bangladesh, so a health worker should plan the order and timing. TikaTrack does not recommend a date.`,
        bn: `${vaccine.name.bn}: ${missedListBn} এখনও বাকি আছে, এর মধ্যে সবচেয়ে পুরোনোটি ${daysOverdue} দিন আগে দেওয়ার কথা ছিল। বাংলাদেশের জন্য ডোজের মধ্যে সর্বনিম্ন বিরতি নিবন্ধিত নেই, তাই একজন স্বাস্থ্যকর্মী ক্রম ও সময় নির্ধারণ করবেন। টিকাট্র্যাক কোনো তারিখ সুপারিশ করে না।`,
      },
      requiresMedicalAdvice: true,
      requiresReview: provisional,
    });
  }

  return plans.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Generate family timeline with all events.
 *
 * Includes doses recorded **outside** the milestone schedule (travel, private or
 * campaign vaccines), which the 2.x timeline could not represent at all because
 * it was derived from the schedule alone.
 */
export function generateFamilyTimeline(
  profiles: Array<{
    id: string;
    name: string;
    dateOfBirth: string;
    events?: readonly VaccinationEvent[];
    records?: Record<string, { date: string; notes?: string }>;
  }>,
): FamilyTimelineEvent[] {
  const events: FamilyTimelineEvent[] = [];

  profiles.forEach((profile) => {
    const scheduledDoses = generatePersonalizedSchedule(profile.dateOfBirth, profile);
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

    // Anything recorded but not matched to a milestone still belongs on the
    // family's timeline — it happened.
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

  // Sort by date
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
}

/**
 * Calculate vaccination statistics for a profile
 */
export function calculateVaccinationStats(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
): VaccinationStats {
  const doseHistory = toDoseHistory(history);
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, doseHistory);

  const completed = scheduledDoses.filter((d) => d.status === 'completed').length;
  const upcoming = scheduledDoses.filter((d) => d.status === 'upcoming').length;
  const overdue = scheduledDoses.filter((d) => d.status === 'overdue').length;
  const dueToday = scheduledDoses.filter((d) => d.status === 'due-today').length;
  const totalScheduled = scheduledDoses.length;

  const progressPercentage =
    totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;

  const dosesRecorded = Object.values(doseHistory).reduce(
    (total, state) => total + state.administered.length,
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
    provisional: scheduledDoses.filter((d) => d.attribution === 'provisional').length,
    needsReview,
  };
}

/**
 * Get next upcoming vaccination for a profile
 */
export function getNextUpcomingVaccination(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
): ScheduledDose | null {
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, toDoseHistory(history));
  const upcoming = scheduledDoses.filter(
    (d) => d.status === 'upcoming' || d.status === 'due-today',
  );

  if (upcoming.length === 0) return null;

  // Return the soonest upcoming vaccine
  return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];
}

/**
 * Get all overdue vaccinations for a profile
 */
export function getOverdueVaccinations(
  dateOfBirth: string,
  history: DoseHistoryInput = {},
): ScheduledDose[] {
  const scheduledDoses = generatePersonalizedSchedule(dateOfBirth, toDoseHistory(history));
  return scheduledDoses.filter((d) => d.status === 'overdue');
}

export type CatchUpValidationReason =
  'vaccine-not-found' | 'invalid-date' | 'past-date' | 'too-young' | 'already-recorded' | 'valid';

/**
 * Validate a proposed catch-up date.
 *
 * Checks only what this app actually knows: that the vaccine exists, that the
 * date is not in the past, that the member has reached the milestone age, and
 * that the dose has not already been recorded. It does **not** check minimum
 * intervals, because none is registered for Bangladesh.
 */
export function validateCatchUpSchedule(
  dateOfBirth: string,
  vaccineId: string,
  proposedDate: string,
  history: DoseHistoryInput = {},
  doseNumber?: number | null,
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

  const age = calculateAge(dateOfBirth);
  const proposed = parseISODate(proposedDate);

  if (!proposed) {
    return {
      isValid: false,
      code: 'invalid-date',
      reason: { en: 'That date could not be read', bn: 'তারিখটি পড়া যায়নি' },
    };
  }

  // Check if proposed date is in the future (today counts as valid: clinics
  // record a dose on the day it is given, not the day after).
  if (proposed < startOfToday()) {
    return {
      isValid: false,
      code: 'past-date',
      reason: {
        en: 'Proposed date must be in the future',
        bn: 'প্রস্তাবিত তারিখ ভবিষ্যতে হতে হবে',
      },
    };
  }

  // Check minimum age requirements
  const minAgeDays = schedule.find((s) => s.vaccines.some((v) => v.id === vaccineId))?.ageDays || 0;
  if (age.days < minAgeDays) {
    return {
      isValid: false,
      code: 'too-young',
      reason: {
        en: `Child is too young. Minimum age: ${Math.floor(minAgeDays / 7)} weeks`,
        bn: `শিশু খুব ছোট। সর্বনিম্ন বয়স: ${Math.floor(minAgeDays / 7)} সপ্তাহ`,
      },
    };
  }

  // A dose already in the ledger is a duplicate, not a catch-up.
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

/** Which schedule version the current milestone table represents. */
export function currentScheduleVersion(): string {
  return SCHEDULE_VERSION;
}
