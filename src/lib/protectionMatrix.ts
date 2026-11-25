import { analyzeSchedule, calculateAge, type ScheduledDose } from './smartScheduler';
import type { Profile } from '../types';

export type AntigenGroupId =
  | 'tuberculosis'
  | 'polio'
  | 'dpt'
  | 'hepb_hib'
  | 'pneumococcal'
  | 'measles_rubella'
  | 'typhoid'
  | 'hpv_adult';

export type ProtectionStatus =
  | 'protected'
  | 'partial'
  | 'attention'
  | 'provisional'
  | 'upcoming'
  | 'optional';

export interface AntigenProtectionRow {
  id: AntigenGroupId;
  title: { en: string; bn: string };
  subtitle: { en: string; bn: string };
  primaryVaccineId: string;
  vaccineIds: readonly string[];
  /** Number of doses confirmed for this antigen group (via schedule or non-routine ledger). */
  confirmedCount: number;
  /** Number of doses inferred provisionally (e.g. migrated unnumbered records). */
  provisionalCount: number;
  /** Scheduled doses due today or overdue for this group. */
  dueOrOverdueCount: number;
  /** Scheduled doses still in the future (not yet age-eligible). */
  upcomingCount: number;
  /** Age-eligible doses expected up to today. */
  eligibleExpectedCount: number;
  /** Total milestone doses in this antigen group (or recorded count for non-EPI boosters). */
  totalSeriesCount: number;
  /** 0-100 coverage percentage against age-eligible target (or total series if no due doses yet). */
  coveragePercent: number;
  status: ProtectionStatus;
  nextDueDose?: ScheduledDose;
  nextDueProfileId?: string;
}

export interface FamilyProtectionSummary {
  rows: AntigenProtectionRow[];
  protectedGroupsCount: number;
  attentionGroupsCount: number;
  overallAntigenCoveragePercent: number;
}

interface AntigenGroupSpec {
  id: AntigenGroupId;
  title: { en: string; bn: string };
  subtitle: { en: string; bn: string };
  primaryVaccineId: string;
  scheduledVaccineIds: readonly string[];
  equivalentEventIds: readonly string[];
  isOptionalForAge?: (ageYears: number, gender?: Profile['gender']) => boolean;
}

const ANTIGEN_SPECS: readonly AntigenGroupSpec[] = [
  {
    id: 'tuberculosis',
    title: { en: 'Tuberculosis (TB)', bn: 'যক্ষ্মা (টিবি)' },
    subtitle: { en: 'BCG at birth', bn: 'জন্মের সময় বিসিজি' },
    primaryVaccineId: 'bcg',
    scheduledVaccineIds: ['bcg'],
    equivalentEventIds: ['bcg'],
  },
  {
    id: 'polio',
    title: { en: 'Poliomyelitis', bn: 'পোলিও' },
    subtitle: { en: 'OPV-0/1/2/3 + fIPV-1/2', bn: 'ওপিভি ০–৩ ও এফআইপিভি ১–২' },
    primaryVaccineId: 'opv',
    scheduledVaccineIds: ['opv', 'fipv'],
    equivalentEventIds: ['opv', 'fipv', 'ipv'],
  },
  {
    id: 'dpt',
    title: { en: 'Diphtheria · Pertussis · Tetanus', bn: 'ডিপথেরিয়া · হুপিং কাশি · ধনুষ্টঙ্কার' },
    subtitle: { en: 'Pentavalent 1–3 · Td/TT boosters', bn: 'পেন্টাভ্যালেন্ট ১–৩ · টিডি/টিটি বুস্টার' },
    primaryVaccineId: 'pentavalent',
    scheduledVaccineIds: ['pentavalent'],
    equivalentEventIds: ['pentavalent', 'dtap', 'tdap', 'td', 'tt'],
  },
  {
    id: 'hepb_hib',
    title: { en: 'Hepatitis B & Hib', bn: 'হেপাটাইটিস বি ও হিব' },
    subtitle: { en: 'Pentavalent 1–3 · Adult HepB', bn: 'পেন্টাভ্যালেন্ট ১–৩ · প্রাপ্তবয়স্ক হেপ-বি' },
    primaryVaccineId: 'pentavalent',
    scheduledVaccineIds: ['pentavalent'],
    equivalentEventIds: ['pentavalent', 'hepatitisB', 'hepatitis-b-adult', 'hepb', 'hib'],
  },
  {
    id: 'pneumococcal',
    title: { en: 'Pneumococcal Disease', bn: 'নিউমোকক্কাল (নিউমোনিয়া)' },
    subtitle: { en: 'PCV-1, PCV-2, PCV-3', bn: 'পিসিভি ১, ২ ও ৩' },
    primaryVaccineId: 'pcv',
    scheduledVaccineIds: ['pcv'],
    equivalentEventIds: ['pcv', 'pcv13', 'ppsv23'],
  },
  {
    id: 'measles_rubella',
    title: { en: 'Measles & Rubella', bn: 'হাম ও রুবেলা' },
    subtitle: { en: 'MR-1 (9m) & MR-2 (15m)', bn: 'এমআর-১ (৯ মাস) ও এমআর-২ (১৫ মাস)' },
    primaryVaccineId: 'mr',
    scheduledVaccineIds: ['mr'],
    equivalentEventIds: ['mr', 'mmr'],
  },
  {
    id: 'typhoid',
    title: { en: 'Typhoid Fever', bn: 'টাইফয়েড জ্বর' },
    subtitle: { en: 'TCV (15 months / campaign)', bn: 'টিসিভি (১৫ মাস / ক্যাম্পেইন)' },
    primaryVaccineId: 'tcv',
    scheduledVaccineIds: ['tcv'],
    equivalentEventIds: ['tcv', 'typhoid'],
  },
  {
    id: 'hpv_adult',
    title: { en: 'HPV & Seasonal / Travel Shield', bn: 'এইচপিভি ও মৌসুমি / ভ্রমণ সুরক্ষা' },
    subtitle: { en: 'HPV (9–14y girls), Influenza, Meningococcal', bn: 'এইচপিভি, ইনফ্লুয়েঞ্জা ও মেনিনজাইটিস' },
    primaryVaccineId: 'hpv',
    scheduledVaccineIds: [],
    equivalentEventIds: ['hpv', 'hpv9', 'influenza', 'meningococcal-acwy', 'yellowFever', 'rabies'],
    isOptionalForAge: () => true,
  },
];

