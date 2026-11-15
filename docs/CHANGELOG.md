# Changelog

All notable changes to TikaTrack are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/).

Every "Fixed" entry below was verified against the original source tree before it
was written — counts come from importing the data modules, and tool failures were
reproduced with the original `package.json`.

## [3.0.0-alpha.2] — 2026-11-02

The dose-level record system. This is the release the 3.0 audit said had to come
first: every scheduling, reminder, passport and analytics feature reads the same
data, and in 2.x that data could not represent "three doses of OPV, the second one
given on a date I got wrong". Fixing the record system was a precondition for
trusting anything built on it.

### Added

- **`lib/doseLedger.ts` — the record system.** A dose is a `VaccinationEvent`
  with a unique id, `profileId`, `vaccineId`, `scheduleVersion`, `seriesId`,
  `doseNumber`, `scheduledDoseId`, the administration `date`, `createdAt`,
  `centre`, optional `manufacturer` / `batch` / `notes`, `provenance`
  (`manual` / `import` / `legacy-migration` / `verified`), an optional correction
  trail (`updatedAt`, `supersedes`) and review flags (`needsReview`,
  `reviewReason`). A vaccine now supports any number of independently recorded
  doses. The module also owns the milestone table (14 doses, canonical 1-based
  numbering, `opv#2@42d`-style ids), the 2.x migration, per-dose attribution,
  ledger merging and the CRUD helpers every writer goes through.
- **`components/DoseRecorder.tsx`** — record any dose of any vaccine: the dose
  picker lists the schedule's own labels and marks the ones already given, warns
  before saving a second record for the same dose, offers the centres this family
  has used plus the national list, and treats **"not sure which dose" as a real
  answer** — stored as an unknown number and flagged for review, never silently
  turned into dose 1.
- **`components/DoseHistory.tsx`** — the complete history for a member, grouped by
  vaccine with an honest "n of m scheduled doses" count. Each dose can be
  corrected in place (date, dose number, centre, manufacturer, batch, notes) and
  deleted behind a `ConfirmDialog` that names the dose, the date and the member
  and says the other doses stay. Deleting a whole vaccine history is a separate,
  separately confirmed, louder action. Flagged records get an in-place
  "which dose was this?" control that clears the flag.
- **`lib/doseExport.ts`** — one CSV row per **administered dose** (16 columns:
  member, DOB, age, vaccine, dose number, schedule label, date given, centre,
  manufacturer, batch, notes, provenance, needs-review, recorded-at, record id).
  The 2.x export wrote one row per vaccine, so a three-dose series appeared once
  and the dose number was not in the file at all. An unknown dose number is
  exported empty; it is never filled in.
- **A review queue.** `profileStore.reviewQueue()` collects every dose across the
  family that a human should confirm, and `/tracker` shows it as a banner.
- **Tests: 33 files, 809 tests** (was 681). `doseLedger` (73) covers the schema,
  the migration, attribution, merging and every validation error;
  `doseRegression` (36) drives the six required end-to-end scenarios through
  `profileStore` and back out through the scheduler, the statistics and the
  exporters; `doseUi` (11) drives the real screens through `<App/>` — record,
  record again, correct, delete with and without confirming, delete a whole
  series, and confirm a migrated record.

### Changed

- **`types/index.ts`** — `VaccinationEvent`, `DoseAttribution`, `DoseProvenance`,
  `DoseReviewReason`, `Profile.events`, `DoseHistoryInput`. `Profile.records` is
  now documented as what it is: a **derived**, lossy, one-slot-per-vaccine
  projection kept so an older build opening a 3.x backup still shows something
  truthful.
- **`lib/profileStore.ts`** — write API for the ledger: `recordDoseEvent`,
  `updateDoseEvent`, `removeDoseEvent`, `removeDose(profiles, profileId,
vaccineId, eventId)`, `removeVaccineHistory`, `resolveDoseReview`; read API
  `doseHistory`, `allDoseEvents`, `doseCount`, `reviewQueue`. The export envelope
  is version 3 and carries `events` alongside the derived `records`.
- **`lib/smartScheduler.ts`** — every entry point takes a `DoseHistoryInput` (a
  profile, a ledger, or a bare 2.x map) and normalises it through the ledger, so
  no caller can pass the lossy projection by accident. `ScheduledDose` now
  reports `doseNumber`, `scheduledDoseId`, `attribution`, `recordId` and
  `needsReview`; catch-up plans report `missedDoses`, `missedDoseIds` and
  `missedDoseLabels`, and — because no minimum interval between doses is
  registered for Bangladesh — return `recommendedNextDate: null` with
  `requiresMedicalAdvice: true` instead of the unsourced 7-day rule 2.x assumed.
