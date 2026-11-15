# Knowledge base changelog

Every change to medical content, classification or source metadata is recorded
here. The application version in `package.json` and the knowledge base version in
`src/data/evidence/index.ts` (`KNOWLEDGE_BASE_VERSION`) move together **when the
knowledge base changes**; an application-only release leaves the knowledge base
version where it is, so a reader can tell revised medical content from revised
code. 3.0.0-alpha.2 is such a release.

Data changes are **non-destructive**: a migration may add fields and derived
projections, but none has ever dropped an administration date, a note, a centre,
a classification or a stored passport. The 3.x dose ledger migration is additive
— it writes `events` alongside the 2.x `records` map it was built from, and the
map is kept as a derived projection rather than deleted.

---

## 3.0.0-alpha.2 — 2026-11-02 (schema 3.0.0, knowledge base unchanged)

An application release: **no medical content, classification, conflict or source
metadata changed**, so `KNOWLEDGE_BASE_VERSION` stays at `3.0.0-alpha.1` and the
regenerated `docs/EVIDENCE-REVIEW.md` is unchanged. What changed is how the
knowledge base is _used_, which is recorded here because it constrains future
data edits.

- **The dose numbers in the structured records are now load-bearing.**
  `lib/doseLedger.ts` derives its milestone table (14 rows: BCG 1, OPV 1–4,
  Pentavalent 1–3, PCV 1–3, MR 1–2, TCV 1) from the 2.x milestone schedule, and
  `src/tests/doseLedger.test.ts` asserts that every row agrees with
  `evidenceForLegacy(vaccineId).record.doses[doseNumber].legacyMilestoneKey`.
  Re-numbering a dose in `records.ts` without re-numbering the schedule now fails
  the build instead of silently re-interpreting recorded doses.
- **Two open conflicts gate the record system, and neither was resolved by
  guessing.** C-001 (fIPV is absent from the 2.x milestone schedule) means fIPV
  doses are stored and displayed as "not in the national schedule" and are never
  counted toward a series. The absence of any registered minimum interval between
  doses means `generateCatchUpPlan` returns `recommendedNextDate: null`,
  `minimumInterval: null`, `intervalSource: 'none'` and
  `requiresMedicalAdvice: true`. The unsourced 7-day interval 2.x assumed for
  every antigen was **not** reinstated.
- **One new user-facing string pair** (`tracker.dose.review.dose-number-unknown`,
  English and Bangla) for a dose recorded without a number. It states a data gap;
  it makes no clinical claim. Key parity remains 1:1.
- **User-data schema.** The export envelope moves to version 3 and carries the
  dose ledger (`events`) next to the derived 2.x `records` map. A 2.x backup
  imports unchanged; a 3.x backup opened by a 2.x build still shows the most
  recent dose per vaccine. Migration never invents a dose number — an unnumbered
  legacy record is flagged `legacy-dose-number-unknown` until a person confirms
  it, and one legacy record never completes a series.

---

## 3.0.0-alpha.1 — 2026-10-31 (schema 3.0.0)

First release of the evidence layer. Built during the TikaTrack 3.0 audit
response; see `AUDIT-TikaTrack-2.2.0.md` (issues P0-05 to P0-08, P1-01, P1-03,
P1-06) and `docs/EVIDENCE-REVIEW.md` for the machine-generated findings.

### Added

- `src/data/evidence/types.ts` — schema 3.0.0: `VaccineRecord`, `Claim`,
  `DoseSpec`, `AgeSpec`, `IntervalSpec`, `SourceRecord`, `SourceSufficiency`,
  `ProgrammeClass`, `ProductStatus`, `ReviewStatus`, `ConflictEntry`,
  `LegacyBridgeEntry`.
- `src/data/evidence/sources.ts` — source registry: 35 sources with publisher,
  title, document-level URL, publication date, access date, section, supported
  claims, verification level and sufficiency class. Two WHO Bangladesh country
  documents were opened and quoted verbatim
  (`who-bd-immunization`, `who-bd-epi-review-2026`); four more are registered
  from the publisher's own index; the WHO measles position paper (April 2017) is
  registered as the correct evidence class for MR dosing but has **not** been
  read, so it supports no claim yet.