function resolveStatus(input: {
  isOptional: boolean;
  confirmedCount: number;
  provisionalCount: number;
  dueOrOverdueCount: number;
  upcomingCount: number;
  eligibleExpectedCount: number;
  totalSeriesCount: number;
}): ProtectionStatus {
  const {
    isOptional,
    confirmedCount,
    provisionalCount,
    dueOrOverdueCount,
    upcomingCount,
    eligibleExpectedCount,
    totalSeriesCount,
  } = input;

  const totalGiven = confirmedCount + provisionalCount;

  if (isOptional) {
    return totalGiven > 0 ? 'protected' : 'optional';
  }

  if (dueOrOverdueCount > 0) {
    return totalGiven > 0 ? 'partial' : 'attention';
  }

  if (eligibleExpectedCount > 0 && confirmedCount >= eligibleExpectedCount) {
    return upcomingCount > 0 ? 'partial' : 'protected';
  }

  if (eligibleExpectedCount > 0 && provisionalCount > 0 && totalGiven >= eligibleExpectedCount) {
    return 'provisional';
  }

  if (totalSeriesCount > 0 && confirmedCount >= totalSeriesCount) {
    return 'protected';
  }

  if (totalGiven > 0) {
    return 'partial';
  }

  return 'upcoming';
}

/**
 * Compute per-antigen/disease-group protection breakdown for a single family member.
 * Every count comes strictly from `analyzeSchedule` + recorded `profile.events`.
 */
export function computeAntigenProtection(profile: Profile): AntigenProtectionRow[] {
  const analysis = analyzeSchedule(profile.dateOfBirth, profile);
  const age = calculateAge(profile.dateOfBirth);
  const events = profile.events ?? [];

  return ANTIGEN_SPECS.map((spec) => {
    const isOptional = spec.isOptionalForAge ? spec.isOptionalForAge(age.years, profile.gender) : false;

    const scheduledRows = analysis.scheduled.filter((dose) =>
      spec.scheduledVaccineIds.includes(dose.vaccineId),
    );

    let confirmedCount = 0;
    let provisionalCount = 0;
    let dueOrOverdueCount = 0;
    let upcomingCount = 0;
    let eligibleExpectedCount = 0;

    for (const dose of scheduledRows) {
      if (dose.status === 'completed') {
        eligibleExpectedCount += 1;
        if (dose.attribution === 'provisional' || dose.needsReview) {
          provisionalCount += 1;
        } else {
          confirmedCount += 1;
        }
      } else if (dose.status === 'overdue' || dose.status === 'due-today') {
        eligibleExpectedCount += 1;
        dueOrOverdueCount += 1;
      } else {
        upcomingCount += 1;
      }
    }

    // Supplement with equivalent / non-routine ledger events (e.g. Tdap/TT for adults, IPV, HPV, Influenza)
    const scheduledEventIds = new Set(
      scheduledRows.map((row) => row.recordId).filter((id): id is string => Boolean(id)),
    );
    const extraEvents = events.filter(
      (event) =>
        spec.equivalentEventIds.includes(event.vaccineId) && !scheduledEventIds.has(event.id),
    );

    for (const event of extraEvents) {
      if (event.needsReview) provisionalCount += 1;
      else confirmedCount += 1;
    }

    const totalGiven = confirmedCount + provisionalCount;
    const totalSeriesCount = isOptional
      ? Math.max(totalGiven, 1)
      : scheduledRows.length;

    const nextDueDose = scheduledRows
      .filter((dose) => dose.status !== 'completed')
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];

    let coveragePercent = 0;
    if (isOptional) {
      coveragePercent = totalGiven > 0 ? 100 : 0;
    } else if (eligibleExpectedCount > 0) {
      coveragePercent = Math.min(100, Math.round((totalGiven / eligibleExpectedCount) * 100));
    } else if (totalSeriesCount > 0) {
      coveragePercent = totalGiven > 0 ? Math.min(100, Math.round((totalGiven / totalSeriesCount) * 100)) : 0;
    }

    const status = resolveStatus({
      isOptional,
      confirmedCount,
      provisionalCount,
      dueOrOverdueCount,
      upcomingCount,
      eligibleExpectedCount,
      totalSeriesCount,
    });

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle,
      primaryVaccineId: spec.primaryVaccineId,
      vaccineIds: spec.equivalentEventIds,
      confirmedCount,
      provisionalCount,
      dueOrOverdueCount,
      upcomingCount,
      eligibleExpectedCount,
      totalSeriesCount,
      coveragePercent,
      status,
      nextDueDose,
      nextDueProfileId: nextDueDose ? profile.id : undefined,
    };
  });
}

