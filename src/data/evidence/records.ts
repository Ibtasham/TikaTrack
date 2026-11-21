/**
 * Structured vaccine records.
 *
 * These are the evidence-backed records for the Bangladesh EPI programme,
 * national campaigns, planned introductions, and oral cholera vaccines.
 *
 * Rules shaping this file:
 * 1. **Every verified claim has an authoritative source.** Dosing, age,
 *    minimum interval, route, and contraindication claims marked
 *    `evidence-verified` cite reviewed WHO Position Papers (`who-pp-*`);
 *    programme history and campaign facts cite WHO Bangladesh, UNICEF
 *    Bangladesh, and Gavi publications; disease-burden context cites WHO Fact
 *    Sheets.
 * 2. **Domestic uncertainties stay explicit.** Bangladesh-specific domestic
 *    catch-up upper age limits (`maximumAge`) and unobtained DGHS circulars
 *    (C-005, C-006) remain `null` / `requires-professional-review` or
 *    `conflict-unresolved`.
 * 3. **Nothing is lost.** Descriptive fallback fields still carry legacy 2.x
 *    catalogue wording marked `legacy-unverified` until clinicians complete full
 *    formulary monograph review.
 */

import { allVaccines, schedule as legacySchedule } from '../vaccines';
import type {
  AgeSpec,
  CalendarAge,
  Claim,
  ClaimKind,
  DoseSpec,
  EvidenceRef,
  LocalizedText,
  ProgrammeClass,
  ProductStatus,
  ReviewStatus,
  VaccineRecord,
} from './types';
import { KNOWLEDGE_SCHEMA_VERSION } from './types';

/** Date of the evidence review that produced these records. */
export const REVIEW_DATE = '2026-11-21';
export const REVIEW_BY =
  'TikaTrack 3.1 clinical & public-health evidence review (WHO Position Papers, WHO Bangladesh, UNICEF, Gavi)';

const QUOTE_BD_INTRODUCTIONS =
  'HepB vaccine was introduced in 2003, Hib in 2009, rubella in 2012, PCV and IPV in 2015, MR second dose in 2015 and fIPV in 2017.';

// ---------------------------------------------------------------------------
// Claim constructors
// ---------------------------------------------------------------------------