- `src/data/evidence/records.ts` — 9 structured records: `rec-bcg`, `rec-opv`,
  `rec-pentavalent`, `rec-pcv`, `rec-fipv`, `rec-mr`, `rec-tcv`, `rec-hpv`,
  `rec-rotavirus`.
- `src/data/evidence/conflicts.ts` — 8 unresolved conflicts (C-001 … C-008),
  each with the competing statements, their evidence and the action required to
  resolve it. Nothing was merged or decided.
- `src/data/evidence/bridge.ts` — all 52 legacy catalogue ids classified onto
  the new taxonomy with a product status, review status and explanatory flags.
  The 2.x dataset itself is untouched.
- `src/lib/evidenceValidator.ts` — 22 finding codes across errors, warnings and
  accepted gaps; `validateRecord()` is exported so tests can prove the validator
  fails on defective input.
- `scripts/evidence-report.ts` + `npm run evidence:report` → generates
  `docs/EVIDENCE-REVIEW.md` (7 sections: unsupported statements, outdated
  information, conflicting sources, missing references, English/Bangla
  consistency, items awaiting professional review, source register).
- Tests: `src/tests/evidence.test.ts` (35) and `src/tests/evidenceUi.test.tsx`
  (10). Suite total 636 → 681.
- i18n: 40 new keys in English and Bangla (`vaccines.evidence.*`,
  `vaccines.programme.*`, `vaccines.productStatus.*`, `vaccines.review.*`).
  Parity remains 1:1.
- CI: `Evidence report` step plus a `git diff --exit-code docs/EVIDENCE-REVIEW.md`
  check, so the committed report cannot drift from the data.

### Changed

- `src/pages/VaccineDetailPage.tsx` — new "Evidence and provenance" panel
  (classification, product status, review status, effective date, last reviewed,
  registered sources with publisher/publication/access dates, open conflicts and
  the action each requires). The header badge now shows the evidence-based
  programme classification instead of the legacy `category` label. Two banners
  were added: one for research-stage products ("no licensed vaccine exists") and
  one for any entry awaiting professional review ("do not use it to decide when
  a vaccine is due").
- `src/lib/ragEngine.ts` — the assistant corpus now excludes products that are
  not publishable (`hiv`, `tb-new`, `cancer-cervical`), so the bot can no longer
  answer "Where can I get an HIV vaccine?" with a card that opens "HIV Vaccine
  protects against HIV/AIDS". Retrieval priority follows
  `programme === 'bd-nip-routine'` instead of the legacy `category === 'routine'`
  (hexavalent, MMR, DTaP and Tdap are no longer boosted as routine). Homepage
  URLs are dropped from answer source lists.
- `README.md` — corrected four claims the audit found unsupported: the
  "official source URL for every vaccine" line, "catch-up planning with
  minimum-interval rules", "per-dose records", and "99 verified vaccination
  centres".

### Deliberately not changed

- **No dose age, minimum age, minimum interval, maximum age, contraindication or
  efficacy value was added, edited or resolved.** No authoritative Bangladeshi
  schedule document had been obtained at the time of writing, so all such values
  are `null` with `requires-professional-review`, or transcribed from the 2.x
  dataset and labelled as transcriptions.
- `src/data/vaccines.ts` `schedule[]` is untouched. fIPV was **not** added even
  though WHO Bangladesh confirms it as a programme antigen introduced in 2017,
  because its dose ages have no registered source (conflict C-001).
- The legacy `category` field remains on every entry so existing filters,
  comparisons and tests keep working; the bridge is the authoritative
  interpretation of it.
- User data, storage keys, export format and the passport payload are unchanged.

### Report snapshot at this release

`350 findings — 0 blocking errors, 48 warnings, 302 accepted gaps; 8 unresolved
conflicts; 202 items awaiting professional review.`

### Required before 3.0.0 final

1. Obtain and register the official DGHS/EPI schedule document (and the output of
   the October 2026 independent EPI review, draft expected November 2026).
2. Read the WHO measles/rubella position paper and attach dosing claims to it.
3. Resolve C-001 (fIPV), C-002 (calendar months vs day counts), C-003 (HPV and
   rotavirus status), C-004 (mislabelled "routine" entries), C-006 (TCV
   introduction), C-007 (cholera products) with document-level evidence.
4. Decide C-008: whether research-stage entries stay visible behind a notice or
   are removed from the catalogue.
