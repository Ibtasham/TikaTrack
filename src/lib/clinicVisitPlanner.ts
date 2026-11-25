import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails';
import { allVaccines } from '../data/vaccines';
import { formatDate } from './format';
import { analyzeSchedule, milestoneDoseName, type ScheduledDose } from './smartScheduler';
import type { Profile } from '../types';

export interface PlannedClinicDose {
  profileId: string;
  profileName: string;
  dose: ScheduledDose;
  doseLabel: { en: string; bn: string };
  route: { en: string; bn: string } | null;
  isPriority: boolean;
}

export interface ClinicVisitPlan {
  windowDays: number;
  /** Overdue or due-today doses that warrant a priority clinic trip. */
  priorityDoses: PlannedClinicDose[];
  /** Upcoming doses falling within the configured window (`1..windowDays`). */
  windowDoses: PlannedClinicDose[];
  /** Total actionable doses across both priority and upcoming window. */
  totalActionableCount: number;
  /** Earliest scheduled date across planned doses, or null when empty. */
  nearestVisitDate: string | null;
  /** True if any planned dose is overdue or has unconfirmed records needing review. */
  requiresHcwReview: boolean;
  /** Unique member IDs involved in this clinic visit plan. */
  involvedMemberNames: string[];
}

export interface PrepChecklistItem {
  id: string;
  title: { en: string; bn: string };
  detail: { en: string; bn: string };
}

export const CLINIC_PREP_CHECKLIST: readonly PrepChecklistItem[] = [
  {
    id: 'epi-card',
    title: {
      en: 'Pack physical EPI / Tika card',
      bn: 'মূল ইপিআই টিকা কার্ড সাথে নিন',
    },
    detail: {
      en: 'Health workers record official batch numbers and stamp the physical book at the session.',
      bn: 'স্বাস্থ্যকর্মী সেশনে মূল কার্ডে ব্যাচ নম্বর ও তারিখ লিখে সিল দেন।',
    },
  },
  {
    id: 'vvm-check',
    title: {
      en: 'Check VVM cold-chain indicator',
      bn: 'ভ্যাকসিন ভায়াল মনিটর (VVM) স্টিকার দেখুন',
    },
    detail: {
      en: 'Confirm the inner square on the vial label is lighter than the outer circle (+2°C to +8°C).',
      bn: 'ভায়ালের ভেতরের বর্গাকার চিহ্নটি বাইরের বৃত্তের চেয়ে হালকা রঙের কি না নিশ্চিত হন।',
    },
  },
  {
    id: 'symptom-note',
    title: {
      en: 'Note fever, allergies, or missed-dose gaps',
      bn: 'বর্তমান জ্বর, অ্যালার্জি বা পূর্বের বাদ পড়া ডোজের নোট রাখুন',
    },
    detail: {
      en: 'Share any prior reactions or unconfirmed dates so the vaccinator confirms safe catch-up spacing.',
      bn: 'আগের কোনো পার্শ্বপ্রতিক্রিয়া বা অজানা তারিখ থাকলে টিকাদান কর্মীকে জানান।',
    },
  },
  {
    id: 'post-observe',
    title: {
      en: 'Plan 15–30 min clinic wait after doses',
      bn: 'টিকা নেওয়ার পর ১৫–৩০ মিনিট কেন্দ্রে অপেক্ষার সময় রাখুন',
    },
    detail: {
      en: 'Stay briefly at the EPI centre after injection; keep helpline 16263 saved for high fever.',
      bn: 'টিকা দেওয়ার পর কিছুক্ষণ কেন্দ্রে অবস্থান করুন এবং জরুরি প্রয়োজনে ১৬২৬৩ নম্বর সংরক্ষণ করুন।',
    },
  },
];

/**
 * Group due-now and near-term upcoming doses across all family members into a
 * cohesive clinic visit bundle.
 */
