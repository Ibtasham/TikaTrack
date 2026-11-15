# Localisation

TikaTrack ships in two languages — **English (`en`)** and **Bangla (`bn`)** — and
every string a user can see goes through the same translator. Bangla is a
first-class language, not a bolt-on: it has its own digit formatting, its own
month names, and a font stack that shapes conjuncts correctly.

## How it works

There is no i18n library. `src/i18n/` is ~150 lines of plain TypeScript:

```
src/i18n/
├── index.tsx          I18nProvider, useI18n(), the merged runtime tables
├── types.ts           Language, TranslationDictionary, I18n contract
├── storage.ts         language detection + persistence (tikatrack.language)
└── dictionaries/      23 namespaces × 2 languages = 46 modules
    ├── app.en.ts      export const en: TranslationDictionary = { … }
    ├── app.bn.ts      export const bn: TranslationDictionary = { … }
    └── …
```

- **Keys are flat and dotted** (`home.hero.title`, `tracker.doses.add`). No
  nesting, no plural rules — the app's strings are simple enough that flat keys
  plus positional arguments cover everything.
- **Arguments are positional**: `{0}`, `{1}`, … substituted in call order:

  ```ts
  t('tracker.dose.title', 'Ayesha');
  // en "Record a dose for Ayesha"   bn "Ayesha-এর ডোজ যুক্ত করুন"

  t('analytics.insight.overdue', 'Ayesha', 2);
  // en "Ayesha has 2 overdue dose(s). Book a catch-up visit."
  ```

  Placeholder _positions_ may differ between languages; the test suite only
  requires the same _set_ of placeholders in each.

- **English is the fallback.** If a key is missing in Bangla the English string
  renders, and in `npm run dev` a `console.warn` names the missing key so it gets
  caught before release. A key missing in _both_ renders as the raw key.
- **Language detection** (`readStoredLanguage`): stored preference → browser
  `navigator.languages` (`bn*` → Bangla) → English.
- **Persistence is two-tier.** A pre-paint inline script in `index.html` applies
  the stored language to `<html lang>` before React mounts (no flash of the wrong
  language), and `I18nProvider` keeps it in sync afterwards.

### Using it in a component

```tsx
import { useI18n } from '../i18n';

function DoseCount({ n }: { n: number }) {
  const { t, language, toggleLanguage } = useI18n();
  return <button onClick={toggleLanguage}>{t('tracker.doses.count', n)}</button>;
}
```

`useTranslation()` is a shorthand returning `{ t, language }`. `has(key)` reports
whether the active language defines a key — useful for optional copy.

**Never hardcode user-visible strings**, and never interpolate them into
`className`. Everything goes through `t()`.

## Adding a translation

1. Pick (or create) the namespace that owns the screen.
2. Add the key to **both** files — `en` and `bn`:

   ```ts
   // src/i18n/dictionaries/tracker.en.ts
   'tracker.export.hint': 'Downloaded as a CSV file.',

   // src/i18n/dictionaries/tracker.bn.ts
   'tracker.export.hint': 'CSV ফাইল হিসেবে ডাউনলোড হবে।',
   ```

3. Run `npm run test`. The parity tests fail if the key exists in only one
   language, if either value is empty, or if the placeholder sets differ.
4. Run `npm run format` — Prettier reflows the long Bangla strings.

### Adding a new namespace

Create `myns.en.ts` (exporting `en`) and `myns.bn.ts` (exporting `bn`), then
**import both into `src/i18n/index.tsx` and add them to both `mergeAll(...)`
calls**. Dictionaries are merged in order; later entries win on collision.

> [!IMPORTANT]
> Importing the files is not optional and it is easy to forget. A dictionary file
> that exists on disk but is missing from the `mergeAll` list compiles, lints and
> type-checks fine — it just renders raw keys at runtime. This exact bug happened
> once (the `confirm`/`error`/`notFound` namespaces) and, because the omission was
> symmetric in both languages, the parity test did not catch it. That is why
> `src/tests/i18n.test.ts` also globs every `dictionaries/*.en.ts` /
> `*.bn.ts` file and asserts each of its keys is present in the **runtime** table.
> If you add a namespace and see `aggregate every dictionary file into the
runtime table` fail, you forgot the import.

