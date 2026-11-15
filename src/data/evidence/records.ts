/**
 * Structured vaccine records.
 *
 * These are the evidence-backed records that replace the flat 2.x catalogue
 * entries for the products at the centre of the Bangladeshi programme. Two
 * rules shape the file:
 *
 * 1. **Nothing is invented.** Descriptive text (what the vaccine protects
 *    against, adverse-event wording, efficacy strings) is transcribed from the
 *    existing catalogue by `transcribeLegacyClaims()` and marked
 *    `legacy-unverified`, so it is visibly a transcription rather than a
 *    sourced fact. Programme facts (which vaccine was introduced in which
 *    year) cite the WHO Bangladesh country page that was actually read, with
 *    verbatim quotes.
 * 2. **Unknown means null.** No minimum interval, minimum age or maximum age
 *    exists anywhere in this file, because as of 2026-10-31 no official
 *    Bangladeshi schedule document had been obtained (see the
 *    `no-official-schedule-document` registry entry). Every such field is
 *    `null` with `reviewStatus: 'requires-professional-review'`, and the
 *    validator fails any attempt to publish a value without evidence.
 */

import { allVaccines, schedule as legacySchedule } from '../vaccines';
import type {
  AgeSpec,
  CalendarAge,
  Claim,
  ClaimKind,
  DoseSpec,
  LocalizedText,
  ProgrammeClass,
  ProductStatus,
  VaccineRecord,
} from './types';
import { KNOWLEDGE_SCHEMA_VERSION } from './types';

/** Date of the provenance review that produced these records. */
export const REVIEW_DATE = '2026-10-31';
export const REVIEW_BY = 'TikaTrack evidence review — provenance and classification only, no clinical validation';

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

function verifiedProgrammeFact(value: string, sourceId: string, quote: string): Claim<string> {
  return {
    kind: 'programme-fact',
    value,
    evidence: [{ sourceId, quote }],
    reviewStatus: 'evidence-verified',
  };
}

function registeredProgrammeFact(value: string, sourceId: string): Claim<string> {
  return {
    kind: 'programme-fact',
    value,
    evidence: [{ sourceId }],
    reviewStatus: 'metadata-registered',
    note: 'Headline and date confirmed from the publisher index; document body not yet read.',
  };
}

function tx(en: string, bn: string): LocalizedText {
  return { en, bn };
}

function ageSpec(en: string, bn: string, calendar: CalendarAge): AgeSpec {
  return { label: tx(en, bn), calendar };
}

// ---------------------------------------------------------------------------
// Transcription from the 2.x catalogue
// ---------------------------------------------------------------------------

function findLegacy(id: string) {
  const found = allVaccines.find((vaccine) => vaccine.id === id);
  if (!found) throw new Error(`evidence/records: legacy vaccine id "${id}" no longer exists`);
  return found;
}

/**
 * Wrap the descriptive fields of a 2.x entry as claims. The text is unchanged;
 * only its trust level is now explicit.
 */
function transcribeLegacyClaims(legacyId: string) {
  const legacy = findLegacy(legacyId);
  const origin = `Transcribed verbatim from the TikaTrack 2.x catalogue entry \`${legacyId}\`; no document-level source is registered for it.`;
  return {
    names: legacy.name,
    fullNames: legacy.fullName,
    antigens: legacy.disease,
    // The 2.x dataset stores `ageGroup` as a single untranslated English token
    // ("infant", "adult", …). Copying it into the Bangla field would fabricate a
    // translation, so the target population is recorded as unknown instead.
    targetPopulation: needsReview<LocalizedText>(
      'general-description',
      null,
      `${origin} The legacy \`ageGroup\` field ("${legacy.ageGroup}") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.`,
    ),
    contraindications: [
      legacyClaim<LocalizedText>('contraindication', legacy.contraindications, origin),
      needsReview<LocalizedText>(
        'contraindication',
        null,
        'Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.',
      ),
    ],
    precautions: [
      needsReview<LocalizedText>(
        'precaution',
        null,
        'The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.',
      ),
    ],
    commonAdverseEvents: [legacyClaim<LocalizedText>('adverse-event', legacy.commonEffects, origin)],
    seriousAdverseEvents: [legacyClaim<LocalizedText>('adverse-event', legacy.seriousEffects, origin)],
    efficacy: legacyClaim(
      'efficacy',
      { value: legacy.efficacy },
      `${origin} No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.`,
    ),
    diseaseBurden: legacyClaim<LocalizedText>(
      'disease-burden',
      legacy.diseaseRisk,
      `${origin} Contains numeric claims that must be cited to a dated document or removed.`,
    ),
    description: legacyClaim<LocalizedText>('general-description', legacy.description, origin),
    vaccineType: needsReview<string>(
      'general-description',
      null,
      'Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.',
    ),
  };
}