- **`lib/digitalPassport.ts`** — payload format v2 encodes **one entry per dose**
  (`vaccineId:doseNumber:date[:note]`, `?` when the number is unknown) and still
  verifies v1 passes. A full 14-dose national series does not fit the 287 bytes a
  printable QR holds, so issuance now trims progressively (notes first, then the
  oldest doses) and **discloses** what it dropped (`omittedDoses`, `notesDropped`,
  warnings on the certificate) rather than failing or silently lying. The JSON
  backup and the printed EPI card carry the full history.
- **`botContext`, `intelligentReminders`, `epiCard`, `ics`, `AnalyticsPage`,
  `SmartTracker`, `MemberActions`, `TrackerPage`** — all read the ledger. The
  assistant states how many doses are recorded and how many are provisional or
  awaiting review instead of implying a series is finished.
- **i18n** — one new key in English and Bangla
  (`tracker.dose.review.dose-number-unknown`), keeping 1:1 parity.

### Fixed

- **Recording OPV dose 1 no longer completes OPV 2 and 3** (and the same for
  Pentavalent). In 2.x the second write overwrote the first and any single record
  could satisfy a whole series.
- **Correcting one dose no longer changes another.** A correction rewrites exactly
  one event, keeps its id and `createdAt`, stamps `updatedAt`, and leaves its
  neighbours as the same objects.
- **Deleting one dose no longer deletes the vaccine's history.** `removeDose`
  requires an event id and is scoped by vaccine as well, so a stale id or a
  mismatched vaccine removes nothing at all; deleting a whole series is a separate
  function the UI confirms separately.
- **Multiple doses survive backup and restore**, and restoring the same file twice
  adds nothing.
- **Restoring an old backup no longer erases doses recorded since it was taken.**
  `mergeImport` merged against profiles that had never been normalised — i.e.
  against an empty ledger — and quietly dropped every locally recorded dose. It
  now gives the current profiles a ledger first and unions the events.
- **2.x profiles migrate without losing information**: every date, note and centre
  is carried across, no dose number is invented, ambiguous records are flagged for
  review, and one legacy record is never treated as completing a series.
- A dose recorded without a number was told "Dose number {0} is outside the
  schedule" with an empty `{0}`. It now has its own message: the number is
  unknown, please confirm it.
- `PassportPage` called `t('passport.saved')` without its argument, rendering a
  literal `{0}` in the toast.
- `DoseRecorder` / `DoseHistory` rebuilt `profile.events ?? []` on every render,
  invalidating their own memos; `MemberActions` carried a redundant dependency; a
  dead `reviewReasonText` export broke fast-refresh. `npm run lint` is now clean
  with **0 warnings** (was 4).

### Known limitations

- **fIPV is absent from the milestone schedule** the app ships (open conflict
  C-001), so fIPV doses are recorded and shown as "not in the national schedule"
  and are never counted toward a series. Adding them needs an authoritative
  document, not a guess.
- **No sourced minimum interval** between doses exists in the knowledge base, so
  the app deliberately recommends no catch-up date and says a health worker should
  plan the order and timing. This is a gap in the evidence, not in the code.
- **A legacy record's dose number cannot be recovered automatically.** 2.x never
  stored it; the migration flags the record and a human confirms it. Until then
  the dose is attributed provisionally to the earliest open slot and every view
  says so.
- **Provisional attribution is a heuristic**, always flagged, and can never mark
  more doses complete than the family recorded.
- The passport QR holds about 10–11 doses; a complete national series is trimmed
  with disclosure (see above).

## [3.0.0-alpha.1] — 2026-10-31

The evidence layer — the first half of the 3.0 response. Recorded in full in
`docs/DATA-CHANGELOG.md` (knowledge base) and `docs/EVIDENCE-REVIEW.md`
(machine-generated from the data by `npm run evidence:report`): 9 structured
vaccine records, 35 registered sources with publisher, publication date, access
date and sufficiency class, 8 open conflicts that were **recorded rather than
resolved**, and a bridge classifying all 52 legacy catalogue ids. Research-stage
products can no longer be served by the assistant, every published entry must
carry source metadata (enforced by tests), and the vaccine detail page shows
classification, review status, sources and open conflicts. Tests 636 → 681.

## [2.2.0] — 2026-10-31

