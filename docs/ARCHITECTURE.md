# Architecture

This document explains how TikaTrack is put together and _why_. For setup and
deployment see [`DEPLOYMENT.md`](DEPLOYMENT.md); for translations see
[`LOCALISATION.md`](LOCALISATION.md).

## Guiding principles

1. **Offline-first, local by default.** The app must be 100% functional with no
   network, no backend and no account. Cloud sync is an _optional_ enhancement
   that switches on only when Supabase credentials are present. Nothing in the
   default path makes a network request.
2. **Pure core, thin UI.** Everything that can be a pure function lives in
   `src/lib/` and `src/data/` with no React and no hidden I/O. Pages and
   components compose that core with React state and contexts. This is what makes
   the logic unit-testable and lets the same code serve both the local and cloud
   paths.
3. **One source of truth per fact.** The schedule the tracker shows, the
   reminders, and the analytics charts are all derived from the _same_
   `smartScheduler` functions over the _same_ stored profiles — they cannot
   disagree, because none of them keeps its own copy.
4. **Bilingual by construction.** Every user-facing string is an i18n key with an
   English and a Bangla value; a test fails the build if they diverge.
5. **Honesty in a health context.** The assistant answers only from sourced
   passages and says "I don't know" otherwise; the passport verifier explains the
   limits of device-bound signing; medical disclaimers are shown next to clinical
   content.

## Runtime composition

```
main.tsx
  resolveSpaRedirect()            # lib/spaRedirect — undo a static-host 404 bounce
  <ErrorBoundary>                 # last-resort crash UI (keeps local data reachable)
    <App>
      <BrowserRouter>
        <ThemeProvider>           # light/dark/system, persisted, pre-paint applied
          <I18nProvider>          # language + t(), persisted
            <ToastProvider>       # transient notifications
              <AuthProvider>      # local-first auth; Supabase when configured
                <ProfilesProvider># family members + dose records (localStorage)
                  <Suspense><AppRoutes/></Suspense>
                  <ToastViewport/>
```

Provider order is deliberate: `I18nProvider` sits inside `ThemeProvider` (the
language toggle lives beside the theme toggle), and `AuthProvider` sits above
`ProfilesProvider` so a future cloud-sync layer can key profiles by user id
without re-parenting anything.

A **theme pre-paint script** in `index.html` reads `tikatrack.theme`,
`tikatrack.language` and `tikatrack.textSize` from `localStorage` and sets
`<html class>` / `lang` / `data-text-size` before React mounts, so there is no
light-to-dark flash, no wrong-language flash and no flash of small text.