// ---------------------------------------------------------------------------
// Dose construction
// ---------------------------------------------------------------------------

function dose(
  doseNumber: number,
  label: LocalizedText,
  calendar: CalendarAge,
  legacyMilestoneKey: string,
  conflicts: string[] = [],
): DoseSpec {
  return {
    doseNumber,
    recommendedAge: legacyClaim(
      'age',
      ageSpec(label.en, label.bn, calendar),
      `Transcribed from the TikaTrack 2.x milestone "${label.en}" (\`${legacyMilestoneKey}\`). No official schedule document is registered, so the age is unconfirmed.`,
      conflicts,
    ),
    minimumAge: needsReview(
      'age',
      null,
      'Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.',
      conflicts,
    ),
    minimumIntervalFromPrevious: needsReview(
      'interval',
      null,
      'No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.',
      conflicts,
    ),
    maximumAge: needsReview(
      'age',
      null,
      'Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.',
      conflicts,
    ),
    route: needsReview<string>('general-description', null, 'Route and presentation are not recorded in the 2.x dataset.'),
    legacyMilestoneKey,
  };
}

/** Keys of the milestones encoded in the 2.x schedule, for traceability. */
export const LEGACY_MILESTONE_KEYS = legacySchedule.map((item) => item.age.en);

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface RecordSpec {
  id: string;
  legacyId: string;
  antigenIds: string[];
  programme: ProgrammeClass;
  productStatus: ProductStatus;
  alsoUsedFor?: ProgrammeClass[];
  doses: DoseSpec[];
  doseCount: Claim<number>;
  programmeFacts: Claim<string>[];
  conflicts?: string[];
  reviewNote?: string;
}

function buildRecord(spec: RecordSpec): VaccineRecord {
  const transcribed = transcribeLegacyClaims(spec.legacyId);
  return {
    id: spec.id,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    revision: 1,
    names: transcribed.names,
    fullNames: transcribed.fullNames,
    antigens: transcribed.antigens,
    antigenIds: spec.antigenIds,
    vaccineType: transcribed.vaccineType,
    targetPopulation: transcribed.targetPopulation,
    programme: spec.programme,
    productStatus: spec.productStatus,
    alsoUsedFor: spec.alsoUsedFor,
    doses: spec.doses,
    doseCount: spec.doseCount,
    contraindications: [...transcribed.contraindications],
    precautions: [...transcribed.precautions],
    commonAdverseEvents: [...transcribed.commonAdverseEvents],
    seriousAdverseEvents: [...transcribed.seriousAdverseEvents],
    efficacy: transcribed.efficacy,
    diseaseBurden: transcribed.diseaseBurden,
    description: transcribed.description,
    programmeFacts: spec.programmeFacts,
    reviewNote: spec.reviewNote,
    dates: {
      effectiveFrom: null,
      supersededOn: null,
      lastReviewed: REVIEW_DATE,
      sourcePublished: null,
      reviewedBy: REVIEW_BY,
    },
    reviewStatus: 'requires-professional-review',
    published: true,
    conflicts: spec.conflicts ?? [],
    legacyIds: [spec.legacyId],
  };
}

const doseCountClaim = (legacyId: string, conflicts: string[] = []): Claim<number> =>
  legacyClaim(
    'dosing',
    findLegacy(legacyId).doses,
    `Dose count transcribed from the 2.x catalogue field \`doses\`. Must be confirmed against an official schedule document.`,
    conflicts,
  );