Two things a first-time visitor and a future maintainer will both notice: the app
now introduces itself, and `npm install` no longer ends with a vulnerability
banner.

### Added

- **A first-run welcome tour** (`components/WelcomeDialog` + `lib/onboarding`).
  Three steps, in the order that matters — _where your data lives_, _what to do
  first_, _what still works with no signal_ — because asking someone for their
  child's date of birth before telling them where it goes would be backwards. It
  is mounted from `Layout`, so a visitor who arrives on a deep link is greeted
  too; focus-trapped and Escape-dismissible; its step counter is a `role="status"`
  region that reads "ধাপ ১ / ৩" in Bangla numerals when the UI is Bangla; and it
  carries exactly one call to action (_Add a member_ → `/tracker`) that navigates
  and closes the tour at the same time.
  It is **suppressed on a device that already holds records** — a "start by
  adding a member" tour is noise to someone who has just restored a backup or
  imported a JSON file — and it **returns after Privacy → erase everything**,
  because that user really is starting over. The `tikatrack.onboarding-dismissed`
  storage key was declared in 2.0.0 and never read by anything; it now has an
  owner and a test.
- **12 new strings × 2 languages → 716 keys across 23 namespaces.**
- **Tests: 28 files, 636 tests.** Two new suites: `onboarding` (9 — the decision
  table: first visit, already seen, has records, corrupt flag, storage blocked,
  step clamping, erase-everything) and `welcome` (8 — the dialog driven through
  the real `App`: home route, deep link, stepping forward and back, the CTA
  navigating, Escape, a second visit staying quiet, existing records staying
  quiet, and the whole thing in Bangla).
- **CI now verifies the generated PWA artefacts.** `dist/sw.js`,
  `dist/manifest.webmanifest` and `dist/404.html` must exist, must contain no
  unsubstituted `{{…}}` placeholder, and the precache list must really include
  `/index.html`. If the templating plugin ever stops emitting them the app still
  builds and still works online, so nothing else in the pipeline would notice
  that offline support had silently gone.

### Changed

- **`npm audit` is clean: 0 vulnerabilities, production _and_ development** (it
  was 2 critical + 16 moderate, all dev-only).
  - Vitest **3.2 → 4.1.12** removes the two critical `tinypool` advisories
    (prototype-pollution gadget → RCE via worker options). Dev-only, and only
    reachable by running untrusted test code — but a red banner on every
    `npm install` costs trust that a health app cannot spare.
  - ESLint **9 → 10.14** drops the `minimatch` 3.x line, and an override to
    `minimatch@^11.0.1` clears the remaining ReDoS advisory. v11 ships dual
    CJS/ESM entry points, so ESLint's `require()` still resolves — verified by
    linting a deliberately broken file and by confirming `dist/**` is still
    ignored.
- **`eslint-plugin-react-hooks` 5 → 7** switches on the React-Compiler rule set
  (`purity`, `immutability`, `refs`, `set-state-in-effect`, `gating`, …), which
  flagged 12 spots. This project is not compiled with React Compiler, and several
  of those are patterns that are deliberate here — a callback kept in a ref so an
  interval always sees the latest closure, for one. Rather than leave a permanent
  wall of ignored output, the config now sets the two rules that describe real
  bugs in _any_ React app (`rules-of-hooks` as an error, `exhaustive-deps` as a
  warning) explicitly instead of spreading the preset, with the reasoning written
  where the next maintainer will find it.
- **Coverage thresholds ratcheted from 85/78/80/85 to 90/82/90/90**
  (lines/branches/functions/statements). Vitest 4's v8 provider instruments more
  branches than v3 did, so the same code measures about five points lower; the
  ratchet keeps the gate as tight as it was instead of letting a toolchain
  upgrade quietly disarm it. Current: 92.8% lines, 91.6% statements, 92.5%
  functions, 84.2% branches.
- `tsconfig.app.json` declares `node` in `types`. Vitest 3 used to pull Node's
  types in through `vitest/globals`; Vitest 4 does not, and the test files
  legitimately use `process.env.TZ` (the timezone-pinned date tests) and
  `node:crypto` (the SHA-256 cross-checks).
- The emitted `dist/sw.js` no longer carries its template's
  `/* {{PRECACHE}} */` marker comment — a generated file should not still look
  like a template.

### Fixed

- `useServiceWorkerUpdate`'s "registers only once across re-renders" test was
  relying on Vitest clearing mock call history between tests, which v4 no longer
  guarantees. The suite now clears explicitly. The hook itself was never at
  fault — it guards registration with a ref.

