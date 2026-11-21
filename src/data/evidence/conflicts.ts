/**
 * Conflict register.
 *
 * Where two statements disagree, both are recorded here with their own
 * evidence. Nothing is silently merged or guessed: resolving a conflict
 * requires verified, authoritative documentation cited in `resolution`, and
 * conflicts without primary national documentation remain `unresolved`.
 */

import type { ConflictEntry } from './types';

const WHO_BD_QUOTE_INTRODUCTIONS =
  'HepB vaccine was introduced in 2003, Hib in 2009, rubella in 2012, PCV and IPV in 2015, MR second dose in 2015 and fIPV in 2017.';

export const conflicts: readonly ConflictEntry[] = [
  {
    id: 'C-001',
    title: {
      en: 'fIPV is a national programme antigen but had no milestone in the encoded schedule',
      bn: 'এফআইপিভি জাতীয় কর্মসূচির টিকা হলেও এনকোডেড শিডিউলে এর কোনো মাইলফলক ছিল না',
    },
    statements: [
      {
        statement:
          'The TikaTrack 2.x schedule array contained 6 antigens (BCG, OPV, pentavalent, PCV, MR, TCV) across 14 dose events; fIPV was absent.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]` prior to 3.1.0',
      },
      {
        statement: 'fIPV was introduced into the Bangladesh EPI in 2017.',
        evidence: [{ sourceId: 'who-bd-immunization', section: 'Overview / timeline', quote: WHO_BD_QUOTE_INTRODUCTIONS }],
        origin: 'WHO Country Office for Bangladesh',
      },
      {
        statement:
          'WHO recommends a 2-dose fractional-dose IPV (0.1 mL intradermal) schedule administered at 6 and 14 weeks of age alongside bOPV.',
        evidence: [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
        origin: 'WHO Polio vaccines position paper – June 2022',
      },
    ],
    affectedRecordIds: ['rec-fipv'],
    affectedLegacyIds: ['fipv', 'polio-ipv'],
    status: 'resolved-with-source',
    requiredAction:
      'Add fIPV-1 (6 Weeks / 42d) and fIPV-2 (14 Weeks / 98d) to `schedule[]` backed by WHO Bangladesh (2017 fIPV introduction) and the June 2022 WHO Polio Position Paper.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'who-bd-immunization', section: 'Overview / timeline', quote: WHO_BD_QUOTE_INTRODUCTIONS },
        { sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' },
      ],
      decision:
        'Added fIPV-1 (6 Weeks / 42 days) and fIPV-2 (14 Weeks / 98 days) to `schedule[]` (bringing milestone doses from 14 to 16) and aligned `rec-fipv` `legacyMilestoneKey` entries. Bangladesh-specific upper age caps for catch-up remain tracked under C-005.',
    },
  },
  {
    id: 'C-002',
    title: {
      en: 'Month milestones were computed from 270d/450d day approximations rather than calendar months',
      bn: 'মাসভিত্তিক মাইলফলক ক্যালেন্ডার মাসের বদলে ২৭০/৪৫০ দিনের আনুমানিক হিসাবে নির্ধারিত হতো',
    },
    statements: [
      {
        statement:
          'The 9-month and 15-month milestones used fixed `ageDays: 270` and `ageDays: 450` arithmetic, shifting due dates 3–5 days early and generating "38 weeks" / "14 months" explanations.',
        evidence: [],
        origin: 'TikaTrack 2.x/3.0 scheduler — src/lib/smartScheduler.ts prior to 3.1.0',
      },
      {
        statement:
          'WHO schedules for MCV1 (9 months) and MCV2 / TCV (15 months) specify completed calendar months of age.',
        evidence: [
          { sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' },
          { sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' },
        ],
        origin: 'WHO Measles (2017) & Typhoid (August 2026) Position Papers',
      },
    ],
    affectedRecordIds: ['rec-mr', 'rec-tcv'],
    affectedLegacyIds: ['mr', 'tcv'],
    status: 'resolved-with-source',
    requiredAction:
      'Store `ageMonths` (9 and 15) on `ScheduleItem` and migrate scheduler due-date and explanation formatting to calendar-month arithmetic.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' },
        { sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' },
      ],
      decision:
        'Added `ageMonths` (9 and 15) to month-based entries in `schedule[]`, added `addCalendarMonths()` in `src/lib/format.ts`, and updated `calculateScheduledDate()`, `generatePersonalizedSchedule()`, `generateCatchUpPlan()`, and `generateVaccineExplanation()` to compute exact calendar-month dates while preserving `scheduledDoseId` ledger compatibility.',
    },
  },
  {
    id: 'C-003',
    title: {
      en: 'Rotavirus and HPV introduction status differed across older and newer programme pages',
      bn: 'পুরোনো ও নতুন কর্মসূচি পাতায় রোটাভাইরাস ও এইচপিভি টিকা প্রবর্তনের তথ্যে পার্থক্য ছিল',
    },
    statements: [
      {
        statement:
          'The undated WHO Bangladesh immunization overview page still states the government plans to introduce rotavirus and HPV vaccine "in near future".',
        evidence: [
          {
            sourceId: 'who-bd-immunization',
            section: 'Overview / timeline',
            quote: 'The govern has plan to introduce rota and HPV vaccine in near future.',
          },
        ],
        origin: 'WHO Country Office for Bangladesh (older undated topic page)',
      },
      {
        statement:
          'Gavi (Dec 2024) and WHO Bangladesh (Dec 2024) confirm Bangladesh launched HPV Phase 1 in Dhaka Division in October 2023 (>1.5M girls) and expanded nationwide across the remaining 7 divisions from 24 October 2024 targeting 6.2M girls aged 10–14 years (Grades 5–9) on a single-dose schedule.',
        evidence: [
          { sourceId: 'gavi-hpv-bangladesh', section: 'National rollout report' },
          { sourceId: 'who-bd-hpv-rohingya-2024', section: 'Full article' },
          { sourceId: 'who-pp-hpv-2022', section: 'Off-label single-dose schedule recommendation' },
        ],
        origin: 'Gavi VaccinesWork (10 Dec 2024), WHO Bangladesh (18 Dec 2024), WHO HPV Position Paper (Dec 2022)',
      },
      {
        statement:
          'Rotavirus has not yet been rolled out in Bangladesh routine EPI (remains planned nationally while private-market formulations exist separately).',
        evidence: [
          { sourceId: 'who-bd-immunization', section: 'Overview / timeline' },
          { sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' },
        ],
        origin: 'WHO Bangladesh & WHO Rotavirus Position Paper (July 2021)',
      },
    ],
    affectedRecordIds: ['rec-hpv', 'rec-rotavirus'],
    affectedLegacyIds: ['hpv', 'rotavirus'],
    status: 'resolved-with-source',
    requiredAction:
      'Align HPV record and catalogue text to the verified single-dose 2023–2024 national campaign rollout and clearly separate planned routine Rotavirus introduction from private-market products.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'gavi-hpv-bangladesh', section: 'National rollout report' },
        { sourceId: 'who-bd-hpv-rohingya-2024', section: 'Full article' },
        { sourceId: 'who-pp-hpv-2022', section: 'Off-label single-dose schedule recommendation' },
        { sourceId: 'who-bd-immunization', section: 'Overview / timeline' },
        { sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' },
      ],
      decision:
        'Updated HPV to `doses: 1` (single-dose campaign for girls 10–14 years / Grades 5–9) cited to Gavi (Dec 2024), WHO Bangladesh (Dec 2024), and WHO HPV Position Paper (Dec 2022). Marked Rotavirus explicitly as `bd-planned-introduction` / `not-yet-introduced-bd` (`category: non_routine`), distinct from private-market Rotarix/RotaTeq entries.',
    },
  },
  {
    id: 'C-004',
    title: {
      en: 'Non-EPI products were previously tagged `category: "routine"` alongside Bangladesh EPI vaccines',
      bn: 'বাংলাদেশ ইপিআই-এর বাইরের পণ্যগুলো আগে "নিয়মিত" ক্যাটাগরিতে মিশ্রিত ছিল',
    },
    statements: [
      {
        statement:
          'Legacy `category: "routine"` was previously applied to mmr, hepatitisB, polio-ipv, dtp, hib, dtap, tdap, hexavalent, and pentavalent-booster even though Bangladesh routine EPI delivers HepB and Hib via Pentavalent and uses bOPV+fIPV and MR.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset prior to 3.1.0',
      },
      {
        statement:
          'WHO Bangladesh confirms routine delivery through BCG, OPV, Pentavalent (DTP-HepB-Hib), PCV, fIPV, and MR, while standalone/acellular combinations belong to private-market or international reference schedules.',
        evidence: [
          { sourceId: 'who-bd-immunization', section: 'Overview / timeline', quote: WHO_BD_QUOTE_INTRODUCTIONS },
          { sourceId: 'who-table-2-routine', section: 'Summary tables' },
        ],
        origin: 'WHO Country Office for Bangladesh & WHO Table 2 Routine Recommendations',
      },
    ],
    affectedRecordIds: ['rec-pentavalent', 'rec-fipv'],
    affectedLegacyIds: [
      'fipv',
      'mmr',
      'hepatitisB',
      'polio-ipv',
      'dtp',
      'hib',
      'dtap',
      'tdap',
      'hexavalent',
      'pentavalent-booster',
    ],
    status: 'resolved-with-source',
    requiredAction:
      'Remove `category: "routine"` from all 9 non-EPI entries in the catalogue, add Programme Classification filters in the UI, and verify `fipv` as the sole added routine EPI antigen.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'who-bd-immunization', section: 'Overview / timeline', quote: WHO_BD_QUOTE_INTRODUCTIONS },
        { sourceId: 'who-table-2-routine', section: 'Summary tables' },
      ],
      decision:
        'Reclassified `mmr` and `hepatitisB` to `recommended` and `polio-ipv`, `dtp`, `hib`, `pentavalent-booster` to `non_routine` (keeping `dtap`, `tdap`, `hexavalent` in `recommended`), leaving ONLY the 7 Bangladesh routine EPI antigens (`bcg`, `opv`, `pentavalent`, `pcv`, `fipv`, `mr`, `tcv`) tagged `category: "routine"`. Added Programme Classification UI filter and badge separation.',
    },
  },
  {
    id: 'C-005',
    title: {
      en: 'Bangladesh-specific catch-up upper age cutoffs & October 2026 EPI review output remain unconfirmed',
      bn: 'বাংলাদেশ-নির্দিষ্ট ক্যাচ-আপ সর্বোচ্চ বয়সসীমা ও অক্টোবর ২০২৬ ইপিআই পর্যালোচনার ফলাফল অনিশ্চিত',
    },
    statements: [
      {
        statement:
          'Social-media and commercial clinic sources claim domestic "Updated Bangladesh EPI 2026" rules (including rotavirus routine adoption and specific domestic upper age caps) without primary government documentation.',
        evidence: [],
        origin: 'Unverified third-party web sources — excluded by TikaTrack evidence policy',
      },
      {
        statement:
          'WHO Bangladesh launched an independent review of Bangladesh national EPI and VPD surveillance on 4–14 October 2026, with a draft report and action plan expected in November 2026; primary DGHS operational circulars have not been obtained.',
        evidence: [
          { sourceId: 'who-bd-epi-review-2026', section: 'Full article' },
          { sourceId: 'no-official-schedule-document' },
        ],
        origin: 'WHO Bangladesh (4 Oct 2026) & pending DGHS circular registry',
      },
    ],
    affectedRecordIds: ['rec-fipv', 'rec-pcv', 'rec-opv', 'rec-rotavirus'],
    affectedLegacyIds: ['fipv', 'pcv', 'opv', 'rotavirus'],
    status: 'unresolved',
    requiredAction:
      'Obtain the official DGHS/EPI operational circular and the published output/action plan of the October 2026 independent national EPI review before confirming Bangladesh domestic upper age limits (`maximumAge`) or automating catch-up interval dates in the tracker.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-006',
    title: {
      en: 'TCV routine EPI addition (Aug 2026) is corroborated by news & campaign reports but lacks primary DGHS circular',
      bn: 'আগস্ট ২০২৬-এ নিয়মিত ইপিআই-তে টিসিভি সংযোজন সংবাদ ও ক্যাম্পেইন সূত্রে সমর্থিত হলেও প্রাথমিক ডিজিএইচএস সার্কুলার পাওয়া যায়নি',
    },
    statements: [
      {
        statement:
          'UNICEF Bangladesh (12 Oct 2025) and WHO Bangladesh (2 Dec 2025) confirm the nationwide TCV catch-up campaign protecting ~50 million children; WHO August 2026 Typhoid Position Paper supports single-dose routine TCV delivery, and BSS & The Daily Star (14 July 2026) report routine EPI inclusion at 15 months from 1 August 2026.',
        evidence: [
          { sourceId: 'unicef-bd-tcv-campaign-2025', section: 'Press release' },
          { sourceId: 'who-bd-tcv-rohingya-2025', section: 'Overview' },
          { sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' },
          { sourceId: 'bss-bd-tcv-routine-2026', section: 'News report' },
          { sourceId: 'dailystar-bd-tcv-routine-2026', section: 'News report' },
        ],
        origin: 'UNICEF Bangladesh (2025), WHO Bangladesh (2025), WHO Position Paper (Aug 2026), BSS & Daily Star (July 2026)',
      },
      {
        statement:
          'The WHO Bangladesh country topic page still lists introductions only through fIPV (2017), and the official DGHS/MOHFW routine introduction circular (direct document URL) has not been directly obtained; the legacy entry cites https://dghs.gov.bd.',
        evidence: [
          { sourceId: 'dghs-homepage' },
          { sourceId: 'who-bd-immunization', section: 'Overview / timeline', quote: WHO_BD_QUOTE_INTRODUCTIONS },
        ],
        origin: 'TikaTrack legacy `tcv` citation & WHO Bangladesh topic page',
      },
    ],
    affectedRecordIds: ['rec-tcv'],
    affectedLegacyIds: ['tcv', 'typhoidVi', 'typhoid-oral', 'typhoid-typbar-tcv'],
    status: 'unresolved',
    requiredAction:
      'Obtain and register the primary official DGHS/MOHFW routine TCV circular (document-level URL and effective date) and confirm whether the updated WHO Bangladesh country profile reflects the 1 August 2026 routine 15-month milestone.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-007',
    title: {
      en: 'Overlapping cholera entries and campaign dosing lacked sourced product differentiation',
      bn: 'কলেরা টিকার পরস্পর সমাপতিত এন্ট্রি ও ক্যাম্পেইন ডোজ তথ্যের উৎস অনুপস্থিত ছিল',
    },
    statements: [
      {
        statement:
          'Legacy `cholera` and `choleraWC` overlapped in description, and `choleraWC` inaccurately described killed whole-cell OCV as "older/less effective".',
        evidence: [],
        origin: 'TikaTrack 2.x dataset prior to 3.1.0',
      },
      {
        statement:
          'WHO Cholera Position Paper (Aug 2017) defines killed bivalent WC-OCV as a standard 2-dose oral regimen ≥14 days apart (age ≥1 year) with a 1-dose surge option, and WHO Bangladesh (20 Aug 2026) confirms Bangladesh deployed 2 doses of Euvichol-S 14 days apart across 14 high-risk areas.',
        evidence: [
          { sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' },
          { sourceId: 'who-bd-cholera-campaign-2026', section: 'Campaign summary' },
        ],
        origin: 'WHO Cholera Position Paper (2017) & WHO Bangladesh (20 Aug 2026)',
      },
    ],
    affectedRecordIds: ['rec-cholera'],
    affectedLegacyIds: ['cholera', 'choleraWC', 'cholera-euvichol'],
    status: 'resolved-with-source',
    requiredAction:
      'Create a structured evidence record `rec-cholera` linked to WHO 2017 Position Paper and WHO Bangladesh Aug 2026 campaign report, and correct `choleraWC` classification wording.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' },
        { sourceId: 'who-bd-cholera-campaign-2026', section: 'Campaign summary' },
      ],
      decision:
        'Added structured record `rec-cholera` linking `cholera` (Bangladesh preventive/outbreak campaigns) and `choleraWC` (killed bivalent WC-OCV class), removed the misleading "older/less effective" copy from `choleraWC`, and documented the verified 2-dose (≥14 days apart, age ≥1 year) Euvichol-S campaign and 1-dose outbreak surge strategy.',
    },
  },
  {
    id: 'C-008',
    title: {
      en: 'Three research-stage products lacked explicit UI isolation and dated burden citations',
      bn: 'তিনটি গবেষণাধীন পণ্যে স্পষ্ট ইউআই পৃথকীকরণ ও তারিখযুক্ত রোগ-বোঝা উদ্ধৃতি ছিল না',
    },
    statements: [
      {
        statement:
          'Legacy `hiv`, `cancer-cervical`, and `tb-new` previously used `who-homepage` and uncited disease-burden claims while showing `0 doses` like normal vaccines in catalogue views.',
        evidence: [{ sourceId: 'who-homepage' }],
        origin: 'TikaTrack 2.x dataset prior to 3.1.0',
      },
      {
        statement:
          'WHO Fact Sheets (TB Nov 2026: ~1.13M deaths; Cervical cancer Nov 2026: ~280,000 deaths; HIV July 2026: no licensed vaccine) provide verified dated statistics, and TikaTrack 3.1 isolates these entries behind research-only UI labels and excludes them from the assistant corpus.',
        evidence: [
          { sourceId: 'who-fs-tuberculosis', section: 'Key facts' },
          { sourceId: 'who-fs-cervical-cancer', section: 'Key facts' },
          { sourceId: 'who-fs-hiv-aids', section: 'Key facts' },
        ],
        origin: 'WHO Fact Sheets (July–November 2026)',
      },
    ],
    affectedRecordIds: [],
    affectedLegacyIds: ['hiv', 'cancer-cervical', 'tb-new'],
    status: 'resolved-with-source',
    requiredAction:
      'Keep `isPublishable: false`, update burden stats to verified WHO Fact Sheets, and clearly mark UI cards/details as research-only with no licensed doses.',
    openedDate: '2026-10-31',
    resolution: {
      decidedOn: '2026-11-21',
      decidedBy: 'TikaTrack 3.1 evidence review',
      evidence: [
        { sourceId: 'who-fs-tuberculosis', section: 'Key facts' },
        { sourceId: 'who-fs-cervical-cancer', section: 'Key facts' },
        { sourceId: 'who-fs-hiv-aids', section: 'Key facts' },
      ],
      decision:
        'Kept `hiv`, `tb-new`, and `cancer-cervical` unpublished from the assistant corpus (`isPublishable: false`), updated disease burden claims in `additionalVaccines.ts` to cite the verified 2026 WHO Fact Sheets directly, and updated catalogue & detail pages to display a dedicated "Research only — 0 licensed doses" warning instead of routine dosing controls.',
    },
  },
];

const conflictById = new Map(conflicts.map((conflict) => [conflict.id, conflict]));

export function getConflict(id: string): ConflictEntry | undefined {
  return conflictById.get(id);
}

export function conflictsFor(recordId: string): ConflictEntry[] {
  return conflicts.filter(
    (conflict) => conflict.affectedRecordIds.includes(recordId) || conflict.affectedLegacyIds.includes(recordId),
  );
}

export const OPEN_CONFLICT_COUNT = conflicts.filter((conflict) => conflict.status === 'unresolved').length;
export const RESOLVED_CONFLICT_COUNT = conflicts.filter((conflict) => conflict.status !== 'unresolved').length;