export const vaccineRecords: readonly VaccineRecord[] = [
  buildRecord({
    id: 'rec-bcg',
    legacyId: 'bcg',
    antigenIds: ['tuberculosis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [dose(1, tx('At Birth', 'জন্মের সময়'), { days: 0 }, 'At Birth')],
    doseCount: doseCountClaim('bcg'),
    programmeFacts: [],
    reviewNote: 'Catch-up beyond infancy is a common clinical question and is not addressed by any registered source.',
  }),
  buildRecord({
    id: 'rec-opv',
    legacyId: 'opv',
    antigenIds: ['poliomyelitis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [
      dose(1, tx('At Birth', 'জন্মের সময়'), { days: 0 }, 'At Birth'),
      dose(2, tx('6 Weeks', '৬ সপ্তাহ'), { weeks: 6 }, '6 Weeks'),
      dose(3, tx('10 Weeks', '১০ সপ্তাহ'), { weeks: 10 }, '10 Weeks'),
      dose(4, tx('14 Weeks', '১৪ সপ্তাহ'), { weeks: 14 }, '14 Weeks'),
    ],
    doseCount: doseCountClaim('opv'),
    programmeFacts: [
      verifiedProgrammeFact(
        'Bangladesh has remained polio-free; the last wild poliovirus case was detected in 2006.',
        'who-bd-immunization',
        'Last case of wild poliovirus was detected in 2006 and maintains polio free since then.',
      ),
    ],
  }),
  buildRecord({
    id: 'rec-pentavalent',
    legacyId: 'pentavalent',
    antigenIds: ['diphtheria', 'tetanus', 'pertussis', 'hepatitis-b', 'haemophilus-influenzae-b'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [
      dose(1, tx('6 Weeks', '৬ সপ্তাহ'), { weeks: 6 }, '6 Weeks'),
      dose(2, tx('10 Weeks', '১০ সপ্তাহ'), { weeks: 10 }, '10 Weeks'),
      dose(3, tx('14 Weeks', '১৪ সপ্তাহ'), { weeks: 14 }, '14 Weeks'),
    ],
    doseCount: doseCountClaim('pentavalent'),
    programmeFacts: [
      verifiedProgrammeFact(
        'Hepatitis B antigen was introduced into the Bangladesh EPI in 2003 and Hib in 2009; both are delivered through the pentavalent combination.',
        'who-bd-immunization',
        QUOTE_BD_INTRODUCTIONS,
      ),
    ],
  }),
  buildRecord({
    id: 'rec-pcv',
    legacyId: 'pcv',
    antigenIds: ['streptococcus-pneumoniae'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [
      dose(1, tx('6 Weeks', '৬ সপ্তাহ'), { weeks: 6 }, '6 Weeks', ['C-005']),
      dose(2, tx('10 Weeks', '১০ সপ্তাহ'), { weeks: 10 }, '10 Weeks', ['C-005']),
      dose(3, tx('14 Weeks', '১৪ সপ্তাহ'), { weeks: 14 }, '14 Weeks', ['C-005']),
    ],
    doseCount: doseCountClaim('pcv', ['C-005']),
    programmeFacts: [
      verifiedProgrammeFact('PCV was introduced into the Bangladesh EPI in 2015.', 'who-bd-immunization', QUOTE_BD_INTRODUCTIONS),
    ],
    conflicts: ['C-005'],
    reviewNote:
      'Whether the Bangladeshi PCV schedule includes a booster dose in the second year of life is unresolved; unofficial sources were located and rejected (C-005).',
  }),
  buildRecord({
    id: 'rec-fipv',
    legacyId: 'fipv',
    antigenIds: ['poliomyelitis'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [
      dose(1, tx('6 Weeks', '৬ সপ্তাহ'), { weeks: 6 }, '(absent from 2.x schedule)', ['C-001', 'C-005']),
      dose(2, tx('14 Weeks', '১৪ সপ্তাহ'), { weeks: 14 }, '(absent from 2.x schedule)', ['C-001', 'C-005']),
    ],
    doseCount: doseCountClaim('fipv', ['C-001']),
    programmeFacts: [
      verifiedProgrammeFact(
        'fIPV was introduced into the Bangladesh EPI in 2017.',
        'who-bd-immunization',
        QUOTE_BD_INTRODUCTIONS,
      ),
    ],
    conflicts: ['C-001', 'C-005'],
    reviewNote:
      'fIPV is confirmed as a national programme antigen by WHO Bangladesh but has no milestone in the 2.x schedule array, so the tracker, reminders and passport omit it entirely (C-001).',
  }),
  buildRecord({
    id: 'rec-mr',
    legacyId: 'mr',
    antigenIds: ['measles', 'rubella'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    // WHO Bangladesh documented an emergency measles-rubella supplementary
    // immunization activity in April 2026 and a camp campaign in May 2026, so
    // the same product is also delivered through SIAs.
    alsoUsedFor: ['bd-sia', 'bd-national-campaign'],
    doses: [
      dose(1, tx('9 Months', '৯ মাস'), { months: 9 }, '9 Months', ['C-002']),
      dose(2, tx('15 Months', '১৫ মাস'), { months: 15 }, '15 Months', ['C-002']),
    ],
    doseCount: doseCountClaim('mr', ['C-002']),
    programmeFacts: [
      verifiedProgrammeFact(
        'Rubella vaccine was introduced in 2012 and the second MR dose in 2015.',
        'who-bd-immunization',
        QUOTE_BD_INTRODUCTIONS,
      ),
      verifiedProgrammeFact(
        'Bangladesh achieved the rubella control goal in 2018.',
        'who-bd-immunization',
        'Bangladesh also achieved rubella control goal in 2018.',
      ),
      verifiedProgrammeFact(
        'A measles outbreak occurred in Bangladesh in 2026, highlighting persistent immunity gaps.',
        'who-bd-epi-review-2026',
        'However, the measles outbreak in 2026 has highlighted persistent immunity gaps and vulnerabilities within the immunization system.',
      ),
      registeredProgrammeFact(
        'An emergency measles-rubella supplementary immunization activity was launched in April 2026 to protect over 1.2 million children.',
        'who-bd-mr-sia-2026',
      ),
    ],
    conflicts: ['C-002'],
    reviewNote:
      'WHO measles position paper (April 2017) is registered as `who-pp-measles-2017` and is the correct evidence class for MR dosing, but it has not been read; no dosing claim here is marked evidence-verified.',
  }),
  buildRecord({
    id: 'rec-tcv',
    legacyId: 'tcv',
    antigenIds: ['salmonella-typhi'],
    programme: 'bd-nip-routine',
    productStatus: 'licensed-bd',
    doses: [dose(1, tx('15 Months', '১৫ মাস'), { months: 15 }, '15 Months', ['C-002', 'C-006'])],
    doseCount: doseCountClaim('tcv', ['C-006']),
    programmeFacts: [],
    conflicts: ['C-002', 'C-006'],
    reviewNote:
      'The 2.x dataset asserts `introduced: "2026"` citing the DGHS homepage. The WHO Bangladesh country page lists introductions only up to fIPV (2017). Both statements are recorded in C-006; neither is adopted.',
  }),
  buildRecord({
    id: 'rec-hpv',
    legacyId: 'hpv',
    antigenIds: ['human-papillomavirus'],
    programme: 'bd-national-campaign',
    productStatus: 'licensed-bd',
    doses: [
      dose(1, tx('Girls 10-14 years (campaign)', 'কিশোরী ১০-১৪ বছর (ক্যাম্পেইন)'), { years: 10 }, 'campaign', ['C-003']),
    ],
    doseCount: doseCountClaim('hpv', ['C-003']),
    programmeFacts: [
      registeredProgrammeFact('HPV vaccine rollout activity in Bangladesh in December 2024.', 'who-bd-hpv-rohingya-2024'),
    ],
    conflicts: ['C-003'],
    reviewNote:
      'Target cohort, dose count (1 vs 2) and campaign dates are unresolved: the Gavi article cited by the 2.x dataset has not been opened, and the WHO country page still describes HPV as a future introduction (C-003).',
  }),
  buildRecord({
    id: 'rec-rotavirus',
    legacyId: 'rotavirus',
    antigenIds: ['rotavirus'],
    programme: 'bd-planned-introduction',
    productStatus: 'not-yet-introduced-bd',
    doses: [
      dose(1, tx('Planned', 'পরিকল্পিত'), { weeks: 6 }, '(none)', ['C-003', 'C-005']),
      dose(2, tx('Planned', 'পরিকল্পিত'), { weeks: 10 }, '(none)', ['C-003', 'C-005']),
    ],
    doseCount: doseCountClaim('rotavirus', ['C-003']),
    programmeFacts: [
      verifiedProgrammeFact(
        'Rotavirus vaccine introduction was described as planned at the time the WHO Bangladesh country page was reviewed.',
        'who-bd-immunization',
        'The govern has plan to introduce rota and HPV vaccine in near future.',
      ),
    ],
    conflicts: ['C-003', 'C-005'],
    reviewNote:
      'The 2.x schedule text ("6, 10 weeks") has no source and the product is not confirmed as delivered. The record is published only so users can see that rotavirus vaccination is planned, not available; the UI must say so explicitly.',
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