## [2.1.0] — 2026-10-31

The 2.0.0 rewrite made the app correct and testable; this release makes it
_useful away from the screen it was written on_. Everything here is derived from
data the app already had — schedules, records, reminder settings — so no two
features can disagree about when a dose is due. The bundled data is unchanged.

### Added

- **A real offline mode.** `sw.template.js` is compiled by a `pwaAssets()` Vite
  plugin into `dist/sw.js` with a precache list built from the bundle itself and
  a cache name hashed from that list, so a new deploy busts the old cache and an
  identical rebuild does not. Navigations are network-first and fall back to the
  cached SPA shell on a network error _or_ an error response (a GitHub Pages deep
  link returns the `404.html` bounce page), which is what makes routes work
  offline on hosts without rewrite rules. Hashed assets are cache-first.
  Cross-origin requests — Supabase, if configured — are never intercepted, so the
  worker cannot mask a backend failure or serve stale cloud data. Registration is
  production-only: a worker under `npm run dev` would happily serve yesterday's
  modules. The manifest, by contrast, _is_ served in dev (middleware), so an
  install from a dev server still gets the right scope and icons.
- **`lib/serviceWorker.ts` + `AppStatus` + `InstallButton`.** Registration,
  update prompting, cache clearing, unregistration and a storage estimate,
  wrapped in three UI states that matter in the field: an explicit **offline**
  banner ("nothing is lost"), a one-off **offline ready** confirmation so the
  promise is visibly true, and **update available** — which reloads on the user's
  terms instead of yanking the page mid-entry. `InstallButton` renders only while
  the browser is actually offering `beforeinstallprompt`; on iOS Safari and
  Firefox a control that cannot work is worse than no control.
- **Calendar export — `lib/ics.ts`.** RFC 5545 all-day `VEVENT`s with 75-octet
  line folding, stable `UID`s (re-importing updates instead of duplicating) and
  `VALARM`s derived from the user's own reminder settings via
  `reminderAlarmOffsets()`, so the phone and the calendar ring at the same
  moments. Wired to three places: one member's remaining doses, the whole family
  (`/tracker`), and the reminders list (`/reminders`, deduplicated by
  member + vaccine + due date — the list holds a row per reminder, not per dose).
- **Sharing — `lib/share.ts`.** Web Share API with file support, clipboard
  fallback, and an honest outcome (`shared` / `cancelled` / `copied` /
  `unavailable`) mapped to a bilingual message, because "copied — paste it into
  WhatsApp" and "this browser cannot share" are different facts. Includes a
  ready-made record summary (age, next dose, overdue list, generated-from line)
  and `safeFilename()` for names that travel into downloads and URLs.