export function buildClinicVisitPlan(
  profiles: Profile[],
  windowDays = 30,
): ClinicVisitPlan {
  const vaccineById = new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine]));
  const priorityDoses: PlannedClinicDose[] = [];
  const windowDoses: PlannedClinicDose[] = [];
  let requiresHcwReview = false;
  const involvedSet = new Set<string>();

  for (const profile of profiles) {
    const analysis = analyzeSchedule(profile.dateOfBirth, profile);
    if (analysis.stats.needsReview > 0 || analysis.anomalies.length > 0) {
      requiresHcwReview = true;
    }

    for (const dose of analysis.scheduled) {
      if (dose.status === 'completed') continue;

      const vaccine = vaccineById.get(dose.vaccineId);
      const clinical = vaccine ? getVaccineClinicalProfile(vaccine) : null;
      const item: PlannedClinicDose = {
        profileId: profile.id,
        profileName: profile.name,
        dose,
        doseLabel: {
          en: milestoneDoseName(dose, 'en'),
          bn: milestoneDoseName(dose, 'bn'),
        },
        route: clinical ? clinical.route : null,
        isPriority: dose.status === 'overdue' || dose.status === 'due-today',
      };

      if (dose.status === 'overdue' || dose.status === 'due-today') {
        if (dose.status === 'overdue') requiresHcwReview = true;
        priorityDoses.push(item);
        involvedSet.add(profile.name);
      } else if (dose.daysUntilDue >= 1 && dose.daysUntilDue <= windowDays) {
        windowDoses.push(item);
        involvedSet.add(profile.name);
      }
    }
  }

  priorityDoses.sort((a, b) => a.dose.daysUntilDue - b.dose.daysUntilDue);
  windowDoses.sort((a, b) => a.dose.daysUntilDue - b.dose.daysUntilDue);

  const allPlanned = [...priorityDoses, ...windowDoses];
  const nearestVisitDate =
    priorityDoses.length > 0
      ? priorityDoses[0].dose.scheduledDate
      : windowDoses.length > 0
        ? windowDoses[0].dose.scheduledDate
        : null;

  return {
    windowDays,
    priorityDoses,
    windowDoses,
    totalActionableCount: allPlanned.length,
    nearestVisitDate,
    requiresHcwReview,
    involvedMemberNames: [...involvedSet],
  };
}

/**
 * Produce a clean, printable/shareable plain-text clinic visit brief.
 */
export function buildVisitBriefText(
  plan: ClinicVisitPlan,
  checkedIds: readonly string[],
  language: 'en' | 'bn',
): string {
  const checkedSet = new Set(checkedIds);
  const lines: string[] = [
    language === 'en'
      ? `TikaTrack — Clinic Visit Brief (${plan.windowDays}-day window)`
      : `টিকাট্র্যাক — টিকাদান কেন্দ্র ভিজিট সারসংক্ষেপ (${plan.windowDays} দিনের পরিকল্পনা)`,
    '='.repeat(48),
  ];

  if (plan.priorityDoses.length > 0) {
    lines.push(
      '',
      language === 'en' ? 'PRIORITY / DUE NOW:' : 'অগ্রাধিকার / বর্তমানে প্রাপ্য:',
    );
    for (const item of plan.priorityDoses) {
      lines.push(
        `- ${item.profileName}: ${item.doseLabel[language]} (${formatDate(item.dose.scheduledDate, language)})${
          item.route ? ` · ${item.route[language]}` : ''
        }`,
      );
    }
  }

  if (plan.windowDoses.length > 0) {
    lines.push(
      '',
      language === 'en'
        ? `UPCOMING WITHIN ${plan.windowDays} DAYS:`
        : `আগামী ${plan.windowDays} দিনের আসন্ন ডোজ:`,
    );
    for (const item of plan.windowDoses) {
      lines.push(
        `- ${item.profileName}: ${item.doseLabel[language]} (${formatDate(item.dose.scheduledDate, language)})`,
      );
    }
  }

  if (plan.totalActionableCount === 0) {
    lines.push(
      '',
      language === 'en'
        ? 'No overdue or upcoming EPI doses within this window.'
        : 'এই সময়ের মধ্যে কোনো বকেয়া বা আসন্ন ইপিআই ডোজ নেই।',
    );
  }

  lines.push(
    '',
    language === 'en' ? 'PREPARATION CHECKLIST:' : 'প্রস্তুতি তালিকা:',
  );
  for (const item of CLINIC_PREP_CHECKLIST) {
    const mark = checkedSet.has(item.id) ? '[x]' : '[ ]';
    lines.push(`${mark} ${item.title[language]}`);
  }

  lines.push(
    '',
    language === 'en'
      ? 'Bangladesh Health Helpline: 16263 · Verify spacing with a registered health worker.'
      : 'জাতীয় স্বাস্থ্য বাতায়ন: ১৬২৬৩ · যেকোনো সিদ্ধান্তের আগে স্বাস্থ্যকর্মীর পরামর্শ নিন।',
  );

  return lines.join('\n');
}