### Bulk-adding page copy

`scripts/gen_i18n_pages.py` holds a `namespace → {key: (english, bangla)}` map and
appends any keys that do not already exist. It never rewrites or reorders existing
keys, so re-running is safe:

```bash
python3 scripts/gen_i18n_pages.py
```

Keep it in step with the dictionaries — if you correct a number or a phrase in a
dictionary file, correct it here too, or a fresh checkout will regenerate the old
text.

## Localised formatting

Don't format dates or numbers by hand; `src/lib/format.ts` is language-aware and
takes `Language` as its last argument. Verified output for the same inputs:

| Call                          | `en`           | `bn`           |
| ----------------------------- | -------------- | -------------- |
| `formatDate('2024-03-05', …)` | `5 March 2024` | `৫ মার্চ ২০২৪` |
| `formatMonth('2024-03', …)`   | `March 2024`   | `মার্চ ২০২৪`   |
| `formatAge('2026-08-20', …)`  | `2 m`          | `২ মাস`        |
| `formatAge('2025-05-10', …)`  | `1y 5m`        | `১ বছর ৫ মাস`  |
| `formatAge('2022-11-20', …)`  | `3 years`      | `৩ বছর`        |
| `formatRelativeDays(3, …)`    | `3 days`       | `৩ দিন`        |
| `formatRelativeDays(0, …)`    | `today`        | `আজ`           |
| `formatRelativeDays(-3, …)`   | `-3 days`      | `-৩ দিন`       |
| `localiseNumber(1234, …)`     | `1234`         | `১২৩৪`         |

`formatAge` is always relative to _today_ and switches unit at sensible
thresholds: days under 60, months under 1 year, `Xy Zm` under 2 years, whole years
after that. Invalid or future dates render as `—`.

`localiseNumber` maps ASCII digits to Bangla digits (`০১২৩৪৫৬৭৮৯`) when the active
language is `bn`. Storage and QR payloads always keep ISO dates and ASCII digits —
localisation happens at the render boundary only.

Dates are parsed with `parseISODate`, which builds a **local** `Date` from
`YYYY-MM-DD` rather than using the `Date` constructor (which would shift the day
for users ahead of UTC — i.e. all of Bangladesh).

## Bangla typography

TikaTrack deliberately loads **no web fonts**. Bangladeshi mobile users on metered
connections should see correct text immediately, offline. `src/styles/index.css`
therefore prefers installed faces:

```css
--font-bangla:
  'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush',
  'Shonar Bangla', /* …system fallbacks… */;
```

Any element rendering Bangla picks this up via `.font-bangla` (and the
`[lang='bn']` rule), which matters because the default Latin-first stack can break
conjunct shaping (যুক্তাক্ষর) and matra positioning. If you add a component that
renders Bangla outside the normal text flow, add the class rather than setting a
font inline.

Because there is no downloaded font, text metrics differ between machines — keep
layouts flexible (truncation, `min-w-0`, wrapping) instead of fixed widths sized to
English strings. Bangla copy is often noticeably longer than its English
equivalent.

## Tests

`src/tests/i18n.test.ts` enforces:

1. **No orphaned namespaces** — every key in every dictionary _file_ appears in the
   runtime table (the `mergeAll` import guard).
2. **Identical key sets** in `en` and `bn`, in both directions.
3. **No empty translations** in either language.
4. **Matching placeholder sets** for every shared key.
5. **A substantial catalogue** — currently 716 keys per language; the count must be
   equal and above the floor.

Plus `src/tests/smoke.test.tsx`, which renders every route in both languages and
fails if any page throws.

## Adding a third language

1. Extend `Language` and `LANGUAGES` in `src/i18n/types.ts`.
2. Add `*.xx.ts` dictionaries for all 23 namespaces and merge them in `index.tsx`.
3. Teach `isLanguage`/`readStoredLanguage` in `storage.ts` about the new code.
4. Add a Bangla-style font stack and a `.font-xx` rule if the script needs one.
5. Add the language branch to the `format.ts` helpers (numerals, month names).
6. Add the toggle UI (the header currently flips between exactly two languages via
   `toggleLanguage`).
7. Extend the parity test to compare every language against English rather than
   just `en`/`bn`.