- **QR scanning — `lib/qrScanner.ts` + `<QrScanner>`.** Verify a passport by
  pointing a phone at it, or by uploading a photo (which is the path that works
  for a printed card, a screenshot in a chat thread, or someone else's phone).
  `jsQR` is dynamically imported so the decoder never lands in the main bundle.
  Permission denied, no camera, insecure origin and decode failure each get their
  own message rather than one generic "scan failed".
- **Print record card — `lib/epiCard.ts`.** A one-page card for the EPI session:
  member, date of birth, completed vs remaining doses, and the national hotline
  (16263), rendered as sanitised inline SVG into a print window. The passport QR
  rides along when one has been issued, so the paper card is verifiable by phone.
- **TikaBot now reads your record — `lib/botContext.ts`.** Pick a family member
  and answers to timing questions gain a block with that member's age, doses
  completed, what is overdue and what is next — computed from the saved data, in
  Bangla numerals when the UI is Bangla. It is appended only for schedule-shaped
  questions or when retrieval found nothing, it is rendered in its own labelled
  panel, and the source list is untouched: a _quoted_ fact and a _calculated_
  fact must never look like the same kind of thing.
- **Text size control.** Normal / large / x-large, applied as `data-text-size` on
  `<html>` (so every `rem`-based Tailwind utility scales) and set before first
  paint by the inline boot script in `index.html`, which means no flash of small
  text on reload. `TextSizeButton` cycles through the three and reports the new
  size to assistive tech.
- **Accessibility groundwork.** A new `useFocusTrap` hook (with `onEscape`,
  `onOutsideClick` and `autoFocus` options) is now the single mechanism behind
  `ConfirmDialog`, `VaccineModal` and both `Header` popovers, replacing the
  Tab-cycling logic that each of them inlined. Dialogs expose `role="dialog"` /
  `alertdialog` plus `aria-modal`, `aria-labelledby` and `aria-describedby`, and
  focus returns to the trigger on close.
- **Tests: 26 files, 619 tests** (2.0.0 shipped 17 files, 354). Nine new
  suites: `ics` (47), `share` (29), `epiCard` (19), `qrScanner` (36),
  `botContext` (36), `serviceWorker` (31), `hooks` (36) and `swRuntime` (18) —
  the last one imports `sw.template.js?raw` — the exact source the build plugin
  rewrites — and drives its `install`, `activate`, `message` and `fetch` handlers
  in jsdom against a fake `Cache`, so the offline path is tested rather than
  assumed. The smoke test also gained a **second pass over a populated device** —
  a member, a recorded dose, derived reminders and an issued passport — because
  that is the only state in which the calendar, share, print, scan and
  record-aware features render at all. It immediately paid for itself: `/analytics`
  threw under the ErrorBoundary as soon as there was data to chart (jsdom has no
  `ResizeObserver`, which recharts requires); the shim now lives in
  `src/test/setup.ts`.
- **65 new strings × 2 languages → 704 keys across 22 namespaces.** No English
  placeholder ships in the Bangla UI: the parity test fails the build if it does.

### Changed

- `jsqr` moved from `devDependencies` to `dependencies` — the scanner needs it at
  runtime. It was already a dev dependency for the QR round-trip tests.
- `public/manifest.json` became `manifest.template.json`. The generated
  `dist/manifest.webmanifest` carries the deploy base in `id`, `start_url`,
  `scope` and every icon path, plus four home-screen shortcuts (vaccines,
  tracker, centres, TikaBot). One source of truth, correct on a project site.
- Per-member actions live in one component (`MemberActions`) instead of being
  re-implemented per call site; `SmartTracker` hosts it under the stats, and
  `TrackerPage` adds the family-wide calendar export next to Print.
- `ChatMessage` gained an optional `personalised` field, persisted with the
  transcript so a reloaded conversation keeps its context blocks.
- `PrivacyPage` gained an **Offline copy of the app** section: how much browser
  storage is in use, and a button that deletes the caches and unregisters the
  worker — so "delete my data" now covers the service worker too, not just
  `localStorage`.
- `PassportPage`'s verify box accepts a scanned payload directly (verified
  immediately, and left visible in the box so what was checked can be copied).

### Fixed

- **Sub-path installs were broken.** The 2.0.0 manifest hard-coded `/` in
  `start_url`, `scope` and the icon paths, so "Add to home screen" on
  `https://user.github.io/tikatrack/` installed an app scoped to the domain root
  with missing icons. It is now templated with `VITE_BASE`.
- **The offline promise was not kept.** 2.0.0 shipped a manifest and icons but no
  service worker, so a reload without network showed the host's error page. The
  app shell is now precached and served offline.

### Security & privacy

- **No new network surface.** The service worker handles same-origin `GET`s only
  and never intercepts Supabase; the QR decoder runs in the page (`jsQR` over
  pixels from `getUserMedia` or a chosen file), so no camera frame is uploaded
  anywhere; and every export (`.ics`, PNG, CSV, JSON, share text) is generated on
  the device.
- **TikaBot's personalisation stays local and stays labelled.** The block is
  computed from `localStorage` records, appended to the answer rather than fed
  into retrieval, and rendered under its own heading with the line "calculated
  from your saved data — not from the sources listed below". A quoted, sourced
  fact and a derived one must never be interchangeable.
- **"Delete my data" now covers the service worker too** — the Privacy page
  reports browser storage in use and can clear the caches and unregister the
  worker, not just `localStorage`.
- **The install button only appears when installing can work**, so no user is
  invited to tap a control that does nothing on their browser.

## [2.0.0] — 2026-10-31

A ground-up rewrite of the same product. The **data is unchanged** (52 vaccines,
99 verified centres, 56 districts, 8 divisions, 6 schedule milestones, 7 TikaBot
FAQ entries — all carried over verbatim); the engineering around it is not.

### Added

- **Routing.** 15 routes under a shared `Layout` (`react-router-dom` v7), a
  `NotFoundPage` catch-all, per-route `<title>`/meta, and a build-time-generated
  `dist/404.html` (with `VITE_BASE` baked in) so deep links work on GitHub Pages. The original had `react-router-dom` installed
  with **zero imports** — navigation was `useState` inside `App.tsx`, so there were
  no URLs, no back button, and a refresh always returned you to the home tab.