`Layout` also mounts two app-wide components once each. `<AppStatus/>` owns
service-worker registration and renders the connection/build status (offline,
offline ready, update available), which keeps that logic out of every page — see
[`DEPLOYMENT.md`](DEPLOYMENT.md#3-offline--installability-pwa). `<WelcomeDialog/>`
is the first-run tour; it lives here rather than on the home route so a visitor
who arrives on a deep link is greeted too, and whether it appears is decided by
`lib/onboarding.shouldShowOnboarding(profileCount, dismissed)` — never on a device
that already holds records.

## Routing

`src/router.tsx` holds the whole route table inside a shared `Layout` (skip link,
`Header`, `<main>`, `Footer`). The `Layout` wraps its `<Outlet/>` in an
`ErrorBoundary`, so a crash on one page never takes down the navigation or the
user's ability to reach their data.

Two details make URLs work on a plain static host:

- **`basename` comes from the build.** `App.tsx` passes
  `import.meta.env.BASE_URL` (minus the trailing slash) to `BrowserRouter`, so a
  sub-path deploy such as `https://<user>.github.io/tikatrack/` matches its routes
  instead of falling through to `NotFoundPage`.
- **Deep links survive hosts with no rewrite rules.** The build emits
  `dist/404.html` from `404.template.html` with that same base baked in. GitHub
  Pages serves it for unknown paths; it bounces to the app root with the original
  location in `?tikatrack_route=`, and `lib/spaRedirect.ts` rewrites the address
  bar _before_ React Router reads it. On hosts that do rewrite, none of this
  fires. `src/tests/spaRedirect.test.ts` covers the resolution rules.

Routes that pull in a heavy dependency (`recharts` on **/analytics**) or are
visited less often (**/reminders**, **/compare**, **/passport**) are
`React.lazy`-loaded with a `PageSkeleton` fallback. Everything else is in the
main chunk so the first navigation is instant — an offline user should never wait
on a chunk that was never cached. Vite `manualChunks` further splits `react`,
`recharts` and `lucide-react` into their own vendor chunks.

| Route           | Page              | Notes                             |
| --------------- | ----------------- | --------------------------------- |
| `/`             | HomePage          | hero, stats, feature overview     |
| `/vaccines`     | VaccinesPage      | filterable catalogue              |
| `/vaccines/:id` | VaccineDetailPage | full reference + compare toggle   |
| `/schedule`     | SchedulePage      | age/DOB timeline                  |
| `/tracker`      | TrackerPage       | family members + dose records     |
| `/centres`      | CentresPage       | search/filter/sort/export centres |
| `/tikabot`      | TikabotPage       | offline RAG assistant             |
| `/analytics`    | AnalyticsPage     | charts (lazy, recharts)           |
| `/reminders`    | RemindersPage     | derived reminders (lazy)          |
| `/compare`      | ComparePage       | side-by-side vaccines (lazy)      |
| `/passport`     | PassportPage      | QR certificate + verifier (lazy)  |
| `/auth`         | AuthPage          | optional account / family sharing |
| `/privacy`      | PrivacyPage       | data controls, export/erase       |
| `/about`        | AboutPage         | mission, sources, disclaimer      |
| `*`             | NotFoundPage      | 404 with suggestions              |

## State & persistence

- **Profiles** (`ProfilesContext` + `lib/profileStore` + `lib/doseLedger`):
  family members and every dose they have been given. Persisted to
  `localStorage`. `profileStore` is pure — it normalises untrusted input
  (storage, imports, API responses) into valid `Profile` objects, validates new
  profiles, and defines the versioned import/export envelope. All writes from the
  tracker route through a single `replaceAll` callback so the store and the UI
  cannot drift. The dose data itself lives in a **ledger of individual
  administrations** (`profile.events`), not in a per-vaccine map — see
  [Spotlight: the dose ledger](#spotlight-the-dose-ledger).
- **Theme / Language** (`ThemeContext`, `I18nProvider`): persisted preferences.
- **Auth** (`AuthContext` + `lib/localAuth` / `lib/supabase`): in local mode,
  accounts are created on-device with a salted password hash (never sent
  anywhere); in cloud mode the same interface delegates to Supabase. The context
  exposes `cloudEnabled` / `backend` so the UI can label the mode honestly.
- **Reminders** (`lib/intelligentReminders`): _derived_ from profiles on demand
  and cached in `localStorage`. Because they are regenerated from the schedule,
  recording a dose clears the matching reminder instead of leaving it to nag.
- **Passports** (`lib/digitalPassport`): issued certificates stored locally.

All keys are `tikatrack.`-prefixed (`lib/storage`), which also powers the
"estimate storage" and "erase all local data" controls on the Privacy page.

## The pure core (`src/lib/`)

| Module                 | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `format`               | Date/number formatting, Bangla numerals, age, relative labels         |
| `id`                   | Collision-resistant, non-`Date.now()` identifiers                     |
| `profileStore`         | Profile normalisation, validation, import/export merge                |
| `doseLedger`           | The dose record system: event schema, migration, per-dose attribution |
| `doseExport`           | One CSV row per administered dose (pure row builder)                  |
| `smartScheduler`       | Age → scheduled doses, status, catch-up plans, stats (single source)  |
| `evidenceValidator`    | Fails the build when a medical entry lacks source metadata            |
| `intelligentReminders` | Reminder generation, quiet hours, notifications, statistics           |
| `ragEngine`            | Offline BM25 retrieval + answer synthesis over the bundled corpus     |
| `qr`                   | Byte-mode QR encoder (v1–12, ECC-M), no dependencies                  |
| `digitalPassport`      | Device-signed QR certificate + verifier                               |
| `localAuth`            | On-device accounts, password strength, hashing                        |
| `sha256`               | Portable SHA-256 for contexts where SubtleCrypto is absent            |
| `supabase`             | Optional cloud client; inert unless configured                        |
| `exporters`            | JSON/CSV download, print, clipboard                                   |
| `storage`              | Key registry, usage estimate, safe erase                              |
| `spaRedirect`          | Turns a static host's `404.html` bounce back into a real route        |
| `ics`                  | RFC 5545 calendar writer: all-day events, line folding, `VALARM`      |
| `share`                | Web Share API + clipboard fallback, shareable files, record summary   |
| `epiCard`              | One-page printable EPI card, rendered as sanitised inline SVG         |
| `qrScanner`            | QR decoding from the camera or a photo (`jsQR`, dynamically imported) |
| `botContext`           | Record-derived facts for the assistant, in the UI's language/numerals |
| `serviceWorker`        | Registration, update flow, cache clearing, storage estimate           |
| `onboarding`           | First-run tour: whether to show it, dismissal, step clamping          |
| `version`              | `APP_VERSION` read from `package.json` (never drifts)                 |

`src/data/evidence/` is the knowledge base that sits beside the pure core: 9
structured vaccine records, 35 registered sources, 8 open conflicts and a bridge
that classifies all 52 legacy catalogue ids. Every clinical claim carries its
evidence, and `npm run evidence:report` regenerates `docs/EVIDENCE-REVIEW.md`
from the data — CI fails if the committed report drifts. Nothing in it is
invented: where no authoritative document exists, the field says so
(`requires-professional-review`) instead of holding a plausible number.

### Rule: calendar dates are local, never UTC

A vaccination schedule is a set of _calendar_ dates, and `YYYY-MM-DD` strings are
the wire format for them. Two JavaScript habits break that:

- `new Date('2026-03-05')` parses as **UTC midnight**, which is the previous
  calendar day anywhere west of Greenwich.
- `date.toISOString().slice(0, 10)` serialises through **UTC**, which is the
  previous calendar day anywhere east of Greenwich — i.e. all of Bangladesh
  (UTC+6), where a reminder would fire a day early.

So `lib/format.ts` owns the conversions — `parseISODate` (local), `toISODate`
(local), `startOfToday`, `addDays`, `daysBetween`, `todayISO` — and the scheduler,
reminders and every component use those instead of the `Date` constructor.
`src/tests/intelligentReminders.test.ts` re-runs the scheduling assertions with
`process.env.TZ` pinned to UTC, Asia/Dhaka, America/New_York and
Pacific/Kiritimati, so a regression fails in at least one timezone — and CI runs
the whole suite again under `TZ=Asia/Dhaka`, because a UTC-only assumption is
invisible to a UTC test runner.

### Spotlight: the dose ledger

`lib/doseLedger.ts` is the record system, and the reason TikaTrack 3.0 exists.
In 2.x a member's vaccinations were a `Record<vaccineId, DoseRecord>` — **one
slot per vaccine** — so recording OPV dose 2 overwrote dose 1, "remove this dose"
deleted the vaccine's whole history, and a single migrated record could make a
four-dose series look complete. No scheduler on top of that shape can be correct.

A dose is now a `VaccinationEvent`:

| Field                                      | Why it exists                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `id`, `profileId`                          | Address one record; delete or correct exactly it                          |
| `vaccineId`, `seriesId`, `scheduleVersion` | Which course this dose belongs to, and which schedule version numbered it |
| `doseNumber`, `scheduledDoseId`            | Position in the series (`opv#2@42d`); `null` when nobody knows            |
| `date`, `createdAt`, `updatedAt`           | When it was given, when that was written down, when it was corrected      |
| `centre`, `manufacturer`, `batch`, `notes` | What the paper card says                                                  |
| `provenance`                               | `manual` / `import` / `legacy-migration` / `verified`                     |
| `needsReview`, `reviewReason`              | An honest gap is data too, and it is flagged rather than guessed          |

Four invariants, each with a regression test in `src/tests/doseRegression.test.ts`:

1. **One record is one dose.** Attribution (`seriesState`) marks at most one
   scheduled dose per event, so a single record can never complete a series.
2. **Nothing is invented.** A dose number that was never recorded stays `null`
   and is flagged (`legacy-dose-number-unknown`, `dose-number-unknown`); a
   number outside the schedule is flagged (`dose-number-out-of-range`); two
   events claiming the same dose are both kept and the second is flagged
   (`duplicate-dose-number`).
3. **Migration is additive.** `migrateLegacyRecords` turns each 2.x entry into an
   event with a deterministic id (`dose-legacy-<profileId>-<vaccineId>`), keeping
   every date, note and centre; `ensureLedger` is idempotent, so re-hydrating
   cannot resurrect a deleted dose, and `profile.records` survives as a _derived_
   one-slot projection for older builds.
4. **Merging is a union.** `mergeEvents` matches by id, then by
   vaccine+date+dose fingerprint, then loosely for the same visit — so restoring a
   backup twice adds nothing, restoring an old backup over newer local data loses
   nothing, and `verified` provenance is never downgraded.

Provisional attribution deserves its own sentence: an unnumbered event is matched
to the **earliest still-open** milestone so a migrating family does not watch
their recorded doses vanish from the tracker. That is a data-attribution
heuristic, not a clinical rule — it can never mark more doses complete than the
family recorded, and every provisional match carries `needsReview` for the UI to
disclose.

Everything downstream reads the ledger through `toDoseHistory()`, which accepts a
`Profile`, an event array, or a bare 2.x map and normalises all three to the same
per-dose state. That is what keeps `smartScheduler`, `intelligentReminders`,
`botContext`, `digitalPassport`, `epiCard`, `ics` and the analytics page from
re-implementing (or re-breaking) attribution.

### Spotlight: the QR encoder

`lib/qr.ts` is a hand-written byte-mode encoder (versions 1–12, error-correction
level M) with best-of-eight masking and ISO-correct format/version-information
placement. It exists because the original project's encoder had two subtle bugs
(Reed–Solomon generator-polynomial coefficient order, and format-info cell
mapping) that produced symbols many scanners could not read. It is verified by
round-tripping every version's exact capacity through the independent `jsQR`
decoder, plus a 397-case fuzz pass — see `src/tests/qr.test.ts`.

### Spotlight: the retrieval assistant

`lib/ragEngine.ts` builds a BM25 index over the bundled FAQ + vaccine corpus in
both languages. A Bangla tokeniser keeps conjuncts intact (Unicode marks are
preserved), light suffix stemming and a cross-language synonym table let a Bangla
question find English documents and vice versa. `answer()` assembles a reply
**only from retrieved passages** (never generated prose), surfaces emergency
guidance first for urgent queries, and returns an explicit low-confidence
fallback that points to the hotline when nothing clears the confidence floor.

## Styling

Tailwind CSS **v4**, configured entirely in CSS (`src/styles/index.css`) — no
`tailwind.config.js`. The file defines:

- `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode
  (without this, `dark:` silently does nothing in v4).
- `@theme` — brand/surface/status colour tokens, font stacks (including a Bangla
  stack), radii and shadows.
- `@utility` — the composable bases (`btn`, `card`, `card-padded`, `badge`). In
  v4 only _utilities_ can be `@apply`-ed, so bases that other classes build on
  must be registered with `@utility`, not `@layer components`.
- `@layer components` — the semantic classes pages use (`btn-primary`,
  `section-title`, `page-shell`, `stat-card`, `chip`, …), so a redesign is a
  one-file change.
- A print layer — the schedule, tracker, analytics and passport pages offer
  "Print"; only the `.print-area` subtree reaches the paper.
- `:root[data-text-size='large' | 'xlarge']` — scales the root font size, so
  every `rem`-based utility grows with it. Fixed pixel values (touch targets,
  borders) deliberately do not.

TikaTrack deliberately ships **no web fonts**: Bangladeshi mobile connections are
often metered and a vaccination reference should render instantly offline. The
font stacks prefer an installed Bangla face and fall back to the platform UI font.
See [`LOCALISATION.md`](LOCALISATION.md) for opting into a self-hosted font.

## Testing strategy

- **Unit tests** for the pure core: `qr`, `sha256`, `smartScheduler`,
  `doseLedger`, `profileStore`, `ragEngine`, `format`, `intelligentReminders`,
  `localAuth`, `id`, `storage`, `exporters`, `spaRedirect`, `supabase` and the
  Supabase auth adapter (scripted through a fake client, so the cloud path is
  tested offline).
  `digitalPassport` covers issue → verify round-trips, tamper detection, size
  limits and storage. `ics`, `share`, `epiCard`, `qrScanner`, `botContext`,
  `serviceWorker` and the hooks each have their own suite, and `swRuntime`
  imports `sw.template.js?raw` and drives the worker's `install` / `activate` /
  `message` / `fetch` handlers against a fake `Cache` — the offline path is
  tested, not assumed.
- **i18n tests** assert English/Bangla key parity, placeholder parity, no empty
  values, and — importantly — that _every_ dictionary file is actually merged
  into the runtime table (catching a namespace that exists on disk but was never
  imported).
- **Regression tests for the dose record system** (`doseRegression`): the six
  failures that made 3.0 necessary, driven end to end through `profileStore` and
  back out through the scheduler, the statistics and the exporters — OPV-1 does
  not complete OPV-2/3, Pentavalent-1 does not complete Pentavalent-2/3,
  correcting one dose never changes another, deleting one dose never deletes the
  vaccine's history, multiple doses survive backup and restore, and a 2.x profile
  migrates without losing a date, a note or a centre.
- **Component tests** (`doseUi`, `evidenceUi`, `welcome`, `hooks`) drive the real
  screens through `<App/>` with `@testing-library/react`, so a control that is
  wired to the wrong handler fails the build.
- **Data tests** (`evidence`) assert that every published medical entry carries
  source metadata, an access date and a review status, and that nothing
  classified as awaiting review can reach the assistant.
- **A full-app smoke test** mounts `<App/>` at every route (eager and lazy) and
  asserts none of them hit the `ErrorBoundary`. This catches runtime wiring bugs
  — provider ordering, router context, missing browser APIs — that neither the
  compiler nor the unit tests can see. A second pass renders the same routes
  against a _populated_ device, because the calendar export, sharing, the
  printable card and the record-aware assistant only exist once there is data.

**Coverage is a gate, not a report.** `npm run test:coverage` enforces thresholds
(90% statements, 90% lines, 90% functions, 82% branches) over `lib/`, `data/`,
`hooks/` and `i18n/`; at 3.0.0-alpha.2 the suite — 33 files, 809 tests — sits at
92.2% / 93.6% / 92.9% / 85.3%. The thresholds were ratcheted up from 60/60/55
once the pure core was covered, and again to 90/90/82 when Vitest 4 started
instrumenting more branches, so new untested code fails CI instead of quietly
eroding the number.

`npm run validate` runs typecheck → lint → format:check → evidence:report →
test:coverage → build; CI runs the same gate on Node 20 and 22, then re-runs the
suite under `TZ=Asia/Dhaka`.
