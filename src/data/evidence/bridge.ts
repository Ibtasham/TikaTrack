/**
 * Legacy bridge — every TikaTrack 2.x catalogue id, classified.
 *
 * The 2.x dataset is not deleted or rewritten (PROMPT 0: non-destructive).
 * Instead each of its 52 entries is mapped onto the 3.0 taxonomy, given a
 * product status, a review state and the flags that explain what is wrong with
 * it. The validator and the evidence report read this file; the UI reads it to
 * decide what a user is allowed to see and how it must be labelled.
 *
 * Classification judgements recorded here are *interpretations of the existing
 * dataset*, not new clinical claims. Wherever the interpretation could change a
 * recommendation (dose timing, eligibility, availability), the entry carries
 * `requires-professional-review` and, if two statements disagree, a conflict id.
 */

import { allVaccines } from '../vaccines';
import type { BridgeFlag, LegacyBridgeEntry, ProductStatus, ProgrammeClass, ReviewStatus } from './types';

type Row = [
  legacyId: string,
  programme: ProgrammeClass,
  productStatus: ProductStatus,
  flags: BridgeFlag[],
  conflicts: string[],
];

/**
 * The nine ids that appear in the 2.x `schedule[]` array, plus fIPV, which the
 * WHO Bangladesh country page confirms as a programme antigen introduced in
 * 2017 (conflict C-001 records its absence from the schedule).
 */
const NIP_ANTIGENS = new Set(['bcg', 'opv', 'pentavalent', 'pcv', 'mr', 'tcv', 'fipv']);

/** Legacy ids marked `category: 'routine'` that are not national-programme antigens. */
const MISLABELLED_ROUTINE = ['mmr', 'hepatitisB', 'polio-ipv', 'dtp', 'hib', 'dtap', 'tdap', 'hexavalent', 'pentavalent-booster'];