- **A real i18n subsystem** (`src/i18n/`): 22 namespaces, **639 keys × 2 languages**,
  positional `{0}` arguments, English fallback, dev-time missing-key warnings,
  storage persistence and browser-language detection. See
  [LOCALISATION.md](LOCALISATION.md).
- **Test suite: 17 files, 354 tests.** QR encoder, portable SHA-256, digital
  passport, RAG engine, profile store, smart scheduler, reminder engine, local
  accounts, id generation, storage (including legacy migration and
  storage-unavailable degradation), exporters (CSV/JSON/print/clipboard), the
  Supabase auth adapter (scripted through a fake client), SPA-redirect resolution,
  date/number formatting, i18n parity — and a smoke test that renders **every
  route in both languages** and fails if an error boundary trips. Scheduling and
  reminder tests are re-run with the timezone pinned to UTC, Asia/Dhaka,
  America/New_York and Pacific/Kiritimati; CI additionally re-runs the whole suite
  under `TZ=Asia/Dhaka`, since a UTC-only assumption is invisible to a UTC runner. The original shipped one test file that could not run (see Fixed).
- **Quality gates:** ESLint 9 (flat config, `typescript-eslint`, react-hooks,
  react-refresh, `consistent-type-imports`), Prettier, `npm run validate`
  (typecheck → lint → format:check → test:coverage → build), and GitHub Actions CI
  on a Node 20 + 22 matrix (`.github/workflows/ci.yml`), which also publishes the
  build and the coverage report as artefacts.
- **Coverage is enforced, not reported.** `vitest.config.ts` thresholds are
  85% lines / 85% statements / 80% functions / 78% branches over `lib/`, `data/`,
  `hooks/` and `i18n/`; the suite currently reaches ~96% / 93% / 86%. `npm run
validate` and CI both run `test:coverage`, so new untested code fails the gate.
- **`lib/sha256.ts`:** a dependency-free SHA-256 (FIPS 180-4) used whenever
  SubtleCrypto is unavailable, verified against Node's implementation for the
  published vectors, every block-boundary length and randomised multi-byte input.
- **Offline QR + digital passport.** A hand-written byte-mode QR encoder
  (versions 1–12, ECC level M, best-of-8 mask selection, ISO-correct format and
  version information) and device-bound HMAC signing, verified by jsQR round-trip
  tests. No network, no server RPC.
- **Error handling:** a React `ErrorBoundary` around the app, a typed
  `ConfirmDialog` for destructive actions, and a `ToastProvider` replacing
  `window.confirm()` (3 call sites in the original).
- **Localisation-aware formatting** (`src/lib/format.ts`): Bangla numerals, Bangla
  month names, age and relative-day strings, and `parseISODate` that builds _local_
  dates so `YYYY-MM-DD` never shifts a day for UTC+6 users.
- **PWA assets that actually exist:** `favicon.svg`, `icons/icon-192.png`,
  `icons/icon-512.png`, `icons/maskable-512.png`, `icons/og-cover.png`,
  `robots.txt`, and a manifest that only references shipped files.
- **Docs:** `README.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`,
  `docs/LOCALISATION.md`, this changelog, `LICENSE` (MIT), `.gitattributes`.
- **Sub-path deploys actually work.** The router's `basename` is derived from
  Vite's `base` (`VITE_BASE`), the Supabase email-verification and password-reset
  redirects include that prefix, and the error boundary's "Go home" button goes to
  the app root rather than the host root. A `spaFallback()` Vite plugin emits
  `dist/404.html` from `404.template.html` with the base substituted, because a
  file in `public/` is copied verbatim and cannot know where it is being served
  from.
- **Config typed and hardened:** `vite.config.ts` (was `.js`), `base` driven by
  `VITE_BASE`, `manualChunks` for `react` / `recharts` / `lucide-react`, path
  aliases, and a `.env.example` documenting every variable.

### Changed

- **`App.tsx` went from 1114 lines (73 KB) to a thin provider composition.** Its
  contents are now `src/router.tsx`, `src/layout/`, 15 files in `src/pages/`, and
  focused components. The inline `translations` object that was rebuilt on every
  render became the `src/i18n/dictionaries/` modules.
- **Runtime dependencies: 17 → 6.** Everything else moved to `devDependencies`
  (vitest, jsdom, testing-library) or was dropped as unused.
- **Code splitting.** The original build emitted a **single 686 kB JS chunk
  (164 kB gzip)** and tripped Vite's >500 kB warning. The rewrite splits vendor
  chunks and lazy-loads the four heaviest/rarest routes (Analytics, Compare,
  Passport, Reminders) while keeping first-navigation routes eager — deliberate,
  because an offline user should not wait on an uncached lazy chunk.
