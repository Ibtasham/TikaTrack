/**
 * Source registry — the single place where evidence is declared.
 *
 * Nothing in the knowledge base may cite a source that is not registered here,
 * and nothing clinical may cite a source whose `sufficiency` does not cover
 * clinical claims. `https://www.who.int` is registered deliberately as
 * `rejected-insufficient` so that the 21 catalogue entries pointing at it are
 * caught by the validator instead of silently looking cited.
 *
 * Provenance of this file (audit trail):
 *  - entries marked `fetched-and-reviewed` were opened on 2026-10-31 and the
 *    `quote` fields are verbatim text from the page;
 *  - entries marked `metadata-registered` had their title, publisher and date
 *    confirmed from the publisher's own index on 2026-10-31, but the document
 *    body was not read, so they carry no quotes and support no claims yet;
 *  - entries marked `registered-unverified` are URLs inherited from the
 *    TikaTrack 2.x dataset. They are listed here so they can be audited, not
 *    because they have been checked.
 */

import type { SourceRecord } from './types';

const ACCESSED = '2026-10-31';

// ---------------------------------------------------------------------------
// Tier 1 — Bangladesh national / WHO country office (fetched and reviewed)
// ---------------------------------------------------------------------------

const whoBangladesh: SourceRecord[] = [
  {
    id: 'who-bd-immunization',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'Immunization in Bangladesh',
    url: 'https://www.who.int/bangladesh/health-topics/immunization',
    publicationDate: null,
    accessedDate: ACCESSED,
    section: 'Overview / timeline',
    supportedClaims: [
      'Hepatitis B vaccine was introduced into the Bangladesh EPI in 2003',
      'Hib vaccine was introduced in 2009',
      'Rubella vaccine was introduced in 2012',
      'PCV was introduced in 2015',
      'IPV was introduced in 2015',
      'The second MR dose was introduced in 2015',
      'fIPV was introduced in 2017',
      'The last wild poliovirus case was detected in 2006 and Bangladesh has maintained polio-free status since',
      'Maternal and neonatal tetanus was eliminated in 2008',
      'Bangladesh achieved the rubella control goal in 2018',
      'As of the reviewed revision of this page, rotavirus and HPV introduction were described as planned "in near future"',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes:
      'Undated country topic page. It states programme facts (introductions, elimination status) but contains no dose schedule, so it cannot support any dosing, age or interval claim. The sentence describing rotavirus and HPV as future introductions is stale with respect to HPV, which WHO Bangladesh news items document as being rolled out in 2024 — see conflict C-003.',
  },
  {
    id: 'who-bd-epi-review-2026',
    publisher: 'WHO Country Office for Bangladesh',
    title:
      'With WHO and partner support, Bangladesh launches independent review to strengthen national immunization programme',
    url: 'https://www.who.int/bangladesh/news/detail/04-10-2026-with-who-and-partner-support--bangladesh-launches-independent-review-to-strengthen-national-immunization-programme',
    publicationDate: '2026-10-04',
    accessedDate: ACCESSED,
    section: 'Full article',
    supportedClaims: [
      "Bangladesh's EPI was established in 1979",
      'Bangladesh has remained polio-free for more than 15 years',
      'Elimination of maternal and neonatal tetanus has been sustained',
      'Control of rubella has been achieved',
      'A measles outbreak occurred in Bangladesh in 2026, highlighting persistent immunity gaps',
      'An independent review of the national EPI and VPD surveillance ran from 4 to 14 October 2026, with a draft report and action plan expected in November 2026',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes:
      'Material for TikaTrack: the national programme was under formal review in October 2026 and a measles outbreak occurred in 2026. Any schedule published by this app must be re-checked against the review output (draft report expected November 2026) before it is presented as current.',
  },
  {
    id: 'who-bd-mr-sia-2026',
    publisher: 'WHO Country Office for Bangladesh',
    title:
      'Bangladesh launches emergency measles-rubella campaign with UNICEF, WHO and Gavi to protect over 1.2 million children',
    url: 'https://www.who.int/bangladesh/news/detail/05-04-2026-bangladesh-launches-emergency-measles-rubella-campaign-with-unicef--who-and-gavi-to-protect-over-1.2-million-children',
    publicationDate: '2026-04-05',
    accessedDate: ACCESSED,
    supportedClaims: [
      'Bangladesh conducted an emergency measles-rubella supplementary immunization activity in 2026 targeting over 1.2 million children',
    ],
    verification: 'metadata-registered',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'bangladesh',
    notes: 'Headline and date confirmed from the WHO Bangladesh news index; article body not yet read.',
  },
  {
    id: 'who-bd-mr-sia-rohingya-2026',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'Mass vaccination campaign protects more than 166 000 children from measles in Rohingya refugee camps',
    url: 'https://www.who.int/bangladesh/news/detail/19-05-2026-mass-vaccination-campaign-protects-more-than-166-000-children-from-measles-in-rohingya-refugee-camps',
    publicationDate: '2026-05-19',
    accessedDate: ACCESSED,
    supportedClaims: [
      'A measles mass vaccination campaign reached more than 166,000 children in the Rohingya refugee camps in May 2026',
    ],
    verification: 'metadata-registered',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'bangladesh',
  },
  {
    id: 'who-bd-cholera-campaign-2026',
    publisher: 'WHO Country Office for Bangladesh',
    title:
      '"Protect yourself. Protect your family. Protect your community": Bangladesh launches preventive cholera vaccination campaign',
    url: 'https://www.who.int/bangladesh/news/detail/20-08-2026-protect-yourself.-protect-your-family.-protect-your-community---bangladesh-launches-preventive-cholera-vaccination-campaign',
    publicationDate: '2026-08-20',
    accessedDate: ACCESSED,
    supportedClaims: ['Bangladesh launched a preventive cholera vaccination campaign in August 2026'],
    verification: 'metadata-registered',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'bangladesh',
  },
  {
    id: 'who-bd-hpv-rohingya-2024',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'Protecting Futures: GoB with support of WHO and Partners Roll Out HPV Vaccines in Rohingya Camps',
    url: 'https://www.who.int/bangladesh/news/detail/18-12-2024-protecting-futures-gob-with-support-of-who-and-partners-roll-out-hpv-vaccines-in-rohingya-camps',
    publicationDate: '2024-12-18',
    accessedDate: ACCESSED,
    supportedClaims: ['HPV vaccine rollout activity in Bangladesh in December 2024'],
    verification: 'metadata-registered',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'bangladesh',
  },
];

// ---------------------------------------------------------------------------
// Tier 2 — WHO technical guidance (registered; body not yet reviewed)
// ---------------------------------------------------------------------------

const whoGuidance: SourceRecord[] = [
  {
    id: 'who-pp-measles-2017',
    publisher: 'World Health Organization',
    title: 'Measles vaccines: WHO position paper – April 2017',
    url: 'https://www.who.int/publications/i/item/who-wer9217-205-227',
    version: 'Weekly Epidemiological Record, No 17, 2017, 92, 205–227',
    publicationDate: '2017-04-28',
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'metadata-registered',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'global',
    notes:
      'Registered as the correct evidence class for measles/rubella dosing claims. Deliberately supports no claims yet: the document has not been read, and quoting a recommendation from memory would be invention. Must be reviewed before MR-1/MR-2 ages or intervals are marked evidence-verified.',
  },
];

// ---------------------------------------------------------------------------
// Tier 3 — inherited from the TikaTrack 2.x dataset, not yet checked
// ---------------------------------------------------------------------------

/**
 * WHO fact sheets cited by the legacy catalogue. They are legitimate background
 * reading for disease and vaccine *descriptions*, and are typed here as
 * `general-information-only` so they can never be attached to a dosing or
 * contraindication claim. Publication dates are unknown because the documents
 * were not opened during this review — the validator reports that as a gap.
 */
const FACT_SHEETS: [id: string, title: string, slug: string][] = [
  ['who-fs-measles', 'Measles', 'measles'],
  ['who-fs-rubella', 'Rubella', 'rubella'],
  ['who-fs-poliomyelitis', 'Poliomyelitis', 'poliomyelitis'],
  ['who-fs-hepatitis-b', 'Hepatitis B', 'hepatitis-b'],
  ['who-fs-hepatitis-a', 'Hepatitis A', 'hepatitis-a'],
  ['who-fs-pneumococcal', 'Pneumococcal vaccines', 'pneumococcal-vaccines'],
  ['who-fs-typhoid', 'Typhoid', 'typhoid'],
  ['who-fs-cholera', 'Cholera', 'cholera'],
  ['who-fs-rabies', 'Rabies', 'rabies'],
  ['who-fs-malaria', 'Malaria', 'malaria'],
  ['who-fs-dengue', 'Dengue and severe dengue', 'dengue-and-severe-dengue'],
  ['who-fs-varicella', 'Chickenpox (varicella)', 'chickenpox'],
  ['who-fs-herpes-zoster', 'Herpes zoster', 'herpes-zoster'],
  ['who-fs-meningococcal', 'Meningococcal meningitis', 'meningococcal-meningitis'],
  ['who-fs-yellow-fever', 'Yellow fever', 'yellow-fever'],
  ['who-fs-rsv', 'Respiratory syncytial virus (RSV)', 'respiratory-syncytial-virus'],
  ['who-fs-anthrax', 'Anthrax', 'anthrax'],
  ['who-fs-plague', 'Plague', 'plague'],
  ['who-fs-mpox', 'Mpox (monkeypox)', 'monkeypox'],
  ['who-fs-tbe', 'Tick-borne encephalitis', 'tick-borne-encephalitis'],
  ['who-fs-cervical-cancer', 'Cervical cancer', 'cervical-cancer'],
  ['who-fs-immunization-coverage', 'Immunization coverage', 'immunization-coverage'],
];

const factSheets: SourceRecord[] = FACT_SHEETS.map(([id, title, slug]) => ({
  id,
  publisher: 'World Health Organization',
  title: `${title} — WHO fact sheet`,
  url: `https://www.who.int/news-room/fact-sheets/detail/${slug}`,
  publicationDate: null,
  accessedDate: ACCESSED,
  supportedClaims: [],
  verification: 'registered-unverified',
  sufficiency: 'general-information-only',
  reviewStatus: 'awaiting-professional-review',
  jurisdiction: 'global',
  notes: 'URL inherited from the TikaTrack 2.x catalogue. Not opened during this review; date unknown.',
}));

const legacyOther: SourceRecord[] = [
  {
    id: 'who-covid-19-emergencies',
    publisher: 'World Health Organization',
    title: 'Coronavirus disease (COVID-19) — WHO Health Emergencies',
    url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'registered-unverified',
    sufficiency: 'general-information-only',
    reviewStatus: 'awaiting-professional-review',
    jurisdiction: 'global',
    notes: 'Section landing page inherited from the 2.x dataset; not a document.',
  },
  {
    id: 'gavi-hpv-bangladesh',
    publisher: 'Gavi, the Vaccine Alliance',
    title: 'Bangladesh embraces HPV vaccination',
    url: 'https://www.gavi.org/vaccineswork/bangladesh-embraces-hpv-vaccination',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'registered-unverified',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'awaiting-full-text-review',
    jurisdiction: 'bangladesh',
    notes:
      'Cited by the 2.x dataset for the claim that a nationwide HPV campaign launched in October 2023 and expanded to all divisions by October 2024. Neither date has been verified — the article has not been opened. See conflict C-003.',
  },
  {
    id: 'gavi-bangladesh-country',
    publisher: 'Gavi, the Vaccine Alliance',
    title: 'Bangladesh — Gavi country information (page not located during review)',
    url: 'https://www.gavi.org',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'registered-unverified',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'awaiting-professional-review',
    jurisdiction: 'bangladesh',
    notes: 'The 2.x dataset cites the Gavi root domain. A document-level Gavi URL is required.',
  },
];

// ---------------------------------------------------------------------------
// Rejected as evidence
// ---------------------------------------------------------------------------

const rejected: SourceRecord[] = [
  {
    id: 'who-homepage',
    publisher: 'World Health Organization',
    title: 'WHO home page',
    url: 'https://www.who.int',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'rejected-insufficient',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'rejected',
    jurisdiction: 'global',
    notes:
      'Policy: a generic homepage is not evidence for a dosing schedule or any clinical statement. 21 of the 52 legacy catalogue entries cite this URL. The validator reports every such use.',
  },
  {
    id: 'who-bangladesh-homepage',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'WHO Bangladesh home page',
    url: 'https://www.who.int/bangladesh',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'rejected-insufficient',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'rejected',
    jurisdiction: 'bangladesh',
  },
  {
    id: 'dghs-homepage',
    publisher: 'Directorate General of Health Services (DGHS), Bangladesh',
    title: 'DGHS home page',
    url: 'https://dghs.gov.bd',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'rejected-insufficient',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'rejected',
    jurisdiction: 'bangladesh',
    notes:
      'The 2.x dataset cites the DGHS homepage for the TCV introduction year and for tetanus toxoid. A specific DGHS/EPI document (schedule, circular or guideline) must be registered instead. Attempts to reach the EPI sub-domain during this review failed, so no document-level DGHS source is registered yet.',
  },
  {
    id: 'no-official-schedule-document',
    publisher: 'Government of Bangladesh / DGHS / EPI',
    title: 'Official national EPI schedule document — NOT YET OBTAINED',
    url: '',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'rejected-insufficient',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'awaiting-professional-review',
    jurisdiction: 'bangladesh',
    notes:
      'Placeholder recording a known gap. As of 2026-10-31 no official Bangladeshi schedule document (DGHS/EPI circular, national immunization technical advisory group recommendation, or WHO country profile table) had been obtained and read. Every dose age, interval and maximum age in this knowledge base is therefore unconfirmed. This entry exists so the gap is visible in the data instead of being implied by an absence.',
  },
];

export const sourceRegistry: readonly SourceRecord[] = [
  ...whoBangladesh,
  ...whoGuidance,
  ...factSheets,
  ...legacyOther,
  ...rejected,
];

const byId = new Map(sourceRegistry.map((source) => [source.id, source]));

export function getSource(id: string): SourceRecord | undefined {
  return byId.get(id);
}

export function hasSource(id: string): boolean {
  return byId.has(id);
}

/**
 * Can this source back a clinical claim (dosing, age, interval,
 * contraindication, precaution, adverse event, efficacy)?
 */
export function isSufficientForClinicalClaim(id: string): boolean {
  const source = byId.get(id);
  if (!source) return false;
  if (source.sufficiency !== 'authoritative-for-clinical-claims') return false;
  if (source.reviewStatus === 'rejected') return false;
  return source.verification === 'fetched-and-reviewed' || source.verification === 'metadata-registered';
}

/** Can this source back a statement about the national programme? */
export function isSufficientForProgrammeFact(id: string): boolean {
  const source = byId.get(id);
  if (!source) return false;
  if (source.reviewStatus === 'rejected') return false;
  return (
    source.sufficiency === 'authoritative-for-clinical-claims' ||
    source.sufficiency === 'authoritative-for-programme-facts'
  );
}

export function sourcesBySufficiency(sufficiency: SourceRecord['sufficiency']): SourceRecord[] {
  return sourceRegistry.filter((source) => source.sufficiency === sufficiency);
}

export const SOURCE_REGISTRY_SIZE = sourceRegistry.length;

/** URLs registered as insufficient evidence (homepages, portals, placeholders). */
const INSUFFICIENT_URLS = new Set(
  sourceRegistry
    .filter((source) => source.sufficiency === 'insufficient-for-clinical')
    .map((source) => source.url.trim())
    .filter((url) => url.length > 0),
);

/**
 * Is this URL a document a reader could actually check?
 *
 * Used to stop the assistant from listing `https://www.who.int` as a source:
 * 21 legacy entries cite the WHO homepage, which supports no specific claim.
 */
export function isDocumentLevelSourceUrl(url: string): boolean {
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) return false;
  return !INSUFFICIENT_URLS.has(trimmed);
}
