# TikaTrack evidence review

Generated 2026-10-31 · knowledge base 3.0.0-alpha.1 · schema 3.0.0

**350 findings — 0 blocking errors, 48 warnings, 302 accepted gaps.**

| Code | Count | Severity |
| --- | --- | --- |
| `UNSUPPORTED_STATEMENT` | 64 | gap |
| `EFFECTIVE_DATE_MISSING` | 9 | gap |
| `SOURCE_URL_NOT_DOCUMENT_LEVEL` | 4 | warning |
| `SOURCE_MISSING_PUBLICATION_DATE` | 30 | warning |
| `SOURCE_OUTDATED` | 1 | warning |
| `SOURCE_REGISTERED_BUT_UNUSED` | 30 | gap |
| `NIP_ANTIGEN_MISSING_FROM_SCHEDULE` | 1 | warning |
| `LEGACY_CATEGORY_MISLEADING` | 9 | warning |
| `CONFLICT_UNRESOLVED` | 8 | gap |
| `AWAITING_PROFESSIONAL_REVIEW` | 194 | gap |

## 1. Unsupported statements

Clinical values that exist in the product but have no document-level source. None of them is presented to users as verified; each is displayed with its review status.

- **rec-bcg.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-bcg.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-bcg.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "At Birth" (`At Birth`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-opv.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-opv.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "At Birth" (`At Birth`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose3.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose4.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-pentavalent.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-pentavalent.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.dose3.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-pcv.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-pcv.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.dose3.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-fipv.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-fipv.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-fipv.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`(absent from 2.x schedule)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-fipv.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`(absent from 2.x schedule)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-mr.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-mr.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-mr.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "9 Months" (`9 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-mr.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "15 Months" (`15 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-tcv.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-tcv.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-tcv.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "15 Months" (`15 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-hpv.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-hpv.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-hpv.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "Girls 10-14 years (campaign)" (`campaign`). No official schedule document is registered, so the age is unconfirmed.
- **rec-rotavirus.doseCount** — Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-rotavirus.efficacy** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-rotavirus.contraindications[0]** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.commonAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.seriousAdverseEvents** — Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.dose1.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "Planned" (`(none)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-rotavirus.dose2.recommendedAge** — Transcribed from the TikaTrack 2.x milestone "Planned" (`(none)`). No official schedule document is registered, so the age is unconfirmed.

## 2. Outdated information

- **rec-bcg** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-opv** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-pentavalent** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-pcv** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-fipv** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-mr** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-tcv** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-hpv** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **rec-rotavirus** — No effective date: no official schedule document is registered, so this record cannot state when its guidance took effect.
- **who-bd-immunization** — Publication date is unknown; the source cannot be assessed for currency.
- **who-pp-measles-2017** — Published 2017-04-28; older than 5 years — confirm it has not been superseded.
- **who-fs-measles** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-rubella** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-poliomyelitis** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-hepatitis-b** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-hepatitis-a** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-pneumococcal** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-typhoid** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-cholera** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-rabies** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-malaria** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-dengue** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-varicella** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-herpes-zoster** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-meningococcal** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-yellow-fever** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-rsv** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-anthrax** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-plague** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-mpox** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-tbe** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-cervical-cancer** — Publication date is unknown; the source cannot be assessed for currency.
- **who-fs-immunization-coverage** — Publication date is unknown; the source cannot be assessed for currency.
- **who-covid-19-emergencies** — Publication date is unknown; the source cannot be assessed for currency.
- **gavi-hpv-bangladesh** — Publication date is unknown; the source cannot be assessed for currency.
- **gavi-bangladesh-country** — Publication date is unknown; the source cannot be assessed for currency.
- **who-homepage** — Publication date is unknown; the source cannot be assessed for currency.
- **who-bangladesh-homepage** — Publication date is unknown; the source cannot be assessed for currency.
- **dghs-homepage** — Publication date is unknown; the source cannot be assessed for currency.
- **no-official-schedule-document** — Publication date is unknown; the source cannot be assessed for currency.

## 3. Conflicting sources

Recorded, never merged. Each entry stays unresolved until an authoritative document or a named reviewer decides it.

### C-001 — fIPV is a national programme antigen but has no milestone in the schedule

- The TikaTrack schedule array contains 6 antigens (BCG, OPV, pentavalent, PCV, MR, TCV) across 14 dose events. fIPV is absent.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`_
- fIPV was introduced into the Bangladesh EPI in 2017.  
  _origin: WHO Country Office for Bangladesh_
- The TikaTrack catalogue and FAQ text state fIPV is given at 6 and 14 weeks (2 doses), with no document-level source.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts entry `fipv`, src/data/tikabot.ts FAQ `schedule-basic`_

**Required action:** Obtain the official DGHS/EPI schedule document and confirm whether fIPV is delivered at 6 and 14 weeks in the routine programme. Do not add fIPV milestones to `schedule[]` until a document-level source is registered. Until then the tracker, reminders and passport under-report the national programme.

### C-002 — Month milestones are stored as day counts that do not match their labels

- The 9-month milestone is encoded as `ageDays: 270` and the 15-month milestone as `ageDays: 450`.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`_
- For a child born 2026-01-01 this produces due dates of 2026-09-28 and 2027-03-27, i.e. 3 and 5 days earlier than the calendar-month dates 2026-10-01 and 2027-04-01, and the generated explanations say "38 weeks"/"8 months" and "14 months".  
  _origin: Executed behaviour of src/lib/smartScheduler.ts (verified 2026-10-31)_

**Required action:** Confirm with the official schedule whether the programme specifies calendar months (9 and 15 months) or day offsets. The knowledge base now stores calendar ages; the scheduler still derives dates from `ageDays` and must be migrated in the age-arithmetic phase.

### C-003 — Rotavirus and HPV introduction status is described inconsistently across sources

- The WHO Bangladesh immunization page (undated revision) says the government has a plan to introduce rotavirus and HPV vaccines "in near future".  
  _origin: WHO Country Office for Bangladesh (verbatim, including the original typo)_
- WHO Bangladesh published an HPV rollout item for the Rohingya camps on 2024-12-18, and a further HPV item for Sylhet on 2024-12-01.  
  _origin: WHO Country Office for Bangladesh news index_
- The TikaTrack dataset states a nationwide HPV campaign launched October 2023 and expanded to all divisions by October 2024, citing a Gavi article that has not been opened.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts entry `hpv`_
- The TikaTrack dataset lists rotavirus with `introduced: "Planned"` and 2 doses, with no source.  
  _origin: TikaTrack 2.x dataset — src/data/additionalVaccines.ts entry `rotavirus`_

**Required action:** Read the Gavi article and obtain the DGHS HPV campaign circular to fix the campaign start date, target cohort and dose count; obtain an official statement on rotavirus introduction. The WHO country page text is stale for HPV and must not be used to describe current status.

### C-004 — Ten products are labelled "routine" in the dataset but are not in the national schedule

- Legacy `category: "routine"` is applied to fipv, mmr, hepatitisB, polio-ipv, dtp, hib, dtap, tdap, hexavalent and pentavalent-booster, none of which appear in `schedule[]`.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts and src/data/additionalVaccines.ts_
- Several of those entries carry non-Bangladeshi dose strings, e.g. DTP and DTaP "5 doses (2, 4, 6, 15-18 months, 4-6 years)", MMR "12-15 months, 4-6 years", IPV "4 doses (2, 4, 6-18 months, 4-6 years)".  
  _origin: TikaTrack 2.x dataset (schedule text observed verbatim)_
- Hepatitis B and Hib antigens are delivered in Bangladesh through the pentavalent combination introduced in 2009 (HepB component introduced 2003).  
  _origin: WHO Country Office for Bangladesh_

**Required action:** Reclassify each entry against the new taxonomy (bridge file now assigns `international-reference` or `private-market-bd` with `requires-professional-review`). A clinician must confirm whether standalone HepB, Hib or IPV products are used in Bangladesh outside the pentavalent combination, and whether any of these products are available in the private market.

### C-005 — Unofficial sources describe a 2026 national schedule that cannot be verified

- Social-media and commercial health-blog sources found during the review describe an "Updated Bangladesh EPI Schedule (2026)" with 9 vaccines against 12 diseases, including rotavirus, and a schedule table listing IPV at 6 and 14 weeks with an 8-week minimum interval and PCV/OPV with 4-week minimum intervals.  
  _origin: Non-authoritative web sources located 2026-10-31 — deliberately not registered as evidence_
- TikaTrack encodes 6 antigens and 14 dose events, and no minimum intervals at all.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts `schedule[]`_

**Required action:** These sources are excluded by policy (a Facebook post, a slide-sharing site and a commercial clinic blog are not authoritative for a national schedule). Obtain the DGHS/EPI schedule document or the output of the October 2026 independent EPI review (draft report expected November 2026) before changing any antigen list, dose count or interval.

### C-006 — TCV introduction year is asserted with a homepage citation

- The TikaTrack dataset records TCV with `introduced: "2026"` and 1 dose at 15 months, citing https://dghs.gov.bd.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts entry `tcv`_
- The WHO Bangladesh immunization page lists introductions up to fIPV in 2017 and does not mention TCV; TCV nonetheless appears in the app's encoded schedule at the 15-month milestone.  
  _origin: WHO Country Office for Bangladesh_

**Required action:** Register the DGHS/EPI TCV introduction circular (document-level URL, date) and confirm the age at delivery. A homepage URL is rejected as evidence for an introduction year.

### C-007 — Two cholera products overlap and neither has a sourced dosing statement

- The dataset holds both `cholera` (category campaign, 2 doses, `introduced: "Campaign"`) and `choleraWC` (category campaign, 2 doses, 14 days apart), with overlapping antigen coverage.  
  _origin: TikaTrack 2.x dataset — src/data/vaccines.ts and src/data/additionalVaccines.ts_
- WHO Bangladesh documented a preventive cholera vaccination campaign launched in August 2026.  
  _origin: WHO Country Office for Bangladesh news index_

**Required action:** Determine which product(s) were used in the 2026 campaign (WHO-prequalified oral cholera vaccines) and merge or clearly separate the two catalogue entries. Campaign dosing must come from the campaign circular, not from a fact sheet.

### C-008 — Three research-stage products are presented as vaccines

- The dataset includes `hiv`, `cancer-cervical` and `tb-new` with 0 doses, `introduced: "In development"`, efficacy "Under study", and the WHO homepage as their source URL. The assistant renders them with the sentence "…protects against…".  
  _origin: TikaTrack 2.x dataset — src/data/additionalVaccines.ts; executed behaviour of src/lib/ragEngine.ts_
- The dataset also states "Cervical cancer kills 300,000+ women annually" and "TB kills 1.5 million people annually" as `diseaseRisk` values with no document-level citation.  
  _origin: TikaTrack 2.x dataset — src/data/additionalVaccines.ts_

**Required action:** These entries are now classified `research-not-available` with `productStatus: in-development` and `published: false`, which removes them from the assistant corpus. A decision is still needed on whether they remain visible in the catalogue behind an explicit "no licensed vaccine exists" notice, or are removed entirely. The disease-burden statistics must either be cited to a dated WHO document or deleted.

## 4. Missing or insufficient references

- **who-pp-measles-2017** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-measles** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-rubella** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-poliomyelitis** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-hepatitis-b** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-hepatitis-a** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-pneumococcal** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-typhoid** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-cholera** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-rabies** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-malaria** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-dengue** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-varicella** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-herpes-zoster** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-meningococcal** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-yellow-fever** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-rsv** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-anthrax** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-plague** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-mpox** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-tbe** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-cervical-cancer** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-fs-immunization-coverage** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-covid-19-emergencies** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **gavi-hpv-bangladesh** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **gavi-bangladesh-country** [`SOURCE_URL_NOT_DOCUMENT_LEVEL`] — URL "https://www.gavi.org" is a homepage or portal, not a document.
- **gavi-bangladesh-country** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.
- **who-homepage** [`SOURCE_URL_NOT_DOCUMENT_LEVEL`] — URL "https://www.who.int" is a homepage or portal, not a document.
- **who-homepage** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered as insufficient evidence; present so that legacy citations of it are reported.
- **who-bangladesh-homepage** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered as insufficient evidence; present so that legacy citations of it are reported.
- **dghs-homepage** [`SOURCE_URL_NOT_DOCUMENT_LEVEL`] — URL "https://dghs.gov.bd" is a homepage or portal, not a document.
- **dghs-homepage** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered as insufficient evidence; present so that legacy citations of it are reported.
- **no-official-schedule-document** [`SOURCE_URL_NOT_DOCUMENT_LEVEL`] — No URL registered (placeholder recording a known gap).
- **no-official-schedule-document** [`SOURCE_REGISTERED_BUT_UNUSED`] — Registered but supports no claim yet — full-text review outstanding.

## 5. English / Bangla consistency

No inconsistencies found in the structured records. All localized claim values carry non-empty English and Bangla text, and every Bangla value contains Bengali script.

## 6. Awaiting professional review

202 items:

- **rec-bcg.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-bcg.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it. The legacy `ageGroup` field ("newborn") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-bcg.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-bcg.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-bcg.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-bcg.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-bcg.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-bcg.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `bcg`; no document-level source is registered for it.
- **rec-bcg.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "At Birth" (`At Birth`). No official schedule document is registered, so the age is unconfirmed.
- **rec-bcg.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-bcg.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-bcg.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-bcg.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-opv.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-opv.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-opv.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-opv.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-opv.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-opv.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-opv.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-opv.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `opv`; no document-level source is registered for it.
- **rec-opv.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "At Birth" (`At Birth`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-opv.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-opv.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-opv.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-opv.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-opv.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-opv.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-opv.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-opv.dose3.recommendedAge** — dose3.recommendedAge: Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose3.minimumAge** — dose3.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-opv.dose3.minimumInterval** — dose3.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-opv.dose3.maximumAge** — dose3.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-opv.dose3.route** — dose3.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-opv.dose4.recommendedAge** — dose4.recommendedAge: Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-opv.dose4.minimumAge** — dose4.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-opv.dose4.minimumInterval** — dose4.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-opv.dose4.maximumAge** — dose4.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-opv.dose4.route** — dose4.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pentavalent.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-pentavalent.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-pentavalent.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-pentavalent.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-pentavalent.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-pentavalent.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-pentavalent.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-pentavalent.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pentavalent`; no document-level source is registered for it.
- **rec-pentavalent.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pentavalent.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pentavalent.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pentavalent.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pentavalent.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pentavalent.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pentavalent.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pentavalent.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pentavalent.dose3.recommendedAge** — dose3.recommendedAge: Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pentavalent.dose3.minimumAge** — dose3.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pentavalent.dose3.minimumInterval** — dose3.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pentavalent.dose3.maximumAge** — dose3.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pentavalent.dose3.route** — dose3.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pcv.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-pcv.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-pcv.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-pcv.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-pcv.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-pcv.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-pcv.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-pcv.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `pcv`; no document-level source is registered for it.
- **rec-pcv.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`6 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pcv.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pcv.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pcv.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pcv.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "10 Weeks" (`10 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pcv.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pcv.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pcv.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-pcv.dose3.recommendedAge** — dose3.recommendedAge: Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`14 Weeks`). No official schedule document is registered, so the age is unconfirmed.
- **rec-pcv.dose3.minimumAge** — dose3.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-pcv.dose3.minimumInterval** — dose3.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-pcv.dose3.maximumAge** — dose3.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-pcv.dose3.route** — dose3.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-fipv.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-fipv.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-fipv.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-fipv.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-fipv.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-fipv.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-fipv.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-fipv.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `fipv`; no document-level source is registered for it.
- **rec-fipv.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "6 Weeks" (`(absent from 2.x schedule)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-fipv.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-fipv.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-fipv.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-fipv.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-fipv.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "14 Weeks" (`(absent from 2.x schedule)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-fipv.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-fipv.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-fipv.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-fipv.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-mr.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-mr.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-mr.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-mr.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-mr.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-mr.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-mr.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-mr.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `mr`; no document-level source is registered for it.
- **rec-mr.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "9 Months" (`9 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-mr.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-mr.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-mr.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-mr.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-mr.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "15 Months" (`15 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-mr.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-mr.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-mr.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-mr.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-tcv.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-tcv.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it. The legacy `ageGroup` field ("toddler") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-tcv.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-tcv.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-tcv.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-tcv.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-tcv.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-tcv.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `tcv`; no document-level source is registered for it.
- **rec-tcv.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "15 Months" (`15 Months`). No official schedule document is registered, so the age is unconfirmed.
- **rec-tcv.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-tcv.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-tcv.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-tcv.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-hpv.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-hpv.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it. The legacy `ageGroup` field ("adolescent") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-hpv.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-hpv.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-hpv.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-hpv.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-hpv.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-hpv.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `hpv`; no document-level source is registered for it.
- **rec-hpv.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "Girls 10-14 years (campaign)" (`campaign`). No official schedule document is registered, so the age is unconfirmed.
- **rec-hpv.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-hpv.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-hpv.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-hpv.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-rotavirus.vaccineType** — vaccineType: Vaccine type/platform (live-attenuated, inactivated, conjugate, toxoid, polysaccharide…) is not recorded in the 2.x dataset.
- **rec-rotavirus.targetPopulation** — targetPopulation: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it. The legacy `ageGroup` field ("infant") is an untranslated token, not a Bangla description; target population must be stated by an authoritative document.
- **rec-rotavirus.doseCount** — doseCount: Dose count transcribed from the 2.x catalogue field `doses`. Must be confirmed against an official schedule document.
- **rec-rotavirus.efficacy** — efficacy: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it. No population, endpoint, follow-up period or publication date is recorded, so the figure is not interpretable as published.
- **rec-rotavirus.diseaseBurden** — diseaseBurden: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it. Contains numeric claims that must be cited to a dated document or removed.
- **rec-rotavirus.description** — description: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.contraindications[0]** — contraindications[0]: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.contraindications[1]** — contraindications[1]: Full contraindication list requires an authoritative product/programme document; the 2.x text is a one-line summary.
- **rec-rotavirus.precautions** — precautions: The 2.x dataset has no precautions field at all. Precautions (e.g. deferral during acute febrile illness) must come from an authoritative document.
- **rec-rotavirus.commonAdverseEvents** — commonAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.seriousAdverseEvents** — seriousAdverseEvents: Transcribed verbatim from the TikaTrack 2.x catalogue entry `rotavirus`; no document-level source is registered for it.
- **rec-rotavirus.dose1.recommendedAge** — dose1.recommendedAge: Transcribed from the TikaTrack 2.x milestone "Planned" (`(none)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-rotavirus.dose1.minimumAge** — dose1.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-rotavirus.dose1.minimumInterval** — dose1.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-rotavirus.dose1.maximumAge** — dose1.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-rotavirus.dose1.route** — dose1.route: Route and presentation are not recorded in the 2.x dataset.
- **rec-rotavirus.dose2.recommendedAge** — dose2.recommendedAge: Transcribed from the TikaTrack 2.x milestone "Planned" (`(none)`). No official schedule document is registered, so the age is unconfirmed.
- **rec-rotavirus.dose2.minimumAge** — dose2.minimumAge: Earliest age at which this dose may be given is unknown without an authoritative document. It is not the same as the recommended age.
- **rec-rotavirus.dose2.minimumInterval** — dose2.minimumInterval: No minimum interval is registered for Bangladesh. The 2.x catch-up engine assumed 7 days for every antigen, which had no source and must not be reinstated.
- **rec-rotavirus.dose2.maximumAge** — dose2.maximumAge: Maximum age for this dose (where the programme defines one) is unknown without an authoritative document.
- **rec-rotavirus.dose2.route** — dose2.route: Route and presentation are not recorded in the 2.x dataset.
- **C-001** — fIPV is a national programme antigen but has no milestone in the schedule
- **C-002** — Month milestones are stored as day counts that do not match their labels
- **C-003** — Rotavirus and HPV introduction status is described inconsistently across sources
- **C-004** — Ten products are labelled "routine" in the dataset but are not in the national schedule
- **C-005** — Unofficial sources describe a 2026 national schedule that cannot be verified
- **C-006** — TCV introduction year is asserted with a homepage citation
- **C-007** — Two cholera products overlap and neither has a sourced dosing statement
- **C-008** — Three research-stage products are presented as vaccines

## 7. Source register

| Id | Publisher | Title | Published | Accessed | Sufficiency | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `who-bd-immunization` | WHO Country Office for Bangladesh | [Immunization in Bangladesh](https://www.who.int/bangladesh/health-topics/immunization) | — | 2026-10-31 | authoritative-for-programme-facts | fetched-and-reviewed |
| `who-bd-epi-review-2026` | WHO Country Office for Bangladesh | [With WHO and partner support, Bangladesh launches independent revie…](https://www.who.int/bangladesh/news/detail/04-10-2026-with-who-and-partner-support--bangladesh-launches-independent-review-to-strengthen-national-immunization-programme) | 2026-10-04 | 2026-10-31 | authoritative-for-programme-facts | fetched-and-reviewed |
| `who-bd-mr-sia-2026` | WHO Country Office for Bangladesh | [Bangladesh launches emergency measles-rubella campaign with UNICEF,…](https://www.who.int/bangladesh/news/detail/05-04-2026-bangladesh-launches-emergency-measles-rubella-campaign-with-unicef--who-and-gavi-to-protect-over-1.2-million-children) | 2026-04-05 | 2026-10-31 | authoritative-for-programme-facts | metadata-registered |
| `who-bd-mr-sia-rohingya-2026` | WHO Country Office for Bangladesh | [Mass vaccination campaign protects more than 166 000 children from …](https://www.who.int/bangladesh/news/detail/19-05-2026-mass-vaccination-campaign-protects-more-than-166-000-children-from-measles-in-rohingya-refugee-camps) | 2026-05-19 | 2026-10-31 | authoritative-for-programme-facts | metadata-registered |
| `who-bd-cholera-campaign-2026` | WHO Country Office for Bangladesh | ["Protect yourself. Protect your family. Protect your community": Ba…](https://www.who.int/bangladesh/news/detail/20-08-2026-protect-yourself.-protect-your-family.-protect-your-community---bangladesh-launches-preventive-cholera-vaccination-campaign) | 2026-08-20 | 2026-10-31 | authoritative-for-programme-facts | metadata-registered |
| `who-bd-hpv-rohingya-2024` | WHO Country Office for Bangladesh | [Protecting Futures: GoB with support of WHO and Partners Roll Out H…](https://www.who.int/bangladesh/news/detail/18-12-2024-protecting-futures-gob-with-support-of-who-and-partners-roll-out-hpv-vaccines-in-rohingya-camps) | 2024-12-18 | 2026-10-31 | authoritative-for-programme-facts | metadata-registered |
| `who-pp-measles-2017` | World Health Organization | [Measles vaccines: WHO position paper – April 2017](https://www.who.int/publications/i/item/who-wer9217-205-227) | 2017-04-28 | 2026-10-31 | authoritative-for-clinical-claims | metadata-registered |
| `who-fs-measles` | World Health Organization | [Measles — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/measles) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-rubella` | World Health Organization | [Rubella — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/rubella) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-poliomyelitis` | World Health Organization | [Poliomyelitis — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/poliomyelitis) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-hepatitis-b` | World Health Organization | [Hepatitis B — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/hepatitis-b) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-hepatitis-a` | World Health Organization | [Hepatitis A — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/hepatitis-a) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-pneumococcal` | World Health Organization | [Pneumococcal vaccines — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/pneumococcal-vaccines) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-typhoid` | World Health Organization | [Typhoid — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/typhoid) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-cholera` | World Health Organization | [Cholera — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/cholera) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-rabies` | World Health Organization | [Rabies — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/rabies) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-malaria` | World Health Organization | [Malaria — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/malaria) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-dengue` | World Health Organization | [Dengue and severe dengue — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-varicella` | World Health Organization | [Chickenpox (varicella) — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/chickenpox) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-herpes-zoster` | World Health Organization | [Herpes zoster — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/herpes-zoster) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-meningococcal` | World Health Organization | [Meningococcal meningitis — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/meningococcal-meningitis) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-yellow-fever` | World Health Organization | [Yellow fever — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/yellow-fever) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-rsv` | World Health Organization | [Respiratory syncytial virus (RSV) — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/respiratory-syncytial-virus) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-anthrax` | World Health Organization | [Anthrax — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/anthrax) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-plague` | World Health Organization | [Plague — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/plague) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-mpox` | World Health Organization | [Mpox (monkeypox) — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/monkeypox) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-tbe` | World Health Organization | [Tick-borne encephalitis — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/tick-borne-encephalitis) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-cervical-cancer` | World Health Organization | [Cervical cancer — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/cervical-cancer) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-fs-immunization-coverage` | World Health Organization | [Immunization coverage — WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/immunization-coverage) | — | 2026-10-31 | general-information-only | registered-unverified |
| `who-covid-19-emergencies` | World Health Organization | [Coronavirus disease (COVID-19) — WHO Health Emergencies](https://www.who.int/emergencies/diseases/novel-coronavirus-2019) | — | 2026-10-31 | general-information-only | registered-unverified |
| `gavi-hpv-bangladesh` | Gavi, the Vaccine Alliance | [Bangladesh embraces HPV vaccination](https://www.gavi.org/vaccineswork/bangladesh-embraces-hpv-vaccination) | — | 2026-10-31 | authoritative-for-programme-facts | registered-unverified |
| `gavi-bangladesh-country` | Gavi, the Vaccine Alliance | [Bangladesh — Gavi country information (page not located during review)](https://www.gavi.org) | — | 2026-10-31 | insufficient-for-clinical | registered-unverified |
| `who-homepage` | World Health Organization | [WHO home page](https://www.who.int) | — | 2026-10-31 | insufficient-for-clinical | rejected-insufficient |
| `who-bangladesh-homepage` | WHO Country Office for Bangladesh | [WHO Bangladesh home page](https://www.who.int/bangladesh) | — | 2026-10-31 | insufficient-for-clinical | rejected-insufficient |
| `dghs-homepage` | Directorate General of Health Services (DGHS), Bangladesh | [DGHS home page](https://dghs.gov.bd) | — | 2026-10-31 | insufficient-for-clinical | rejected-insufficient |
| `no-official-schedule-document` | Government of Bangladesh / DGHS / EPI | Official national EPI schedule document — NOT YET OBTAINED | — | 2026-10-31 | insufficient-for-clinical | rejected-insufficient |