- **Storage keys are namespaced** (`tikatrack.theme`, `tikatrack.language`,
  `tikatrack.profiles`, …) instead of the generic `theme` the original used, and
  every access is wrapped in `try/catch` so private-browsing mode degrades instead
  of throwing.
- **Supabase is now strictly opt-in.** `isSupabaseConfigured()` gates every network
  call; with no env vars the app is 100% functional on `localStorage` and says so in
  the UI. The original's passport, RAG and knowledge-base modules imported
  `supabase` unconditionally and threw or returned nothing offline.
- **TypeScript strictness kept, enforcement added.** `strict: true` was already set
  (and the original did type-check cleanly), but `build` ran `vite build` only —
  types were never checked as part of building. `build` is now `tsc -b && vite
build`, and CI runs it.
- **No third-party CSS or fonts at runtime.** The original loaded Font Awesome from
  a CDN (for exactly one class) — dead weight that also broke offline rendering.
  Bangla now uses installed-face stacks via `.font-bangla`.

### Fixed

- **Dark mode did not work.** Tailwind v4's default `dark:` variant is
  `prefers-color-scheme`, but `ThemeContext` toggled a `.dark` class, and the
  stylesheet never declared `@custom-variant dark (&:where(.dark, .dark *))`. Only
  the inline `html.dark body` background rule had any effect. Dark mode is now
  class-driven, persisted, and applied **pre-paint** so there is no flash.
- **Language choice was lost on every reload** — it lived in `useState<Language>('en')`
  with no persistence and no `navigator.languages` detection.
- **Ten runtime-interpolated Tailwind class sites** (`from-${color}-50`,
  `to-${color}-100`, `border-${color}-200` in `App.tsx` and
  `EnhancedSchedulePage.tsx`) produced classes the v4 JIT scanner can never see, so
  those gradients and borders silently did not exist. Replaced by the literal
  `vaccineColors` map.
- **The PWA manifest referenced 13 assets that did not exist** (8 icons, 2
  screenshots, 3 shortcut icons) while `public/` contained only `manifest.json` —
  enough to fail Chrome's installability criteria. Icons are now generated
  (`scripts/generate_icons.py`) and shipped.
- **`index.html` was still the codegen template:** `lang="zh-CN"`,
  `<title>coder-app-name</title>`, Chinese comments, an iframe `postMessage`
  error reporter, and an entry pointing at `/src/main.jsx` when the file is
  `main.tsx`. It now carries real metadata, OG/Twitter tags, a `<noscript>`
  message, and the correct entry.
- **The one existing test could not run.** With the original `package.json`
  (vitest ^5.0.5 + jsdom ^30.1.3) on Node 20, `vitest run` aborted before
  collecting anything: `TypeError: Cannot read properties of undefined (reading
'bind')` from `undici`. Pinned to vitest ^3.2.4 + jsdom ^26, where the suite runs.
- **TikaBot answers required a server.** `ragEngine.ts` and `knowledgeBase.ts`
  queried Supabase (`searchKnowledge`, `supabase.rpc('verify_qr_token')`), and the
  local fallback was substring containment over 7 FAQ entries. Retrieval is now a
  pure, offline, ranked engine over the local FAQ + vaccine corpus with Bangla-aware
  tokenisation (combining marks preserved — `\p{M}`), synonym/query expansion and
  cited sources.
- **README claims contradicted the data.** The original advertised "35+ vaccines",
  "100+ centres" and "64 districts" (actual: **52 / 99 / 56**), badge-labelled
  itself "Build Passing" with no CI, and "License: MIT" with **no LICENSE file**.
  Current numbers are asserted by tests, so the docs cannot drift silently.
- **Family profiles and dose records were never saved.** This was the most serious
  defect in the original: `App.tsx` read `localStorage.getItem('tikatrack-profiles')`
  on startup, but **no code anywhere in the project ever wrote that key** — the only
  `setItem` calls were for reminders, reminder preferences and the theme. So the
  tracker's central feature lost every recorded dose on reload, while the README
  advertised "Privacy-First — Local storage". `ProfilesContext` + `profileStore` now
  own the full read/validate/write lifecycle: every change is written back, changes
  made in another tab are picked up via the `storage` event, and
  `src/tests/profileStore.test.ts` covers normalisation, import/export and the
  round-trip.
