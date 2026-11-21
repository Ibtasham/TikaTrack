/**
 * Source registry — the single place where evidence is declared.
 *
 * Nothing in the knowledge base may cite a source that is not registered here,
 * and nothing clinical may cite a source whose `sufficiency` does not cover
 * clinical claims. `https://www.who.int`, `https://www.who.int/bangladesh`, and
 * `https://dghs.gov.bd` are registered deliberately as `rejected-insufficient`
 * so legacy entries citing homepages are caught by the validator instead of
 * silently looking cited.
 *
 * Provenance of this file (audit trail):
 *  - Tier 1 & Tier 2 entries marked `fetched-and-reviewed` were verified up to
 *    2026-11-21 with exact document-level URLs, publication dates, sections,
 *    and supported claims.
 *  - Entries marked `metadata-registered` had their title, publisher and date
 *    confirmed from the publisher's own index, without full-text extraction.
 *  - Entries marked `registered-unverified` are inherited URLs awaiting full-text
 *    verification.
 */

import type { SourceRecord } from './types';

const ACCESSED = '2026-11-21';

// ---------------------------------------------------------------------------
// Tier 1 — Bangladesh national / WHO Bangladesh / UNICEF / Gavi programme sources
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
      'Rotavirus vaccine introduction was described as planned in this country topic summary',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes:
      'Undated country topic page. Authoritative for historical Bangladesh EPI introduction years and elimination milestones. Superseded for HPV rollout status by Gavi (Dec 2024) and WHO Bangladesh HPV campaign reports (C-003).',
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
      'Material for C-005: the October 2026 independent EPI review draft report and domestic catch-up policy output remain pending verification.',
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
    notes: 'Headline and date confirmed from the WHO Bangladesh news index; full article body awaiting review.',
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
    section: 'Campaign summary',
    supportedClaims: [
      'Bangladesh launched a preventive oral cholera vaccination campaign across 14 high-risk areas targeting 5.175 million people aged 1 year and older',
      'The preventive campaign administers 2 doses of Euvichol-S 14 days apart (Round 1: 22 Aug – 21 Sep 2026; Round 2: 26 Sep – 25 Oct 2026)',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes: 'Resolves C-007 campaign vaccine identity (killed whole-cell OCV Euvichol-S, 2 doses, 14 days apart).',
  },
  {
    id: 'who-bd-hpv-rohingya-2024',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'Protecting Futures: GoB with support of WHO and Partners Roll Out HPV Vaccines in Rohingya Camps',
    url: 'https://www.who.int/bangladesh/news/detail/18-12-2024-protecting-futures-gob-with-support-of-who-and-partners-roll-out-hpv-vaccines-in-rohingya-camps',
    publicationDate: '2024-12-18',
    accessedDate: ACCESSED,
    section: 'Full article',
    supportedClaims: [
      'Government of Bangladesh rolled out HPV vaccination with WHO and partners in Rohingya camps in December 2024',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
  },
  {
    id: 'gavi-hpv-bangladesh',
    publisher: 'Gavi, the Vaccine Alliance',
    title: 'Bangladesh embraces HPV vaccination',
    url: 'https://www.gavi.org/vaccineswork/bangladesh-embraces-hpv-vaccination',
    publicationDate: '2024-12-10',
    accessedDate: ACCESSED,
    section: 'National rollout report',
    supportedClaims: [
      'Phase 1 HPV vaccination campaign launched in Dhaka Division in October 2023 reaching over 1.5 million girls',
      'Phase 2 expanded across the remaining seven divisions on 24 October 2024 targeting 6.2 million girls aged 10–14 years (Grades 5–9) with a single-dose schedule',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes: 'Confirms C-003 campaign timeline, cohort (girls 10–14y / Grades 5–9), and single-dose schedule.',
  },
  {
    id: 'unicef-bd-tcv-campaign-2025',
    publisher: 'UNICEF Bangladesh',
    title: 'Bangladesh launches nationwide typhoid conjugate vaccine campaign to protect 50 million children',
    url: 'https://www.unicef.org/bangladesh/en/press-releases/bangladesh-launches-nationwide-typhoid-conjugate-vaccine-campaign-protect-50-million',
    publicationDate: '2025-10-12',
    accessedDate: ACCESSED,
    section: 'Press release',
    supportedClaims: [
      'Bangladesh launched a nationwide TCV catch-up campaign in October 2025 protecting approximately 50 million children',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes: 'Confirms the October–November 2025 nationwide TCV campaign; does not itself constitute the August 2026 routine EPI schedule circular (see C-006).',
  },
  {
    id: 'who-bd-tcv-rohingya-2025',
    publisher: 'WHO Country Office for Bangladesh',
    title: 'Nationwide typhoid vaccination in Bangladesh protects nearly half a million Rohingya children',
    url: 'https://www.who.int/bangladesh/news/detail/02-12-2025-nationwide-typhoid-vaccination-in-bangladesh-protects-nearly-half-a-million-rohingya-children',
    publicationDate: '2025-12-02',
    accessedDate: ACCESSED,
    section: 'Overview',
    supportedClaims: [
      'Bangladesh integrated Rohingya refugee camp children into the late-2025 nationwide typhoid conjugate vaccine campaign',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-programme-facts',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
  },
  {
    id: 'bss-bd-tcv-routine-2026',
    publisher: 'Bangladesh Sangbad Sangstha (BSS)',
    title: 'Govt adds typhoid vaccine to routine EPI from Aug 1',
    url: 'https://www.bssnews.net/news/284347',
    publicationDate: '2026-07-14',
    accessedDate: ACCESSED,
    section: 'News report',
    supportedClaims: [
      'News agency report stating the Bangladesh government added TCV to the routine EPI schedule starting 1 August 2026 at 15 months of age',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'general-information-only',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes: 'Corroborating national news source for C-006; official primary DGHS circular remains unobtained, keeping C-006 unresolved.',
  },
  {
    id: 'dailystar-bd-tcv-routine-2026',
    publisher: 'The Daily Star',
    title: 'Bangladesh to add typhoid vaccine to routine immunisation from Aug 1',
    url: 'https://www.thedailystar.net/news/bangladesh/news/bangladesh-add-typhoid-vaccine-routine-immunisation-aug-1-4235286',
    publicationDate: '2026-07-14',
    accessedDate: ACCESSED,
    section: 'News report',
    supportedClaims: [
      'Daily Star report corroborating plans to include TCV in routine Bangladesh EPI from 1 August 2026',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'general-information-only',
    reviewStatus: 'reviewed',
    jurisdiction: 'bangladesh',
    notes: 'Secondary news corroboration for C-006; not authoritative for clinical claims without primary DGHS/EPI documentation.',
  },
];

// ---------------------------------------------------------------------------
// Tier 2 — WHO technical guidance & position papers (fetched and reviewed)
// ---------------------------------------------------------------------------

const whoGuidance: SourceRecord[] = [
  {
    id: 'who-pp-bcg-2018',
    publisher: 'World Health Organization',
    title: 'BCG vaccines: WHO position paper – February 2018',
    url: 'https://www.who.int/publications/i/item/WHO-WER-WER9308-73-96',
    version: 'Weekly Epidemiological Record, Vol. 93, No. 8, 73–96',
    publicationDate: '2018-02-23',
    accessedDate: ACCESSED,
    section: 'Recommendations & administration',
    supportedClaims: [
      'BCG is a live-attenuated vaccine administered intradermally at 0.05 mL for infants under 1 year of age',
      'WHO recommends a single dose of BCG at birth or as soon as possible thereafter in high TB-burden settings',
      'BCG is contraindicated in individuals with severe immunodeficiency or untreated symptomatic HIV infection without ART stability',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-polio-2022',
    publisher: 'World Health Organization',
    title: 'Polio vaccines: WHO position paper – June 2022',
    url: 'https://www.who.int/publications/i/item/who-wer9725-277-300',
    version: 'Weekly Epidemiological Record, Vol. 97, No. 25, 277–300',
    publicationDate: '2022-06-24',
    accessedDate: ACCESSED,
    section: 'Schedule, fIPV & bOPV dosing',
    supportedClaims: [
      'WHO endorses bOPV birth dose plus 3 primary bOPV doses (minimum 4 weeks apart starting from 6 weeks) alongside IPV',
      'WHO endorses a 2-dose fractional-dose IPV (0.1 mL intradermal) schedule administered at 6 and 14 weeks of age (minimum 8 weeks apart)',
      'OPV is contraindicated in severe primary immunodeficiency disorders; IPV/fIPV should be used instead',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-pcv-2019',
    publisher: 'World Health Organization',
    title: 'Pneumococcal conjugate vaccines in infants and children under 5 years of age: WHO position paper – February 2019',
    url: 'https://www.who.int/publications/i/item/WHO-WER-WER9408-85-104',
    version: 'Weekly Epidemiological Record, Vol. 94, No. 8, 85–104',
    publicationDate: '2019-02-22',
    accessedDate: ACCESSED,
    section: 'Schedules & minimum intervals',
    supportedClaims: [
      'WHO recommends a 3p+0 infant PCV schedule at 6, 10 and 14 weeks (or 2p+1), administered intramuscularly (0.5 mL)',
      'Minimum age for the first PCV dose is 6 weeks and minimum interval between infant primary doses is 4 weeks',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-measles-2017',
    publisher: 'World Health Organization',
    title: 'Measles vaccines: WHO position paper – April 2017',
    url: 'https://www.who.int/publications/i/item/who-wer9217-205-227',
    version: 'Weekly Epidemiological Record, Vol. 92, No. 17, 205–227',
    publicationDate: '2017-04-28',
    accessedDate: ACCESSED,
    section: 'Routine schedule (MCV1/MCV2)',
    supportedClaims: [
      'In countries with ongoing measles transmission, WHO recommends MCV1 at 9 months of age and MCV2 at 15–18 months of age',
      'Minimum interval between MCV1 and MCV2 is 4 weeks; live-attenuated measles vaccine is contraindicated in pregnancy and severe immunodeficiency',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-rubella-2020',
    publisher: 'World Health Organization',
    title: 'Rubella vaccines: WHO position paper – July 2020',
    url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/global-immunization-policy-and-guidance/who-vaccine-position-papers/rubella',
    version: 'Weekly Epidemiological Record, Vol. 95, No. 27, 306–324',
    publicationDate: '2020-07-03',
    accessedDate: ACCESSED,
    section: 'Co-administration & contraindications',
    supportedClaims: [
      'Live-attenuated rubella-containing vaccine (MR/MMR) is given at 9 or 12 months onwards alongside measles vaccine; contraindicated during pregnancy',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-diphtheria-2017',
    publisher: 'World Health Organization',
    title: 'Diphtheria vaccine: WHO position paper – August 2017',
    url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/global-immunization-policy-and-guidance/who-vaccine-position-papers/diphtheria',
    version: 'Weekly Epidemiological Record, Vol. 92, No. 31, 417–436',
    publicationDate: '2017-08-04',
    accessedDate: ACCESSED,
    section: 'Primary infant series',
    supportedClaims: [
      'WHO recommends a 3-dose DTP-containing primary series starting as early as 6 weeks of age with a minimum interval of 4 weeks between doses',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-tetanus-2017',
    publisher: 'World Health Organization',
    title: 'Tetanus vaccines: WHO position paper – February 2017',
    url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/global-immunization-policy-and-guidance/who-vaccine-position-papers/tetanus',
    version: 'Weekly Epidemiological Record, Vol. 92, No. 6, 53–76',
    publicationDate: '2017-02-10',
    accessedDate: ACCESSED,
    section: 'Primary & Td transition',
    supportedClaims: [
      'WHO recommends 3 primary infant doses of tetanus-toxoid-containing vaccine starting at 6 weeks (minimum 4 weeks apart) and Td for women/adult protection',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-pertussis-2015',
    publisher: 'World Health Organization',
    title: 'Pertussis vaccines: WHO position paper – August 2015',
    url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/global-immunization-policy-and-guidance/who-vaccine-position-papers/pertussis',
    version: 'Weekly Epidemiological Record, Vol. 90, No. 35, 433–460',
    publicationDate: '2015-08-28',
    accessedDate: ACCESSED,
    section: 'Infant primary series',
    supportedClaims: [
      'WHO recommends a 3-dose primary series starting at 6 weeks and completed by 6 months of age (minimum 4 weeks between doses)',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-hepb-2017',
    publisher: 'World Health Organization',
    title: 'Hepatitis B vaccines: WHO position paper – July 2017',
    url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/global-immunization-policy-and-guidance/who-vaccine-position-papers/hepatitis-b',
    version: 'Weekly Epidemiological Record, Vol. 92, No. 27, 369–392',
    publicationDate: '2017-07-07',
    accessedDate: ACCESSED,
    section: 'Infant schedules',
    supportedClaims: [
      'All infants should receive 3 doses of hepatitis B vaccine (or pentavalent combination) with a minimum 4-week interval between doses; a timely birth dose is additionally recommended globally',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-typhoid-2026',
    publisher: 'World Health Organization',
    title: 'WHO position paper on typhoid vaccines, August 2026',
    url: 'https://www.who.int/publications/i/item/who-position-paper-on-typhoid-vaccines--august-2026',
    version: 'Weekly Epidemiological Record, No. 32, 2026',
    publicationDate: '2026-08-18',
    accessedDate: ACCESSED,
    section: 'TCV schedule & safety',
    supportedClaims: [
      'WHO recommends a single intramuscular dose (0.5 mL) of Typhoid Conjugate Vaccine (TCV) from 6 months of age in endemic regions, often co-administered at routine 9 or 15 month visits',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-hpv-2022',
    publisher: 'World Health Organization',
    title: 'Human papillomavirus vaccines: WHO position paper, December 2022',
    url: 'https://www.who.int/publications/i/item/who-wer9750-645-672',
    version: 'Weekly Epidemiological Record, Vol. 97, No. 50, 645–672',
    publicationDate: '2022-12-16',
    accessedDate: ACCESSED,
    section: 'Off-label single-dose schedule recommendation',
    supportedClaims: [
      'WHO updated its recommendation to endorse an alternative single-dose HPV schedule for girls and women aged 9–20 years (primary target 9–14 years)',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-cholera-2017',
    publisher: 'World Health Organization',
    title: 'Cholera vaccines: WHO position paper – August 2017',
    url: 'https://www.who.int/publications/i/item/WER9234-477-500',
    version: 'Weekly Epidemiological Record, Vol. 92, No. 34, 477–500',
    publicationDate: '2017-08-25',
    accessedDate: ACCESSED,
    section: 'WC-OCV dosing & emergency 1-dose option',
    supportedClaims: [
      'Killed bivalent whole-cell OCV (WC-OCV) is administered orally as 2 doses at least 14 days apart for individuals aged ≥1 year in endemic and preventive settings, with a single-dose strategy available for acute outbreak surge control',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-pp-rotavirus-2021',
    publisher: 'World Health Organization',
    title: 'Rotavirus vaccines: WHO position paper – July 2021',
    url: 'https://www.who.int/publications/i/item/who-wer9628-301-319',
    version: 'Weekly Epidemiological Record, Vol. 96, No. 28, 301–319',
    publicationDate: '2021-07-16',
    accessedDate: ACCESSED,
    section: 'Schedule, contraindications & safety',
    supportedClaims: [
      'WHO recommends oral rotavirus vaccination starting at 6 weeks of age (2 or 3 doses depending on product, ≥4 weeks apart); contraindicated in SCID or prior intussusception',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-table-2-routine',
    publisher: 'World Health Organization',
    title: 'Table 2: Summary of WHO Position Papers - Recommendations for Routine Immunization',
    url: 'https://www.who.int/publications/m/item/table-2-summary-of-who-position-papers-recommendations-for-routine-immunization',
    publicationDate: null,
    accessedDate: ACCESSED,
    section: 'Summary tables',
    supportedClaims: [
      'Consolidated reference of WHO routine immunization ages, dose counts, and minimum intervals across all antigens',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
  {
    id: 'who-table-3-interrupted',
    publisher: 'World Health Organization',
    title: 'Table 3: Recommendations for Interrupted or Delayed Routine Immunization - Summary of WHO Position Papers',
    url: 'https://www.who.int/publications/m/item/table-3-recommendations-for-interrupted-or-delayed-routine-immunization-summary-of-who-position-papers',
    publicationDate: '2025-12-01',
    accessedDate: ACCESSED,
    section: 'Interrupted / catch-up table',
    supportedClaims: [
      'Global WHO minimum intervals and catch-up principles for interrupted routine series; national country programmes determine upper age limits',
    ],
    verification: 'fetched-and-reviewed',
    sufficiency: 'authoritative-for-clinical-claims',
    reviewStatus: 'reviewed',
    jurisdiction: 'global',
  },
];

// ---------------------------------------------------------------------------
// Tier 3 — WHO Fact Sheets & supporting disease-burden / reference entries
// ---------------------------------------------------------------------------

const VERIFIED_FACT_SHEETS: [id: string, title: string, slug: string, pubDate: string, claim: string][] = [
  [
    'who-fs-tuberculosis',
    'Tuberculosis',
    'tuberculosis',
    '2026-11-12',
    'TB caused approximately 1.13 million deaths globally in the latest WHO Tuberculosis Fact Sheet update.',
  ],
  [
    'who-fs-cervical-cancer',
    'Cervical cancer',
    'cervical-cancer',
    '2026-11-10',
    'Cervical cancer causes approximately 280,000 deaths among women annually globally and is prevented through HPV vaccination.',
  ],
  [
    'who-fs-hiv-aids',
    'HIV and AIDS',
    'hiv-aids',
    '2026-07-27',
    'No licensed preventive HIV vaccine currently exists; candidate vaccines remain in clinical research.',
  ],
  [
    'who-fs-measles',
    'Measles',
    'measles',
    '2026-07-15',
    'Measles remains a leading vaccine-preventable cause of childhood pneumonia and encephalitis globally.',
  ],
  [
    'who-fs-poliomyelitis',
    'Poliomyelitis',
    'poliomyelitis',
    '2025-04-02',
    'Poliovirus infection causes irreversible paralysis with no cure and is prevented by OPV and IPV.',
  ],
  [
    'who-fs-hepatitis-b',
    'Hepatitis B',
    'hepatitis-b',
    '2026-07-28',
    'Chronic hepatitis B infection can progress to cirrhosis and hepatocellular carcinoma.',
  ],
  [
    'who-fs-hepatitis-a',
    'Hepatitis A',
    'hepatitis-a',
    '2026-07-28',
    'Hepatitis A transmits through contaminated food/water and causes acute liver inflammation.',
  ],
  [
    'who-fs-tetanus',
    'Tetanus',
    'tetanus',
    '2026-07-15',
    'Maternal and neonatal tetanus elimination relies on TT/Td immunization and clean delivery practices.',
  ],
  [
    'who-fs-typhoid',
    'Typhoid',
    'typhoid',
    '2023-03-30',
    'Typhoid fever caused by Salmonella Typhi causes severe systemic illness in endemic regions.',
  ],
  [
    'who-fs-cholera',
    'Cholera',
    'cholera',
    '2026-09-29',
    'Cholera causes acute watery dehydration and is controlled with WASH and oral cholera vaccination.',
  ],
  [
    'who-fs-rabies',
    'Rabies',
    'rabies',
    '2026-09-17',
    'Rabies is almost 100% fatal once clinical symptoms develop but is preventable with timely post-exposure prophylaxis.',
  ],
  [
    'who-fs-dengue',
    'Dengue and severe dengue',
    'dengue-and-severe-dengue',
    '2025-08-21',
    'Dengue burden and severe vascular leakage risks justify targeted vector and vaccine interventions.',
  ],
  [
    'who-fs-meningococcal',
    'Meningitis',
    'meningitis',
    '2026-09-29',
    'Bacterial meningitis can be rapidly fatal within 24 hours without preventive vaccination and treatment.',
  ],
  [
    'who-fs-influenza',
    'Influenza (seasonal)',
    'influenza-(seasonal)',
    '2025-02-28',
    'Annual seasonal influenza vaccination is advised for pregnant women, older adults, and risk groups.',
  ],
  [
    'who-fs-yellow-fever',
    'Yellow fever',
    'yellow-fever',
    '2025-10-20',
    'Yellow fever vaccination provides lifelong protection for travelers to endemic African and South American zones.',
  ],
  [
    'who-fs-ebola',
    'Ebola disease',
    'ebola-disease',
    '2025-04-24',
    'Ebola vaccines are reserved for outbreak response and occupational frontline health workers.',
  ],
  [
    'who-fs-rsv',
    'Respiratory syncytial virus (RSV)',
    'respiratory-syncytial-virus-(rsv)',
    '2025-12-19',
    'RSV causes severe infant bronchiolitis and older-adult lower respiratory illness.',
  ],
  [
    'who-fs-plague',
    'Plague',
    'plague',
    '2026-09-29',
    'Yersinia pestis plague causes severe bubonic or pneumonic illness; historical vaccines are no longer widely deployed.',
  ],
  [
    'who-fs-mpox',
    'Mpox',
    'monkeypox',
    '2024-08-26',
    'MVA-BN vaccination is used in outbreak response and high-risk exposure groups.',
  ],
  [
    'who-fs-je',
    'Japanese encephalitis',
    'japanese-encephalitis',
    '2024-08-06',
    'Japanese encephalitis virus is a leading cause of viral encephalitis in Asia.',
  ],
  [
    'who-fs-immunization-coverage',
    'Immunization coverage',
    'immunization-coverage',
    '2026-07-15',
    'Global and national routine immunization coverage estimates and surveillance monitoring.',
  ],
];

const factSheets: SourceRecord[] = [
  ...VERIFIED_FACT_SHEETS.map(([id, title, slug, pubDate, claim]) => ({
    id,
    publisher: 'World Health Organization',
    title: `${title} — WHO fact sheet`,
    url: `https://www.who.int/news-room/fact-sheets/detail/${slug}`,
    publicationDate: pubDate,
    accessedDate: ACCESSED,
    section: 'Key facts',
    supportedClaims: [claim],
    verification: 'fetched-and-reviewed' as const,
    sufficiency: 'general-information-only' as const,
    reviewStatus: 'reviewed' as const,
    jurisdiction: 'global' as const,
    notes: 'Verified WHO Fact Sheet for disease burden and background context; not used for dosing claims.',
  })),
  {
    id: 'who-fs-malaria',
    publisher: 'World Health Organization',
    title: 'Malaria — WHO fact sheet',
    url: 'https://www.who.int/news-room/fact-sheets/detail/malaria',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'registered-unverified',
    sufficiency: 'general-information-only',
    reviewStatus: 'awaiting-professional-review',
    jurisdiction: 'global',
    notes: 'URL inherited from legacy catalogue; publication date not verified in full-text review.',
  },
];

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
    notes: 'Section landing page inherited from the 2.x dataset; not a primary dosing circular.',
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
    notes: 'Legacy JE entry cites the Gavi root domain. A document-level Bangladesh JE circular/Gavi report is required.',
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
      'Policy: a generic homepage is not evidence for a dosing schedule or any clinical statement. Legacy entries still citing this URL are flagged by the bridge and validator.',
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
      'Legacy entries for TCV and TT cite the DGHS homepage. A specific DGHS/EPI circular or national immunization manual (document-level URL) is required to close C-005 and C-006.',
  },
  {
    id: 'no-official-schedule-document',
    publisher: 'Government of Bangladesh / DGHS / EPI',
    title: 'Official national EPI schedule & catch-up circular — NOT YET OBTAINED',
    url: '',
    publicationDate: null,
    accessedDate: ACCESSED,
    supportedClaims: [],
    verification: 'rejected-insufficient',
    sufficiency: 'insufficient-for-clinical',
    reviewStatus: 'awaiting-professional-review',
    jurisdiction: 'bangladesh',
    notes:
      'Placeholder recording a known gap. While global clinical recommendations are verified from WHO Position Papers (2015–2026) and programme introductions from WHO Bangladesh / UNICEF / Gavi reports, the primary Bangladesh DGHS/EPI operational schedule circular and October 2026 independent EPI review report (C-005, C-006) remain unobtained.',
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
 *
 * Requires an authoritative clinical source that has actually been opened and
 * reviewed (`fetched-and-reviewed`). Metadata-registered indices are excluded.
 */
export function isSufficientForClinicalClaim(id: string): boolean {
  const source = byId.get(id);
  if (!source) return false;
  if (source.sufficiency !== 'authoritative-for-clinical-claims') return false;
  if (source.reviewStatus === 'rejected') return false;
  return source.verification === 'fetched-and-reviewed';
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

/** Can this source back disease burden or general vaccine description context? */
export function isSufficientForBackgroundClaim(id: string): boolean {
  const source = byId.get(id);
  if (!source) return false;
  if (source.reviewStatus === 'rejected') return false;
  if (source.sufficiency === 'insufficient-for-clinical') return false;
  return source.verification === 'fetched-and-reviewed';
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
 */
export function isDocumentLevelSourceUrl(url: string): boolean {
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) return false;
  return !INSUFFICIENT_URLS.has(trimmed);
}
