/**
 * Conflict register.
 *
 * Where two statements disagree, both are recorded here with their own
 * evidence and the record is marked `conflict-unresolved`. Nothing in this
 * file picks a winner: resolving a medical conflict requires an authoritative
 * document or a professional reviewer, and until one exists the app must show
 * the disagreement rather than a confident answer.
 *
 * Opened 2026-10-31 during the TikaTrack 3.0 evidence review.
 */

import type { ConflictEntry } from './types';

const WHO_BD_QUOTE_INTRODUCTIONS =
  'HepB vaccine was introduced in 2003, Hib in 2009, rubella in 2012, PCV and IPV in 2015, MR second dose in 2015 and fIPV in 2017.';

export const conflicts: readonly ConflictEntry[] = [
  {
    id: 'C-001',
    title: {
      en: 'fIPV is a national programme antigen but has no milestone in the schedule',
      bn: 'এফআইপিভি জাতীয় কর্মসূচির টিকা হলেও শিডিউলে এর কোনো মাইলফলক নেই',
    },
    statements: [
      {
        statement:
          'The TikaTrack schedule array contains 6 antigens (BCG, OPV, pentavalent, PCV, MR, TCV) across 14 dose events. fIPV is absent.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`',
      },
      {
        statement: 'fIPV was introduced into the Bangladesh EPI in 2017.',
        evidence: [{ sourceId: 'who-bd-immunization', quote: WHO_BD_QUOTE_INTRODUCTIONS }],
        origin: 'WHO Country Office for Bangladesh',
      },
      {
        statement:
          'The TikaTrack catalogue and FAQ text state fIPV is given at 6 and 14 weeks (2 doses), with no document-level source.',
        evidence: [{ sourceId: 'no-official-schedule-document' }],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts entry `fipv`, src/data/tikabot.ts FAQ `schedule-basic`',
      },
    ],
    affectedRecordIds: ['rec-fipv'],
    affectedLegacyIds: ['fipv', 'polio-ipv'],
    status: 'unresolved',
    requiredAction:
      'Obtain the official DGHS/EPI schedule document and confirm whether fIPV is delivered at 6 and 14 weeks in the routine programme. Do not add fIPV milestones to `schedule[]` until a document-level source is registered. Until then the tracker, reminders and passport under-report the national programme.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-002',
    title: {
      en: 'Month milestones are stored as day counts that do not match their labels',
      bn: 'মাসভিত্তিক মাইলফলক দিনের সংখ্যা হিসেবে সংরক্ষিত যা তাদের লেবেলের সাথে মেলে না',
    },
    statements: [
      {
        statement: 'The 9-month milestone is encoded as `ageDays: 270` and the 15-month milestone as `ageDays: 450`.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`',
      },
      {
        statement:
          'For a child born 2026-01-01 this produces due dates of 2026-09-28 and 2027-03-27, i.e. 3 and 5 days earlier than the calendar-month dates 2026-10-01 and 2027-04-01, and the generated explanations say "38 weeks"/"8 months" and "14 months".',
        evidence: [],
        origin: 'Executed behaviour of src/lib/smartScheduler.ts (verified 2026-10-31)',
      },
    ],
    affectedRecordIds: ['rec-mr', 'rec-tcv'],
    affectedLegacyIds: ['mr', 'tcv'],
    status: 'unresolved',
    requiredAction:
      'Confirm with the official schedule whether the programme specifies calendar months (9 and 15 months) or day offsets. The knowledge base now stores calendar ages; the scheduler still derives dates from `ageDays` and must be migrated in the age-arithmetic phase.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-003',
    title: {
      en: 'Rotavirus and HPV introduction status is described inconsistently across sources',
      bn: 'রোটাভাইরাস ও এইচপিভি টিকা প্রবর্তনের অবস্থা বিভিন্ন সূত্রে অসামঞ্জস্যপূর্ণ',
    },
    statements: [
      {
        statement:
          'The WHO Bangladesh immunization page (undated revision) says the government has a plan to introduce rotavirus and HPV vaccines "in near future".',
        evidence: [
          {
            sourceId: 'who-bd-immunization',
            quote: 'The govern has plan to introduce rota and HPV vaccine in near future.',
          },
        ],
        origin: 'WHO Country Office for Bangladesh (verbatim, including the original typo)',
      },
      {
        statement:
          'WHO Bangladesh published an HPV rollout item for the Rohingya camps on 2024-12-18, and a further HPV item for Sylhet on 2024-12-01.',
        evidence: [{ sourceId: 'who-bd-hpv-rohingya-2024' }],
        origin: 'WHO Country Office for Bangladesh news index',
      },
      {
        statement:
          'The TikaTrack dataset states a nationwide HPV campaign launched October 2023 and expanded to all divisions by October 2024, citing a Gavi article that has not been opened.',
        evidence: [{ sourceId: 'gavi-hpv-bangladesh' }],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts entry `hpv`',
      },
      {
        statement: 'The TikaTrack dataset lists rotavirus with `introduced: "Planned"` and 2 doses, with no source.',
        evidence: [{ sourceId: 'no-official-schedule-document' }],
        origin: 'TikaTrack 2.x dataset — src/data/additionalVaccines.ts entry `rotavirus`',
      },
    ],
    affectedRecordIds: ['rec-hpv', 'rec-rotavirus'],
    affectedLegacyIds: ['hpv', 'rotavirus'],
    status: 'unresolved',
    requiredAction:
      'Read the Gavi article and obtain the DGHS HPV campaign circular to fix the campaign start date, target cohort and dose count; obtain an official statement on rotavirus introduction. The WHO country page text is stale for HPV and must not be used to describe current status.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-004',
    title: {
      en: 'Ten products are labelled "routine" in the dataset but are not in the national schedule',
      bn: 'দশটি টিকা ডেটাসেটে "নিয়মিত" হিসেবে চিহ্নিত কিন্তু জাতীয় শিডিউলে নেই',
    },
    statements: [
      {
        statement:
          'Legacy `category: "routine"` is applied to fipv, mmr, hepatitisB, polio-ipv, dtp, hib, dtap, tdap, hexavalent and pentavalent-booster, none of which appear in `schedule[]`.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts and src/data/additionalVaccines.ts',
      },
      {
        statement:
          'Several of those entries carry non-Bangladeshi dose strings, e.g. DTP and DTaP "5 doses (2, 4, 6, 15-18 months, 4-6 years)", MMR "12-15 months, 4-6 years", IPV "4 doses (2, 4, 6-18 months, 4-6 years)".',
        evidence: [],
        origin: 'TikaTrack 2.x dataset (schedule text observed verbatim)',
      },
      {
        statement:
          'Hepatitis B and Hib antigens are delivered in Bangladesh through the pentavalent combination introduced in 2009 (HepB component introduced 2003).',
        evidence: [{ sourceId: 'who-bd-immunization', quote: WHO_BD_QUOTE_INTRODUCTIONS }],
        origin: 'WHO Country Office for Bangladesh',
      },
    ],
    affectedRecordIds: [],
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
    status: 'unresolved',
    requiredAction:
      'Reclassify each entry against the new taxonomy (bridge file now assigns `international-reference` or `private-market-bd` with `requires-professional-review`). A clinician must confirm whether standalone HepB, Hib or IPV products are used in Bangladesh outside the pentavalent combination, and whether any of these products are available in the private market.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-005',
    title: {
      en: 'Unofficial sources describe a 2026 national schedule that cannot be verified',
      bn: 'অনানুষ্ঠানিক সূত্র ২০২৬ সালের জাতীয় শিডিউলের বর্ণনা দেয় যা যাচাই করা যায়নি',
    },
    statements: [
      {
        statement:
          'Social-media and commercial health-blog sources found during the review describe an "Updated Bangladesh EPI Schedule (2026)" with 9 vaccines against 12 diseases, including rotavirus, and a schedule table listing IPV at 6 and 14 weeks with an 8-week minimum interval and PCV/OPV with 4-week minimum intervals.',
        evidence: [],
        origin: 'Non-authoritative web sources located 2026-10-31 — deliberately not registered as evidence',
      },
      {
        statement: 'TikaTrack encodes 6 antigens and 14 dose events, and no minimum intervals at all.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`',
      },
    ],
    affectedRecordIds: ['rec-fipv', 'rec-pcv', 'rec-opv', 'rec-rotavirus'],
    affectedLegacyIds: ['fipv', 'pcv', 'opv', 'rotavirus'],
    status: 'unresolved',
    requiredAction:
      'These sources are excluded by policy (a Facebook post, a slide-sharing site and a commercial clinic blog are not authoritative for a national schedule). Obtain the DGHS/EPI schedule document or the output of the October 2026 independent EPI review (draft report expected November 2026) before changing any antigen list, dose count or interval.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-006',
    title: {
      en: 'TCV introduction year is asserted with a homepage citation',
      bn: 'টিসিভি প্রবর্তনের সাল একটি হোমপেজ উদ্ধৃতি সহ দাবি করা হয়েছে',
    },
    statements: [
      {
        statement: 'The TikaTrack dataset records TCV with `introduced: "2026"` and 1 dose at 15 months, citing https://dghs.gov.bd.',
        evidence: [{ sourceId: 'dghs-homepage' }],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts entry `tcv`',
      },
      {
        statement:
          'The WHO Bangladesh immunization page lists introductions up to fIPV in 2017 and does not mention TCV; TCV nonetheless appears in the app\'s encoded schedule at the 15-month milestone.',
        evidence: [{ sourceId: 'who-bd-immunization', quote: WHO_BD_QUOTE_INTRODUCTIONS }],
        origin: 'WHO Country Office for Bangladesh',
      },
    ],
    affectedRecordIds: ['rec-tcv'],
    affectedLegacyIds: ['tcv', 'typhoidVi', 'typhoid-oral'],
    status: 'unresolved',
    requiredAction:
      'Register the DGHS/EPI TCV introduction circular (document-level URL, date) and confirm the age at delivery. A homepage URL is rejected as evidence for an introduction year.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-007',
    title: {
      en: 'Two cholera products overlap and neither has a sourced dosing statement',
      bn: 'দুটি কলেরা টিকা পরস্পর সমাপতিত এবং কারও ডোজ সংক্রান্ত তথ্যের সূত্র নেই',
    },
    statements: [
      {
        statement:
          'The dataset holds both `cholera` (category campaign, 2 doses, `introduced: "Campaign"`) and `choleraWC` (category campaign, 2 doses, 14 days apart), with overlapping antigen coverage.',
        evidence: [],
        origin: 'TikaTrack 2.x dataset — src/data/vaccines.ts and src/data/additionalVaccines.ts',
      },
      {
        statement: 'WHO Bangladesh documented a preventive cholera vaccination campaign launched in August 2026.',
        evidence: [{ sourceId: 'who-bd-cholera-campaign-2026' }],
        origin: 'WHO Country Office for Bangladesh news index',
      },
    ],
    affectedRecordIds: [],
    affectedLegacyIds: ['cholera', 'choleraWC'],
    status: 'unresolved',
    requiredAction:
      'Determine which product(s) were used in the 2026 campaign (WHO-prequalified oral cholera vaccines) and merge or clearly separate the two catalogue entries. Campaign dosing must come from the campaign circular, not from a fact sheet.',
    openedDate: '2026-10-31',
  },
  {
    id: 'C-008',
    title: {
      en: 'Three research-stage products are presented as vaccines',
      bn: 'তিনটি গবেষণাধীন পণ্য টিকা হিসেবে উপস্থাপন করা হয়েছে',
    },
    statements: [
      {
        statement:
          'The dataset includes `hiv`, `cancer-cervical` and `tb-new` with 0 doses, `introduced: "In development"`, efficacy "Under study", and the WHO homepage as their source URL. The assistant renders them with the sentence "…protects against…".',
        evidence: [{ sourceId: 'who-homepage' }],
        origin: 'TikaTrack 2.x dataset — src/data/additionalVaccines.ts; executed behaviour of src/lib/ragEngine.ts',
      },
      {
        statement:
          'The dataset also states "Cervical cancer kills 300,000+ women annually" and "TB kills 1.5 million people annually" as `diseaseRisk` values with no document-level citation.',
        evidence: [{ sourceId: 'who-homepage' }],
        origin: 'TikaTrack 2.x dataset — src/data/additionalVaccines.ts',
      },
    ],
    affectedRecordIds: [],
    affectedLegacyIds: ['hiv', 'cancer-cervical', 'tb-new'],
    status: 'unresolved',
    requiredAction:
      'These entries are now classified `research-not-available` with `productStatus: in-development` and `published: false`, which removes them from the assistant corpus. A decision is still needed on whether they remain visible in the catalogue behind an explicit "no licensed vaccine exists" notice, or are removed entirely. The disease-burden statistics must either be cited to a dated WHO document or deleted.',
    openedDate: '2026-10-31',
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