- **Stored data was parsed without a guard.** `JSON.parse(saved)` ran inside a
  `useState` initialiser with no `try/catch` and no shape validation, so one corrupt
  value in `localStorage` threw during render and blanked the app. `src/lib/storage.ts`
  now probes storage availability first (Safari private mode returns `null` and the
  UI reports `persistent: false` instead of crashing), guards every read, and
  validates shape. Dose records are accepted in both the legacy bare-string form
  (`{ "bcg": "2024-01-05" }`) and the current object form
  (`{ "bcg": { "date": "2024-01-05" } }`) so imports never silently drop a dose.
- **Upgrades keep existing data.** `LEGACY_STORAGE_KEYS` migrates the original's
  `tikatrack-profiles` and `theme` keys into the namespaced ones on first read, then
  removes the old keys.
- **Calendar dates are no longer timezone-dependent.** The scheduler and reminder
  engine mixed `new Date('YYYY-MM-DD')` (UTC midnight) with `toISOString()` (UTC
  serialisation) and `setHours(0,0,0,0)` (local). For UTC+6 users — all of
  Bangladesh — `reminderDate.toISOString().split('T')[0]` produced the _previous_
  day, so "7 days before" reminders were dated 8 days before; west of Greenwich,
  `calculateScheduledDate` and `determineVaccineStatus` were a day off, so a dose
  due today could be reported overdue. Everything now goes through
  `lib/format`'s local-date helpers (`parseISODate`, `toISODate`, `addDays`,
  `daysBetween`, `startOfToday`, `todayISO`), and the tests re-run under four
  pinned timezones. The same `todayISO()` fix applies to the date inputs' `max`
  attribute (which, before 06:00 local time, forbade recording a dose _today_) and
  to export filenames.
- **Local accounts work on insecure origins.** `crypto.subtle` exists only in a
  secure context (HTTPS or localhost). Over plain HTTP — a clinic LAN, an IP
  address — `hashPassword` returned `null`, and sign-up then stored a _random_
  digest, so the account could be created but never signed into, and password
  changes always failed with "invalid credentials". The new portable SHA-256 makes
  hashing unconditional; a regression test signs up and signs in with
  `crypto.subtle` removed.
- **Browser notifications referenced assets that do not exist**
  (`/vaccine-icon.png`, `/badge-icon.png`) and ignored the deploy base. They now
  point at the shipped `icons/icon-192.png`, base-prefixed.
- **A dose scheduled for today was rejected** by the proposed-date validator,
  which compared a UTC-parsed date against `new Date()` (the current instant).
  Today is now valid; only past dates are refused.
- **Reminders are derived, not authored.** They are recomputed from the schedule and
  the recorded doses, so editing a dose can never leave a stale reminder behind.

### Removed

- **Unused dependencies (9):** `@dnd-kit/core`, `@dnd-kit/sortable`,
  `@dnd-kit/utilities`, `canvas-confetti`, `@types/canvas-confetti`, `date-fns`,
  `framer-motion`, `uuid`, `@types/uuid` — none were imported anywhere.
- **`src/lib/security.ts` (342 lines) and `src/lib/qrVerification.ts` (133 lines):**
  server-dependent audit logging and token verification that could not work in a
  static, offline-first app. Replaced by the local HMAC passport scheme, whose
  limitations are stated plainly in the UI rather than implied to be stronger.
- **Fourteen marketing documents from the repo root** (`ULTIMATE_PREMIUM_UPGRADE.md`,
  `MASSIVE_EXPANSION_FINAL.md`, `V10_RELEASE_COMPLETE.md`, …) — replaced by the four
  factual docs in `docs/`.
- **The Font Awesome CDN stylesheet.**
- **`window.confirm()` for destructive actions.**

### Security & privacy

- Health data stays on-device by default; cloud sync is opt-in and only ever uses
  the **anon** key. Migrations rely on Row Level Security, and the docs call out
  explicitly that anything prefixed `VITE_` is public.
- Passport signatures are device-bound HMAC over the canonical payload — enough to
  detect tampering on the same device, and the UI says exactly that instead of
  implying a PKI it does not have.
- No analytics, no third-party requests, no `postMessage` reporter.

<!-- Replace `your-org` with your GitHub user or organisation once published. -->

[2.2.0]: https://github.com/your-org/tikatrack/releases/tag/v2.2.0
[2.1.0]: https://github.com/your-org/tikatrack/releases/tag/v2.1.0
[2.0.0]: https://github.com/your-org/tikatrack/releases/tag/v2.0.0