const ROWS: Row[] = [
  // --- Bangladesh national routine EPI ------------------------------------
  ['bcg', 'bd-nip-routine', 'licensed-bd', [], []],
  ['opv', 'bd-nip-routine', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-001']],
  ['pentavalent', 'bd-nip-routine', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-004']],
  ['pcv', 'bd-nip-routine', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-005']],
  ['mr', 'bd-nip-routine', 'licensed-bd', [], ['C-002']],
  ['tcv', 'bd-nip-routine', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-002', 'C-006']],
  ['fipv', 'bd-nip-routine', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-001', 'C-004', 'C-005']],

  // --- National campaigns and supplementary activities ---------------------
  ['hpv', 'bd-national-campaign', 'licensed-bd', [], ['C-003']],
  ['covid19', 'bd-national-campaign', 'licensed-bd', ['awaiting-professional-review'], []],
  ['cholera', 'bd-national-campaign', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-007']],
  ['choleraWC', 'bd-national-campaign', 'licensed-bd', ['duplicate-antigen-coverage'], ['C-007']],

  // --- Announced but not yet delivered -------------------------------------
  ['rotavirus', 'bd-planned-introduction', 'not-yet-introduced-bd', [], ['C-003', 'C-005']],
  ['je', 'bd-planned-introduction', 'not-yet-introduced-bd', ['duplicate-antigen-coverage'], ['C-003']],

  // --- Special-risk / outbreak use -----------------------------------------
  ['tt', 'bd-special-risk', 'unknown', [], []],
  ['rabies', 'bd-special-risk', 'unknown', ['duplicate-antigen-coverage'], []],
  ['mpox', 'bd-special-risk', 'licensed-elsewhere-only', [], []],
  ['dengue', 'bd-special-risk', 'licensed-elsewhere-only', [], []],

  // --- Occupational --------------------------------------------------------
  ['anthrax', 'occupational', 'licensed-elsewhere-only', [], []],
  ['plague', 'occupational', 'discontinued', ['discontinued-product'], []],
  ['smallpox', 'occupational', 'discontinued', ['discontinued-product'], []],
  ['rabies-preexposure', 'occupational', 'unknown', ['duplicate-antigen-coverage'], []],

  // --- Travel --------------------------------------------------------------
  ['yellowFever', 'travel', 'licensed-elsewhere-only', [], []],
  ['tickBorne', 'travel', 'licensed-elsewhere-only', [], []],
  ['meningococcal-acwy', 'travel', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['typhoidVi', 'travel', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], ['C-006']],
  ['typhoid-oral', 'travel', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], ['C-006']],

  // --- Private market in Bangladesh ----------------------------------------
  ['influenza', 'private-market-bd', 'unknown', [], []],
  ['varicella', 'private-market-bd', 'unknown', [], []],
  ['hepatitisA', 'private-market-bd', 'unknown', [], []],
  ['hepatitis-b-adult', 'private-market-bd', 'unknown', ['duplicate-antigen-coverage'], ['C-004']],
  ['shingles', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['pneumococcal23', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['meningococcal', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['meningococcal-b', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['malaria', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['malaria-r21', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['rsv', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['rsv-pregnancy', 'private-market-bd', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], []],
  ['hexavalent', 'private-market-bd', 'unknown', ['legacy-category-misleading', 'duplicate-antigen-coverage'], ['C-004']],

  // --- International reference schedules (not Bangladeshi) -----------------
  ['mmr', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'schedule-text-not-bangladeshi', 'duplicate-antigen-coverage'], ['C-004']],
  ['mmrv', 'international-reference', 'licensed-elsewhere-only', ['schedule-text-not-bangladeshi', 'duplicate-antigen-coverage'], ['C-004']],
  ['dtp', 'international-reference', 'discontinued', ['legacy-category-misleading', 'schedule-text-not-bangladeshi', 'discontinued-product', 'duplicate-antigen-coverage'], ['C-004']],
  ['dtap', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'schedule-text-not-bangladeshi', 'duplicate-antigen-coverage'], ['C-004']],
  ['tdap', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'schedule-text-not-bangladeshi', 'duplicate-antigen-coverage'], ['C-004']],
  ['polio-ipv', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'schedule-text-not-bangladeshi', 'duplicate-antigen-coverage'], ['C-001', 'C-004']],
  ['hib', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'duplicate-antigen-coverage'], ['C-004']],
  ['hepatitisB', 'international-reference', 'licensed-elsewhere-only', ['legacy-category-misleading', 'duplicate-antigen-coverage'], ['C-004']],
  ['pentavalent-booster', 'international-reference', 'unknown', ['legacy-category-misleading', 'duplicate-antigen-coverage'], ['C-004']],
  ['japanese-encephalitis', 'international-reference', 'licensed-elsewhere-only', ['duplicate-antigen-coverage'], ['C-003']],

  // --- Research: no licensed product anywhere -------------------------------
  ['hiv', 'research-not-available', 'in-development', ['research-stage-product', 'product-not-licensed-in-bangladesh'], ['C-008']],
  ['tb-new', 'research-not-available', 'in-development', ['research-stage-product', 'product-not-licensed-in-bangladesh', 'duplicate-antigen-coverage'], ['C-008']],
  ['cancer-cervical', 'research-not-available', 'in-development', ['research-stage-product', 'product-not-licensed-in-bangladesh', 'duplicate-antigen-coverage'], ['C-008']],
];

/** URL values that cite a homepage rather than a document. */
const HOMEPAGE_URLS = new Set([
  'https://www.who.int',
  'https://www.who.int/bangladesh',
  'https://dghs.gov.bd',
  'https://www.gavi.org',
]);

/** `introduced` values that are not a year. */
function isYearValue(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

function derivedFlags(legacyId: string): BridgeFlag[] {
  const legacy = allVaccines.find((vaccine) => vaccine.id === legacyId);
  if (!legacy) return [];
  const flags: BridgeFlag[] = [];
  if (HOMEPAGE_URLS.has(legacy.sourceUrl)) flags.push('source-url-is-homepage');
  if (!isYearValue(legacy.introduced)) flags.push('introduced-value-is-not-a-date');
  if (/^[\d\s.%–-]+$/.test(legacy.efficacy.trim())) flags.push('efficacy-without-source');
  return flags;
}

/** No legacy entry is evidence-verified: no clinical source has been registered yet. */
const LEGACY_REVIEW_STATUS: ReviewStatus = 'requires-professional-review';

export const legacyBridge: readonly LegacyBridgeEntry[] = ROWS.map(
  ([legacyId, programme, productStatus, flags, conflicts]) => ({
    legacyId,
    recordId: undefined,
    programme,
    productStatus,
    reviewStatus: LEGACY_REVIEW_STATUS,
    flags: [...new Set([...flags, ...derivedFlags(legacyId)])],
    conflicts,
  }),
);

const bridgeByLegacyId = new Map(legacyBridge.map((entry) => [entry.legacyId, entry]));

export function bridgeFor(legacyId: string): LegacyBridgeEntry | undefined {
  return bridgeByLegacyId.get(legacyId);
}

export function programmeFor(legacyId: string): ProgrammeClass {
  return bridgeByLegacyId.get(legacyId)?.programme ?? 'international-reference';
}

/**
 * May this legacy entry be shown to users as an available vaccine and indexed
 * by the assistant? Research-stage and unlicensed products are excluded until a
 * decision is recorded in the conflict register (C-008).
 */
export function isPublishable(legacyId: string): boolean {
  const entry = bridgeByLegacyId.get(legacyId);
  if (!entry) return false;
  return entry.productStatus !== 'in-development' && entry.programme !== 'research-not-available';
}

/** Legacy ids that are national-programme antigens. */
export function nationalProgrammeIds(): string[] {
  return legacyBridge.filter((entry) => entry.programme === 'bd-nip-routine').map((entry) => entry.legacyId);
}

export function isNationalProgrammeAntigen(legacyId: string): boolean {
  return NIP_ANTIGENS.has(legacyId);
}

export const MISLABELLED_AS_ROUTINE = MISLABELLED_ROUTINE;