/**
 * Aggregate antigen-group protection across all tracked family members.
 */
export function computeFamilyProtectionSummary(profiles: Profile[]): FamilyProtectionSummary {
  if (profiles.length === 0) {
    return {
      rows: [],
      protectedGroupsCount: 0,
      attentionGroupsCount: 0,
      overallAntigenCoveragePercent: 0,
    };
  }

  const perMemberMatrices = profiles.map((profile) => computeAntigenProtection(profile));

  const rows: AntigenProtectionRow[] = ANTIGEN_SPECS.map((spec, index) => {
    let confirmedCount = 0;
    let provisionalCount = 0;
    let dueOrOverdueCount = 0;
    let upcomingCount = 0;
    let eligibleExpectedCount = 0;
    let totalSeriesCount = 0;
    let nextDueDose: ScheduledDose | undefined;
    let nextDueProfileId: string | undefined;

    for (const memberRows of perMemberMatrices) {
      const row = memberRows[index];
      confirmedCount += row.confirmedCount;
      provisionalCount += row.provisionalCount;
      dueOrOverdueCount += row.dueOrOverdueCount;
      upcomingCount += row.upcomingCount;
      eligibleExpectedCount += row.eligibleExpectedCount;
      totalSeriesCount += row.totalSeriesCount;
      if (row.nextDueDose) {
        if (!nextDueDose || row.nextDueDose.daysUntilDue < nextDueDose.daysUntilDue) {
          nextDueDose = row.nextDueDose;
          nextDueProfileId = row.nextDueProfileId;
        }
      }
    }

    const isOptional = spec.id === 'hpv_adult';
    const totalGiven = confirmedCount + provisionalCount;
    const coveragePercent = isOptional
      ? totalGiven > 0
        ? 100
        : 0
      : eligibleExpectedCount > 0
        ? Math.min(100, Math.round((totalGiven / eligibleExpectedCount) * 100))
        : 0;

    const status = resolveStatus({
      isOptional,
      confirmedCount,
      provisionalCount,
      dueOrOverdueCount,
      upcomingCount,
      eligibleExpectedCount,
      totalSeriesCount,
    });

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle,
      primaryVaccineId: spec.primaryVaccineId,
      vaccineIds: spec.equivalentEventIds,
      confirmedCount,
      provisionalCount,
      dueOrOverdueCount,
      upcomingCount,
      eligibleExpectedCount,
      totalSeriesCount,
      coveragePercent,
      status,
      nextDueDose,
      nextDueProfileId,
    };
  });

  const mandatoryRows = rows.filter((row) => row.id !== 'hpv_adult');
  const protectedGroupsCount = mandatoryRows.filter((row) => row.status === 'protected').length;
  const attentionGroupsCount = mandatoryRows.filter(
    (row) => row.dueOrOverdueCount > 0 || row.status === 'provisional',
  ).length;
  const eligibleRows = mandatoryRows.filter((row) => row.eligibleExpectedCount > 0);
  const overallAntigenCoveragePercent =
    eligibleRows.length > 0
      ? Math.round(
          eligibleRows.reduce((sum, row) => sum + row.coveragePercent, 0) / eligibleRows.length,
        )
      : 100;

  return {
    rows,
    protectedGroupsCount,
    attentionGroupsCount,
    overallAntigenCoveragePercent,
  };
}