function needsReview<T>(kind: ClaimKind, value: T | null, note: string, conflicts: string[] = []): Claim<T> {
  return {
    kind,
    value,
    evidence: [],
    reviewStatus: 'requires-professional-review',
    note,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

function legacyClaim<T>(kind: ClaimKind, value: T | null, note: string, conflicts: string[] = []): Claim<T> {
  return {
    kind,
    value,
    evidence: [],
    reviewStatus: 'legacy-unverified',
    note,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

function verifiedClaim<T>(
  kind: ClaimKind,
  value: T,
  evidence: EvidenceRef[],
  note?: string,
  conflicts?: string[],
): Claim<T> {
  return {
    kind,
    value,
    evidence,
    reviewStatus: 'evidence-verified',
    note,
    conflicts: conflicts && conflicts.length > 0 ? conflicts : undefined,
  };
}

function conflictClaim<T>(
  kind: ClaimKind,
  value: T | null,
  evidence: EvidenceRef[],
  note: string,
  conflicts: string[],
): Claim<T> {
  return {
    kind,
    value,
    evidence,
    reviewStatus: 'conflict-unresolved',
    note,
    conflicts,
  };
}

function verifiedProgrammeFact(value: string, sourceId: string, section?: string, quote?: string): Claim<string> {
  return {
    kind: 'programme-fact',
    value,
    evidence: [{ sourceId, section, quote }],
    reviewStatus: 'evidence-verified',
  };
}

function registeredProgrammeFact(value: string, sourceId: string): Claim<string> {
  return {
    kind: 'programme-fact',
    value,
    evidence: [{ sourceId }],
    reviewStatus: 'metadata-registered',
    note: 'Headline and date confirmed from the publisher index; full article body awaiting review.',
  };
}

function tx(en: string, bn: string): LocalizedText {
  return { en, bn };
}

function ageSpec(en: string, bn: string, calendar: CalendarAge, isMinimum = false): AgeSpec {
  return isMinimum ? { label: tx(en, bn), calendar, isMinimum: true } : { label: tx(en, bn), calendar };
}

// ---------------------------------------------------------------------------
// Transcription from the 2.x catalogue
// ---------------------------------------------------------------------------

function findLegacy(id: string) {
  const found = allVaccines.find((vaccine) => vaccine.id === id);
  if (!found) throw new Error(`evidence/records: legacy vaccine id "${id}" no longer exists`);
  return found;
}

function transcribeLegacyClaims(legacyId: string) {
  const legacy = findLegacy(legacyId);
  const origin = `Transcribed from the TikaTrack catalogue entry \`${legacyId}\` and pending formal DGHS/formulary monograph verification.`;
  return {
    names: legacy.name,
    fullNames: legacy.fullName,
    antigens: legacy.disease,
    targetPopulation: needsReview<LocalizedText>(
      'general-description',
      null,
      `${origin} Target population wording must be verified against official DGHS circular text.`,
    ),
    contraindications: [
      legacyClaim<LocalizedText>('contraindication', legacy.contraindications, origin),
    ],
    precautions: [
      needsReview<LocalizedText>(
        'precaution',
        null,
        'Precautions (such as deferral during moderate or severe acute febrile illness) must be confirmed against an official national EPI manual.',
      ),
    ],
    commonAdverseEvents: [legacyClaim<LocalizedText>('adverse-event', legacy.commonEffects, origin)],
    seriousAdverseEvents: [legacyClaim<LocalizedText>('adverse-event', legacy.seriousEffects, origin)],
    efficacy: legacyClaim(
      'efficacy',
      { value: legacy.efficacy },
      `${origin} Summary efficacy band requires trial/population-specific confirmation.`,
    ),
    diseaseBurden: legacyClaim<LocalizedText>(
      'disease-burden',
      legacy.diseaseRisk,
      `${origin} Disease-risk narrative awaiting country-specific epidemiologic citation.`,
    ),
    description: legacyClaim<LocalizedText>('general-description', legacy.description, origin),
    vaccineType: needsReview<string>(
      'general-description',
      null,
      'Vaccine platform awaits product-specific WHO prequalification confirmation.',
    ),
  };
}

// ---------------------------------------------------------------------------
// Dose construction helpers
// ---------------------------------------------------------------------------

interface VerifiedDoseConfig {
  doseNumber: number;
  label: LocalizedText;
  calendar: CalendarAge;
  legacyMilestoneKey: string;
  sourceId: string;
  section: string;
  minimumAge?: { en: string; bn: string; calendar: CalendarAge };
  minimumIntervalDays?: { days: number; from: 'previous-dose' | 'birth'; note?: string };
  route?: string;
  conflicts?: string[];
  recommendedReviewStatus?: 'evidence-verified' | 'conflict-unresolved';
  recommendedNote?: string;
}

function buildDose(cfg: VerifiedDoseConfig): DoseSpec {
  const conflictList = cfg.conflicts && cfg.conflicts.length > 0 ? cfg.conflicts : undefined;
  const recommendedAge: Claim<AgeSpec> =
    cfg.recommendedReviewStatus === 'conflict-unresolved'
      ? conflictClaim(
          'age',
          ageSpec(cfg.label.en, cfg.label.bn, cfg.calendar),
          [{ sourceId: cfg.sourceId, section: cfg.section }],
          cfg.recommendedNote ?? 'Routine delivery date awaiting primary DGHS circular verification.',
          cfg.conflicts ?? [],
        )
      : verifiedClaim(
          'age',
          ageSpec(cfg.label.en, cfg.label.bn, cfg.calendar),
          [{ sourceId: cfg.sourceId, section: cfg.section }],
          cfg.recommendedNote,
          conflictList,
        );

  const minimumAge: Claim<AgeSpec | null> = cfg.minimumAge
    ? verifiedClaim(
        'age',
        ageSpec(cfg.minimumAge.en, cfg.minimumAge.bn, cfg.minimumAge.calendar, true),
        [{ sourceId: cfg.sourceId, section: cfg.section }],
        'WHO Position Paper minimum recommended age for this dose.',
        conflictList,
      )
    : needsReview(
        'age',
        null,
        'Minimum age requires formal review against official national EPI guidelines.',
        cfg.conflicts,
      );

  const minimumIntervalFromPrevious: Claim<{ days: number; from: 'previous-dose' | 'birth' } | null> =
    cfg.minimumIntervalDays
      ? verifiedClaim(
          'interval',
          { days: cfg.minimumIntervalDays.days, from: cfg.minimumIntervalDays.from },
          [{ sourceId: cfg.sourceId, section: cfg.section }],
          cfg.minimumIntervalDays.note ?? 'WHO Position Paper minimum interval between consecutive doses.',
          conflictList,
        )
      : cfg.doseNumber === 1
        ? needsReview(
            'interval',
            null,
            'First dose in series; interval from previous dose is not applicable.',
            cfg.conflicts,
          )
        : needsReview(
            'interval',
            null,
            'Bangladesh domestic catch-up interval not yet obtained from primary DGHS circular.',
            cfg.conflicts,
          );

  const maximumAge: Claim<AgeSpec | null> = needsReview(
    'age',
    null,
    'Bangladesh domestic maximum age / upper catch-up cutoff awaits official DGHS/EPI circular & October 2026 EPI review report (C-005).',
    cfg.conflicts ?? ['C-005'],
  );

  const route: Claim<string> = cfg.route
    ? verifiedClaim('general-description', cfg.route, [{ sourceId: cfg.sourceId, section: cfg.section }])
    : needsReview<string>('general-description', null, 'Route awaits official product monograph verification.');

  return {
    doseNumber: cfg.doseNumber,
    recommendedAge,
    minimumAge,
    minimumIntervalFromPrevious,
    maximumAge,
    route,
    legacyMilestoneKey: cfg.legacyMilestoneKey,
  };
}

/** Keys of the milestones encoded in the schedule, for traceability. */
export const LEGACY_MILESTONE_KEYS = legacySchedule.map((item) => item.age.en);

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface RecordSpec {
  id: string;
  legacyIds: string[];
  antigenIds: string[];
  programme: ProgrammeClass;
  productStatus: ProductStatus;
  alsoUsedFor?: ProgrammeClass[];
  doses: DoseSpec[];
  doseCount: Claim<number>;
  vaccineType?: Claim<string>;
  targetPopulation?: Claim<LocalizedText>;
  contraindications?: Claim<LocalizedText>[];
  diseaseBurden?: Claim<LocalizedText>;
  programmeFacts: Claim<string>[];
  reviewStatus: ReviewStatus;
  sourcePublished: string | null;
  conflicts?: string[];
  reviewNote?: string;
}

function buildRecord(spec: RecordSpec): VaccineRecord {
  const transcribed = transcribeLegacyClaims(spec.legacyIds[0]);
  return {
    id: spec.id,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    revision: 2,
    names: transcribed.names,
    fullNames: transcribed.fullNames,
    antigens: transcribed.antigens,
    antigenIds: spec.antigenIds,
    vaccineType: spec.vaccineType ?? transcribed.vaccineType,
    targetPopulation: spec.targetPopulation ?? transcribed.targetPopulation,
    programme: spec.programme,
    productStatus: spec.productStatus,
    alsoUsedFor: spec.alsoUsedFor,
    doses: spec.doses,
    doseCount: spec.doseCount,
    contraindications: spec.contraindications ?? [...transcribed.contraindications],
    precautions: [...transcribed.precautions],
    commonAdverseEvents: [...transcribed.commonAdverseEvents],
    seriousAdverseEvents: [...transcribed.seriousAdverseEvents],
    efficacy: transcribed.efficacy,
    diseaseBurden: spec.diseaseBurden ?? transcribed.diseaseBurden,
    description: transcribed.description,
    programmeFacts: spec.programmeFacts,
    reviewNote: spec.reviewNote,
    dates: {
      effectiveFrom: null,
      supersededOn: null,
      lastReviewed: REVIEW_DATE,
      sourcePublished: spec.sourcePublished,
      reviewedBy: REVIEW_BY,
    },
    reviewStatus: spec.reviewStatus,
    published: true,
    conflicts: spec.conflicts ?? [],
    legacyIds: spec.legacyIds,
  };
}

export const vaccineRecords: readonly VaccineRecord[] = [
  buildRecord({
    id: 'rec-bcg',
    legacyIds: ['bcg'],
    antigenIds: ['tuberculosis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'live-attenuated', [
      { sourceId: 'who-pp-bcg-2018', section: 'Recommendations & administration' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Newborns at birth in high TB-burden settings', 'উচ্চ যক্ষ্মা-প্রবণ এলাকায় জন্মের সময় নবজাতক'),
      [{ sourceId: 'who-pp-bcg-2018', section: 'Recommendations & administration' }],
    ),
    contraindications: [
      verifiedClaim(
        'contraindication',
        tx(
          'Severe immunodeficiency or untreated symptomatic HIV infection without ART stability (WHO BCG Position Paper, Feb 2018)',
          'গুরুতর অনাক্রম্যতা দুর্বলতা বা অ্যান্টিরেট্রোভাইরাল চিকিৎসাবিহীন লক্ষণযুক্ত এইচআইভি সংক্রমণ (WHO বিসিজি পজিশন পেপার, ফেব্রু ২০১৮)',
        ),
        [{ sourceId: 'who-pp-bcg-2018', section: 'Recommendations & administration' }],
      ),
    ],
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Tuberculosis caused approximately 1.13 million deaths globally (WHO TB Fact Sheet, Nov 2026); infant BCG prevents severe meningeal and miliary TB.',
        'বিশ্বজুড়ে যক্ষ্মায় বছরে প্রায় ১১.৩ লক্ষ মৃত্যু ঘটে (WHO ফ্যাক্ট শিট, নভে ২০২৬); নবজাতক বিসিজি মেনিনজিয়াল ও মিলিয়ারি যক্ষ্মা প্রতিরোধ করে।',
      ),
      [{ sourceId: 'who-fs-tuberculosis', section: 'Key facts' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('At Birth', 'জন্মের সময়'),
        calendar: { days: 0 },
        legacyMilestoneKey: 'At Birth',
        sourceId: 'who-pp-bcg-2018',
        section: 'Recommendations & administration',
        minimumAge: { en: 'At birth', bn: 'জন্মের সময়', calendar: { days: 0 } },
        route: 'Intradermal (0.05 mL, left upper arm)',
      }),
    ],
    doseCount: verifiedClaim('dosing', 1, [
      { sourceId: 'who-pp-bcg-2018', section: 'Recommendations & administration' },
    ]),
    programmeFacts: [
      verifiedProgrammeFact(
        "Bangladesh's EPI was established in 1979.",
        'who-bd-epi-review-2026',
        'Full article',
      ),
    ],
    reviewStatus: 'evidence-verified',
    sourcePublished: '2018-02-23',
    reviewNote:
      'Primary birth dosing verified against WHO BCG Position Paper (Feb 2018). Domestic catch-up upper age cutoffs await official DGHS manual review.',
  }),
  buildRecord({
    id: 'rec-opv',
    legacyIds: ['opv'],
    antigenIds: ['poliomyelitis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'live-attenuated (bOPV)', [
      { sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Infants at birth and 6, 10, and 14 weeks', 'জন্মের সময় এবং ৬, ১০ ও ১৪ সপ্তাহ বয়সী শিশু'),
      [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
    ),
    contraindications: [
      verifiedClaim(
        'contraindication',
        tx(
          'Severe primary immunodeficiency disorders or severe allergic reaction to previous dose (use IPV instead)',
          'গুরুতর প্রাথমিক অনাক্রম্যতা দুর্বলতা বা পূর্ববর্তী ডোজে গুরুতর অ্যালার্জি (পরিবর্তে IPV ব্যবহারযোগ্য)',
        ),
        [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
      ),
    ],
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Poliovirus causes irreversible paralysis with no cure; Bangladesh has remained polio-free since its last wild case in 2006.',
        'পোলিওভাইরাস অপরিবর্তনীয় পক্ষাঘাত ঘটায়; বাংলাদেশ ২০০৬ সাল থেকে পোলিওমুক্ত রয়েছে।',
      ),
      [{ sourceId: 'who-fs-poliomyelitis', section: 'Key facts' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('At Birth', 'জন্মের সময়'),
        calendar: { days: 0 },
        legacyMilestoneKey: 'At Birth',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: 'At birth', bn: 'জন্মের সময়', calendar: { days: 0 } },
        route: 'Oral (2 drops)',
        conflicts: ['C-005'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('6 Weeks', '৬ সপ্তাহ'),
        calendar: { weeks: 6 },
        legacyMilestoneKey: '6 Weeks',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: '6 Weeks', bn: '৬ সপ্তাহ', calendar: { weeks: 6 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Oral (2 drops)',
        conflicts: ['C-005'],
      }),
      buildDose({
        doseNumber: 3,
        label: tx('10 Weeks', '১০ সপ্তাহ'),
        calendar: { weeks: 10 },
        legacyMilestoneKey: '10 Weeks',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: '10 Weeks', bn: '১০ সপ্তাহ', calendar: { weeks: 10 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Oral (2 drops)',
        conflicts: ['C-005'],
      }),
      buildDose({
        doseNumber: 4,
        label: tx('14 Weeks', '১৪ সপ্তাহ'),
        calendar: { weeks: 14 },
        legacyMilestoneKey: '14 Weeks',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: '14 Weeks', bn: '১৪ সপ্তাহ', calendar: { weeks: 14 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Oral (2 drops)',
        conflicts: ['C-005'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      4,
      [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
      undefined,
      ['C-005'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Bangladesh has remained polio-free; the last wild poliovirus case was detected in 2006.',
        'who-bd-immunization',
        'Overview / timeline',
        'Last case of wild poliovirus was detected in 2006 and maintains polio free since then.',
      ),
    ],
    reviewStatus: 'requires-professional-review',
    sourcePublished: '2022-06-24',
    conflicts: ['C-005'],
    reviewNote:
      'WHO Polio Position Paper (June 2022) verifies birth + 6/10/14 week schedule and 4-week minimum intervals. Bangladesh domestic catch-up upper age caps remain under C-005.',
  }),
  buildRecord({
    id: 'rec-pentavalent',
    legacyIds: ['pentavalent'],
    antigenIds: ['diphtheria', 'tetanus', 'pertussis', 'hepatitis-b', 'haemophilus-influenzae-b'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'inactivated combination (DTwP-HepB-Hib)', [
      { sourceId: 'who-pp-diphtheria-2017', section: 'Primary infant series' },
      { sourceId: 'who-pp-hepb-2017', section: 'Infant schedules' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Infants at 6, 10, and 14 weeks', '৬, ১০ ও ১৪ সপ্তাহ বয়সী শিশু'),
      [{ sourceId: 'who-pp-diphtheria-2017', section: 'Primary infant series' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('6 Weeks', '৬ সপ্তাহ'),
        calendar: { weeks: 6 },
        legacyMilestoneKey: '6 Weeks',
        sourceId: 'who-pp-diphtheria-2017',
        section: 'Primary infant series',
        minimumAge: { en: '6 Weeks', bn: '৬ সপ্তাহ', calendar: { weeks: 6 } },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
      }),
      buildDose({
        doseNumber: 2,
        label: tx('10 Weeks', '১০ সপ্তাহ'),
        calendar: { weeks: 10 },
        legacyMilestoneKey: '10 Weeks',
        sourceId: 'who-pp-diphtheria-2017',
        section: 'Primary infant series',
        minimumAge: { en: '10 Weeks', bn: '১০ সপ্তাহ', calendar: { weeks: 10 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
      }),
      buildDose({
        doseNumber: 3,
        label: tx('14 Weeks', '১৪ সপ্তাহ'),
        calendar: { weeks: 14 },
        legacyMilestoneKey: '14 Weeks',
        sourceId: 'who-pp-diphtheria-2017',
        section: 'Primary infant series',
        minimumAge: { en: '14 Weeks', bn: '১৪ সপ্তাহ', calendar: { weeks: 14 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      3,
      [
        { sourceId: 'who-pp-diphtheria-2017', section: 'Primary infant series' },
        { sourceId: 'who-pp-pertussis-2015', section: 'Infant primary series' },
        { sourceId: 'who-pp-tetanus-2017', section: 'Primary & Td transition' },
        { sourceId: 'who-pp-hepb-2017', section: 'Infant schedules' },
      ],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Hepatitis B antigen was introduced into the Bangladesh EPI in 2003 and Hib in 2009; both are delivered through the pentavalent combination.',
        'who-bd-immunization',
        'Overview / timeline',
        QUOTE_BD_INTRODUCTIONS,
      ),
    ],
    reviewStatus: 'evidence-verified',
    sourcePublished: '2017-08-04',
    conflicts: ['C-004'],
    reviewNote:
      'C-004 resolved: Pentavalent is confirmed as the national routine source for Diphtheria, Pertussis, Tetanus, Hepatitis B, and Hib in Bangladesh EPI.',
  }),
  buildRecord({
    id: 'rec-pcv',
    legacyIds: ['pcv'],
    antigenIds: ['streptococcus-pneumoniae'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'conjugate', [
      { sourceId: 'who-pp-pcv-2019', section: 'Schedules & minimum intervals' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Infants at 6, 10, and 14 weeks (3p+0 schedule)', '৬, ১০ ও ১৪ সপ্তাহ বয়সী শিশু (৩+০ সূচি)'),
      [{ sourceId: 'who-pp-pcv-2019', section: 'Schedules & minimum intervals' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('6 Weeks', '৬ সপ্তাহ'),
        calendar: { weeks: 6 },
        legacyMilestoneKey: '6 Weeks',
        sourceId: 'who-pp-pcv-2019',
        section: 'Schedules & minimum intervals',
        minimumAge: { en: '6 Weeks', bn: '৬ সপ্তাহ', calendar: { weeks: 6 } },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
        conflicts: ['C-005'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('10 Weeks', '১০ সপ্তাহ'),
        calendar: { weeks: 10 },
        legacyMilestoneKey: '10 Weeks',
        sourceId: 'who-pp-pcv-2019',
        section: 'Schedules & minimum intervals',
        minimumAge: { en: '10 Weeks', bn: '১০ সপ্তাহ', calendar: { weeks: 10 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
        conflicts: ['C-005'],
      }),
      buildDose({
        doseNumber: 3,
        label: tx('14 Weeks', '১৪ সপ্তাহ'),
        calendar: { weeks: 14 },
        legacyMilestoneKey: '14 Weeks',
        sourceId: 'who-pp-pcv-2019',
        section: 'Schedules & minimum intervals',
        minimumAge: { en: '14 Weeks', bn: '১৪ সপ্তাহ', calendar: { weeks: 14 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Intramuscular (0.5 mL, anterolateral thigh)',
        conflicts: ['C-005'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      3,
      [{ sourceId: 'who-pp-pcv-2019', section: 'Schedules & minimum intervals' }],
      undefined,
      ['C-005'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'PCV was introduced into the Bangladesh EPI in 2015.',
        'who-bd-immunization',
        'Overview / timeline',
        QUOTE_BD_INTRODUCTIONS,
      ),
    ],
    reviewStatus: 'requires-professional-review',
    sourcePublished: '2019-02-22',
    conflicts: ['C-005'],
    reviewNote:
      'WHO PCV Position Paper (Feb 2019) supports 3p+0 infant dosing starting at 6 weeks with >=4-week intervals. Whether Bangladesh adds a booster or adjusts catch-up cutoffs awaits October 2026 EPI review output (C-005).',
  }),
  buildRecord({
    id: 'rec-fipv',
    legacyIds: ['fipv'],
    antigenIds: ['poliomyelitis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'inactivated (fractional intradermal IPV)', [
      { sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Infants at 6 and 14 weeks', '৬ ও ১৪ সপ্তাহ বয়সী শিশু'),
      [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('6 Weeks', '৬ সপ্তাহ'),
        calendar: { weeks: 6 },
        legacyMilestoneKey: '6 Weeks',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: '6 Weeks', bn: '৬ সপ্তাহ', calendar: { weeks: 6 } },
        route: 'Intradermal (0.1 mL)',
        conflicts: ['C-001', 'C-005'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('14 Weeks', '১৪ সপ্তাহ'),
        calendar: { weeks: 14 },
        legacyMilestoneKey: '14 Weeks',
        sourceId: 'who-pp-polio-2022',
        section: 'Schedule, fIPV & bOPV dosing',
        minimumAge: { en: '14 Weeks', bn: '১৪ সপ্তাহ', calendar: { weeks: 14 } },
        minimumIntervalDays: { days: 56, from: 'previous-dose', note: 'WHO 2022 fIPV schedule uses an 8-week interval (6 and 14 weeks).' },
        route: 'Intradermal (0.1 mL)',
        conflicts: ['C-001', 'C-005'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      2,
      [{ sourceId: 'who-pp-polio-2022', section: 'Schedule, fIPV & bOPV dosing' }],
      undefined,
      ['C-001'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'fIPV was introduced into the Bangladesh EPI in 2017.',
        'who-bd-immunization',
        'Overview / timeline',
        QUOTE_BD_INTRODUCTIONS,
      ),
    ],
    reviewStatus: 'requires-professional-review',
    sourcePublished: '2022-06-24',
    conflicts: ['C-001', 'C-004', 'C-005'],
    reviewNote:
      'C-001 resolved: fIPV-1 (6 Weeks) and fIPV-2 (14 Weeks) are now integrated into `schedule[]` backed by WHO Bangladesh (2017) and WHO Polio Position Paper (June 2022). Domestic catch-up caps remain under C-005.',
  }),
  buildRecord({
    id: 'rec-mr',
    legacyIds: ['mr'],
    antigenIds: ['measles', 'rubella'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    alsoUsedFor: ['bd-sia', 'bd-national-campaign'],
    vaccineType: verifiedClaim('general-description', 'live-attenuated', [
      { sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' },
      { sourceId: 'who-pp-rubella-2020', section: 'Co-administration & contraindications' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx('Infants at 9 months (MR-1) and 15 months (MR-2)', '৯ মাস (এমআর-১) ও ১৫ মাস (এমআর-২) বয়সী শিশু'),
      [{ sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' }],
    ),
    contraindications: [
      verifiedClaim(
        'contraindication',
        tx(
          'Pregnancy, severe immunodeficiency, or severe allergic reaction to a previous dose or vaccine component (WHO Measles & Rubella Position Papers)',
          'গর্ভাবস্থা, গুরুতর অনাক্রম্যতা দুর্বলতা বা পূর্ববর্তী ডোজ/উপাদানে গুরুতর অ্যালার্জি (WHO হাম ও রুবেলা পজিশন পেপার)',
        ),
        [
          { sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' },
          { sourceId: 'who-pp-rubella-2020', section: 'Co-administration & contraindications' },
        ],
      ),
    ],
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Measles causes severe pneumonia and encephalitis; Bangladesh documented a 2026 outbreak prompting emergency SIAs despite achieving rubella control in 2018.',
        'হাম গুরুতর নিউমোনিয়া ও এনকেফালাইটিস ঘটায়; ২০১৮ সালে রুবেলা নিয়ন্ত্রণ অর্জনের পরও ২০২৬ সালের প্রাদুর্ভাবে জরুরি এসআইএ ক্যাম্পেইন পরিচালিত হয়েছে।',
      ),
      [
        { sourceId: 'who-fs-measles', section: 'Key facts' },
        { sourceId: 'who-bd-epi-review-2026', section: 'Full article' },
      ],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('9 Months', '৯ মাস'),
        calendar: { months: 9 },
        legacyMilestoneKey: '9 Months',
        sourceId: 'who-pp-measles-2017',
        section: 'Routine schedule (MCV1/MCV2)',
        minimumAge: { en: '9 Months (6 months in outbreak/SIA settings)', bn: '৯ মাস (প্রাদুর্ভাব/এসআইএ-তে ৬ মাস)', calendar: { months: 9 } },
        route: 'Subcutaneous (0.5 mL)',
        conflicts: ['C-002'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('15 Months', '১৫ মাস'),
        calendar: { months: 15 },
        legacyMilestoneKey: '15 Months',
        sourceId: 'who-pp-measles-2017',
        section: 'Routine schedule (MCV1/MCV2)',
        minimumAge: { en: '10 Months (min 4 weeks after MCV1)', bn: '১০ মাস (প্রথম ডোজের ন্যূনতম ৪ সপ্তাহ পর)', calendar: { months: 10 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Subcutaneous (0.5 mL)',
        conflicts: ['C-002'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      2,
      [{ sourceId: 'who-pp-measles-2017', section: 'Routine schedule (MCV1/MCV2)' }],
      undefined,
      ['C-002'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Rubella vaccine was introduced in 2012 and the second MR dose in 2015.',
        'who-bd-immunization',
        'Overview / timeline',
        QUOTE_BD_INTRODUCTIONS,
      ),
      verifiedProgrammeFact(
        'Bangladesh achieved the rubella control goal in 2018.',
        'who-bd-immunization',
        'Overview / timeline',
        'Bangladesh also achieved rubella control goal in 2018.',
      ),
      verifiedProgrammeFact(
        'A measles outbreak occurred in Bangladesh in 2026, highlighting persistent immunity gaps.',
        'who-bd-epi-review-2026',
        'Full article',
        'However, the measles outbreak in 2026 has highlighted persistent immunity gaps and vulnerabilities within the immunization system.',
      ),
      registeredProgrammeFact(
        'An emergency measles-rubella supplementary immunization activity was launched in April 2026 to protect over 1.2 million children.',
        'who-bd-mr-sia-2026',
      ),
    ],
    reviewStatus: 'evidence-verified',
    sourcePublished: '2017-04-28',
    conflicts: ['C-002'],
    reviewNote:
      'C-002 resolved: MR-1 (9 months) and MR-2 (15 months) now use calendar-month calculation and are verified against WHO Measles (2017) & Rubella (2020) Position Papers.',
  }),
  buildRecord({
    id: 'rec-tcv',
    legacyIds: ['tcv'],
    antigenIds: ['salmonella-typhi'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'conjugate', [
      { sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' },
    ]),
    targetPopulation: conflictClaim(
      'general-description',
      tx(
        'Routine 15-month age target reported in national news following the Oct 2025 50M-child campaign; primary DGHS circular pending',
        'অক্টোবর ২০২৫-এর ৫ কোটি শিশুর ক্যাম্পেইনের পর জাতীয় সংবাদে ১৫ মাস বয়সে নিয়মিত প্রয়োগের তথ্য; প্রাথমিক ডিজিএইচএস সার্কুলার অপেক্ষমাণ',
      ),
      [
        { sourceId: 'unicef-bd-tcv-campaign-2025', section: 'Press release' },
        { sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' },
      ],
      'Nationwide Oct 2025 campaign and WHO Aug 2026 Position Paper verified; primary DGHS Aug 2026 routine circular unobtained (C-006).',
      ['C-006'],
    ),
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Typhoid fever caused by Salmonella Typhi carries substantial morbidity in endemic South Asian regions.',
        'সালমোনেলা টাইফি দ্বারা সৃষ্ট টাইফয়েড জ্বর দক্ষিণ এশিয়ার স্থানীয় অঞ্চলে উল্লেখযোগ্য স্বাস্থ্য ঝুঁকি সৃষ্টি করে।',
      ),
      [{ sourceId: 'who-fs-typhoid', section: 'Key facts' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('15 Months', '১৫ মাস'),
        calendar: { months: 15 },
        legacyMilestoneKey: '15 Months',
        sourceId: 'who-pp-typhoid-2026',
        section: 'TCV schedule & safety',
        minimumAge: { en: '6 Months (WHO minimum TCV age)', bn: '৬ মাস (WHO সর্বনিম্ন TCV বয়স)', calendar: { months: 6 } },
        route: 'Intramuscular (0.5 mL)',
        conflicts: ['C-002', 'C-006'],
        recommendedReviewStatus: 'conflict-unresolved',
        recommendedNote:
          'Routine delivery at 15 months from 1 Aug 2026 is reported by BSS & The Daily Star (14 Jul 2026) and supported by WHO Aug 2026 Position Paper, but primary DGHS circular remains unobtained (C-006).',
      }),
    ],
    doseCount: conflictClaim(
      'dosing',
      1,
      [{ sourceId: 'who-pp-typhoid-2026', section: 'TCV schedule & safety' }],
      'WHO recommends a single TCV dose; Bangladesh routine EPI introduction circular date/terms remain open under C-006.',
      ['C-006'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Bangladesh launched a nationwide TCV catch-up campaign in October 2025 protecting approximately 50 million children.',
        'unicef-bd-tcv-campaign-2025',
        'Press release',
      ),
      verifiedProgrammeFact(
        'Rohingya refugee camp children were included in the late-2025 nationwide typhoid vaccination campaign.',
        'who-bd-tcv-rohingya-2025',
        'Overview',
      ),
    ],
    reviewStatus: 'conflict-unresolved',
    sourcePublished: '2026-08-18',
    conflicts: ['C-002', 'C-006'],
    reviewNote:
      'C-002 calendar-month arithmetic resolved (15 calendar months). C-006 stays UNRESOLVED until the official DGHS/MOHFW routine introduction circular is obtained and registered.',
  }),
  buildRecord({
    id: 'rec-hpv',
    legacyIds: ['hpv'],
    antigenIds: ['human-papillomavirus'],
    programme: 'bd-national-campaign',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'recombinant virus-like particle (VLP)', [
      { sourceId: 'who-pp-hpv-2022', section: 'Off-label single-dose schedule recommendation' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx(
        'Girls aged 10–14 years (Grades 5–9 / out-of-school cohort) in Bangladesh national campaign',
        'বাংলাদেশ জাতীয় ক্যাম্পেইনে ১০–১৪ বছর বয়সী কিশোরী (৫ম–৯ম শ্রেণি / স্কুলবহির্ভূত)',
      ),
      [{ sourceId: 'gavi-hpv-bangladesh', section: 'National rollout report' }],
    ),
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Cervical cancer causes approximately 280,000 deaths among women annually worldwide and is preventable with HPV vaccination.',
        'বিশ্বজুড়ে জরায়ুমুখ ক্যানসারে প্রতি বছর প্রায় ২ লক্ষ ৮০ হাজার নারীর মৃত্যু হয় এবং এইচপিভি টিকায় তা প্রতিরোধযোগ্য।',
      ),
      [{ sourceId: 'who-fs-cervical-cancer', section: 'Key facts' }],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('Girls 10-14 years (single-dose campaign)', 'কিশোরী ১০-১৪ বছর (একক ডোজ ক্যাম্পেইন)'),
        calendar: { years: 10 },
        legacyMilestoneKey: 'campaign',
        sourceId: 'who-pp-hpv-2022',
        section: 'Off-label single-dose schedule recommendation',
        minimumAge: { en: '9 Years (BD campaign 10–14y)', bn: '৯ বছর (বাংলাদেশ ক্যাম্পেইন ১০–১৪ বছর)', calendar: { years: 9 } },
        route: 'Intramuscular (0.5 mL)',
        conflicts: ['C-003'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      1,
      [{ sourceId: 'who-pp-hpv-2022', section: 'Off-label single-dose schedule recommendation' }],
      undefined,
      ['C-003'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Phase 1 launched in Dhaka Division in October 2023 (>1.5 million girls) and Phase 2 expanded nationwide across 7 divisions on 24 October 2024 targeting 6.2 million girls aged 10–14.',
        'gavi-hpv-bangladesh',
        'National rollout report',
      ),
      verifiedProgrammeFact(
        'HPV vaccination was rolled out in Rohingya refugee camps in December 2024.',
        'who-bd-hpv-rohingya-2024',
        'Full article',
      ),
    ],
    reviewStatus: 'evidence-verified',
    sourcePublished: '2024-12-10',
    conflicts: ['C-003'],
    reviewNote:
      'C-003 resolved: single-dose campaign for girls 10–14 years (Grades 5–9) verified via Gavi (Dec 2024), WHO Bangladesh (Dec 2024), and WHO HPV Position Paper (Dec 2022).',
  }),
  buildRecord({
    id: 'rec-rotavirus',
    legacyIds: ['rotavirus'],
    antigenIds: ['rotavirus'],
    programme: 'bd-planned-introduction',
    productStatus: 'not-yet-introduced-bd',
    alsoUsedFor: ['private-market-bd'],
    vaccineType: verifiedClaim('general-description', 'live-attenuated oral', [
      { sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx(
        'Infants starting at 6 weeks of age (WHO reference; available privately in Bangladesh while routine EPI launch remains planned)',
        '৬ সপ্তাহ বয়স থেকে শিশু (WHO নির্দেশনা; বাংলাদেশে নিয়মিত ইপিআই-তে এখনো পরিকল্পিত, বেসরকারি ক্লিনিকে প্রাপ্য)',
      ),
      [{ sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' }],
    ),
    contraindications: [
      verifiedClaim(
        'contraindication',
        tx(
          'History of intussusception or severe combined immunodeficiency (SCID)',
          'ইন্টাসসেপশনের ইতিহাস বা সিভিয়ার কম্বাইন্ড ইমিউনোডেফিসিয়েন্সি (SCID)',
        ),
        [{ sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' }],
      ),
    ],
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('Planned EPI / Private 6 Weeks', 'পরিকল্পিত ইপিআই / বেসরকারি ৬ সপ্তাহ'),
        calendar: { weeks: 6 },
        legacyMilestoneKey: '(none)',
        sourceId: 'who-pp-rotavirus-2021',
        section: 'Schedule, contraindications & safety',
        minimumAge: { en: '6 Weeks', bn: '৬ সপ্তাহ', calendar: { weeks: 6 } },
        route: 'Oral',
        conflicts: ['C-003', 'C-005'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('Planned EPI / Private 10 Weeks', 'পরিকল্পিত ইপিআই / বেসরকারি ১০ সপ্তাহ'),
        calendar: { weeks: 10 },
        legacyMilestoneKey: '(none)',
        sourceId: 'who-pp-rotavirus-2021',
        section: 'Schedule, contraindications & safety',
        minimumAge: { en: '10 Weeks', bn: '১০ সপ্তাহ', calendar: { weeks: 10 } },
        minimumIntervalDays: { days: 28, from: 'previous-dose' },
        route: 'Oral',
        conflicts: ['C-003', 'C-005'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      2,
      [{ sourceId: 'who-pp-rotavirus-2021', section: 'Schedule, contraindications & safety' }],
      'WHO-prequalified 2-dose (Rotarix) or 3-dose (RotaTeq/Rotavac) schedules; not yet delivered under free BD routine EPI.',
      ['C-003'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Rotavirus vaccine introduction into free Bangladesh national routine EPI remains planned.',
        'who-bd-immunization',
        'Overview / timeline',
        'The govern has plan to introduce rota and HPV vaccine in near future.',
      ),
    ],
    reviewStatus: 'requires-professional-review',
    sourcePublished: '2021-07-16',
    conflicts: ['C-003', 'C-005'],
    reviewNote:
      'C-003 resolved regarding non-EPI status (rotavirus is planned nationally and available privately). Whether rotavirus joins routine EPI after the October 2026 review remains under C-005.',
  }),
  buildRecord({
    id: 'rec-cholera',
    legacyIds: ['cholera', 'choleraWC'],
    antigenIds: ['vibrio-cholerae'],
    programme: 'bd-national-campaign',
    productStatus: 'licensed-bd',
    vaccineType: verifiedClaim('general-description', 'inactivated killed bivalent whole-cell OCV (WC-OCV)', [
      { sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' },
    ]),
    targetPopulation: verifiedClaim(
      'general-description',
      tx(
        'Individuals aged 1 year and older in cholera-endemic areas or preventive campaigns (e.g. Aug–Oct 2026 BD campaign)',
        'কলেরা-প্রবণ এলাকা বা প্রতিরোধমূলক ক্যাম্পেইনে ১ বছর ও তদূর্ধ্ব বয়সী ব্যক্তি (যেমন আগস্ট–অক্টোবর ২০২৬ ক্যাম্পেইন)',
      ),
      [
        { sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' },
        { sourceId: 'who-bd-cholera-campaign-2026', section: 'Campaign summary' },
      ],
    ),
    contraindications: [
      verifiedClaim(
        'contraindication',
        tx(
          'Age under 1 year (killed bivalent WC-OCV); severe hypersensitivity to a previous dose',
          '১ বছরের কম বয়স (নিষ্ক্রিয় বাইভ্যালেন্ট OCV); পূর্ববর্তী ডোজে গুরুতর অ্যালার্জি',
        ),
        [{ sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' }],
      ),
    ],
    diseaseBurden: verifiedClaim(
      'disease-burden',
      tx(
        'Cholera causes acute watery diarrhea and rapid dehydration; Bangladesh deploys 2-dose preventive OCV campaigns across high-risk hot spots.',
        'কলেরা তীব্র জলীয় ডায়রিয়া ও দ্রুত পানিশূন্যতা ঘটায়; বাংলাদেশ উচ্চ-ঝুঁকিপূর্ণ এলাকায় ২ ডোজের প্রতিরোধমূলক ওসিভি ক্যাম্পেইন পরিচালনা করে।',
      ),
      [
        { sourceId: 'who-fs-cholera', section: 'Key facts' },
        { sourceId: 'who-bd-cholera-campaign-2026', section: 'Campaign summary' },
      ],
    ),
    doses: [
      buildDose({
        doseNumber: 1,
        label: tx('Round 1 (1+ years)', 'রাউন্ড ১ (১+ বছর)'),
        calendar: { years: 1 },
        legacyMilestoneKey: 'campaign',
        sourceId: 'who-pp-cholera-2017',
        section: 'WC-OCV dosing & emergency 1-dose option',
        minimumAge: { en: '1 Year', bn: '১ বছর', calendar: { years: 1 } },
        route: 'Oral (1.5 mL vial)',
        conflicts: ['C-007'],
      }),
      buildDose({
        doseNumber: 2,
        label: tx('Round 2 (≥14 days later)', 'রাউন্ড ২ (কমপক্ষে ১৪ দিন পর)'),
        calendar: { years: 1, days: 14 },
        legacyMilestoneKey: 'campaign',
        sourceId: 'who-pp-cholera-2017',
        section: 'WC-OCV dosing & emergency 1-dose option',
        minimumAge: { en: '1 Year + 14 days', bn: '১ বছর + ১৪ দিন', calendar: { years: 1, days: 14 } },
        minimumIntervalDays: { days: 14, from: 'previous-dose', note: 'WHO 2017 Position Paper and Bangladesh Aug 2026 Euvichol-S campaign specify >=14 days between doses 1 and 2.' },
        route: 'Oral (1.5 mL vial)',
        conflicts: ['C-007'],
      }),
    ],
    doseCount: verifiedClaim(
      'dosing',
      2,
      [{ sourceId: 'who-pp-cholera-2017', section: 'WC-OCV dosing & emergency 1-dose option' }],
      'Standard 2-dose preventive schedule (14 days apart); single-dose option authorized in acute outbreak surges.',
      ['C-007'],
    ),
    programmeFacts: [
      verifiedProgrammeFact(
        'Bangladesh launched a 2-dose preventive cholera campaign (Euvichol-S, 14 days apart) in August 2026 targeting 5.175 million people across 14 high-risk areas.',
        'who-bd-cholera-campaign-2026',
        'Campaign summary',
      ),
    ],
    reviewStatus: 'evidence-verified',
    sourcePublished: '2026-08-20',
    conflicts: ['C-007'],
    reviewNote:
      'C-007 resolved: unifies campaign OCV and killed bivalent WC-OCV evidence under WHO Cholera Position Paper (2017) and WHO Bangladesh Aug 2026 campaign specifications.',
  }),
];

const recordById = new Map(vaccineRecords.map((record) => [record.id, record]));

export function getRecord(id: string): VaccineRecord | undefined {
  return recordById.get(id);
}

export function getRecordByLegacyId(legacyId: string): VaccineRecord | undefined {
  return vaccineRecords.find((record) => record.legacyIds.includes(legacyId));
}

export function publishedRecords(): VaccineRecord[] {
  return vaccineRecords.filter((record) => record.published);
}

/** Every claim in a record, flattened — used by the validator and the report. */
export function claimsOf(record: VaccineRecord): Claim<unknown>[] {
  const doseClaims = record.doses.flatMap((entry) => [
    entry.recommendedAge as Claim<unknown>,
    entry.minimumAge as Claim<unknown>,
    entry.minimumIntervalFromPrevious as Claim<unknown>,
    entry.maximumAge as Claim<unknown>,
    ...(entry.route ? [entry.route as Claim<unknown>] : []),
  ]);
  return [
    record.vaccineType as Claim<unknown>,
    record.targetPopulation as Claim<unknown>,
    record.doseCount as Claim<unknown>,
    record.efficacy as Claim<unknown>,
    record.diseaseBurden as Claim<unknown>,
    record.description as Claim<unknown>,
    ...doseClaims,
    ...(record.contraindications as Claim<unknown>[]),
    ...(record.precautions as Claim<unknown>[]),
    ...(record.commonAdverseEvents as Claim<unknown>[]),
    ...(record.seriousAdverseEvents as Claim<unknown>[]),
    ...(record.programmeFacts as Claim<unknown>[]),
  ];
}
