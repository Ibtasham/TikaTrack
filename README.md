# TikaTrack

Bilingual (English & Bangla) immunization companion built for Bangladesh's EPI schedule and lifelong family vaccination tracking from newborn to senior years.

## Core Capabilities

- **Lifespan Immunization Schedule & Family Tracker**: Tracks individual dose events (`VaccinationEvent` ledger) across birth, EPI childhood milestones, school-age boosters, adult/maternal immunization, and older-adult vaccines, with tactile haptic confirmation on mobile devices.
- **Family Hub Dashboard & Vaccine Countdown**: Displays live time remaining to the primary profile's next scheduled EPI dose, interactive Recharts family vaccination progress over time, antigen protection coverage, and clinic visit bundling.
- **WHO Child & Adolescent Growth Tracker**: Interactive Recharts percentiles against WHO 0–60 month weight/height curves and WHO Reference 2007 BMI-for-age (5–19 years), with vaccination milestone pins.
- **TikaBot & Offline Retrieval Assistant**:
  - Offline bilingual BM25 retrieval over verified Bangladesh EPI & clinical vaccine data (`src/lib/ragEngine.ts`) with emergency symptom triage.
  - Optional server-proxied Gemini streaming & Live Voice Q&A via `/api/tikabot/*` and WebSocket `/ws/live-voice`.
- **Biometric-Protected Digital Vaccination Passport**:
  - QR code certificates with per-device HMAC (`TIKAPASS2`) and cross-device verifiable ECDSA P-256 signatures (`TIKAPASS3`), secured with WebAuthn passkeys or a 6-digit PIN vault lock, plus printable PDF/SVG export with Unicode Bangla text fallback.
- **Offline Local Notifications & Web Push Alerts**:
  - On-device Notification API scheduler with quiet-hours deferral and Service Worker dispatch (`sw.template.js`), alongside optional VAPID Web Push 48-hour reminders (`/api/push/*`).
- **Interactive Cold-Chain 3D Explorer & Centres Map**:
  - Three.js WHO PQS cold-chain explorer (`ColdChainScene.ts`) and Bangladesh vaccination centre locator (`CentresMap.tsx` with Google Maps Platform integration).
- **Offline-First PWA & Curated Themes**:
  - Custom service worker (`sw.template.js`) caching the app shell, national EPI schedule (`epi-schedule.json`), and family profile state for offline dashboard access, paired with warm wooden Day Mode themes and dark mode.
- **Multi-Backend Sync Architecture**:
  - **Local-first by default**: Zero-config browser `localStorage` with PBKDF2-SHA256 local accounts.
  - **Firebase Auth & Firestore**: Cross-device family profile sync secured with Firestore rules and tombstone-aware merges.
  - **Cloud SQL (PostgreSQL + Drizzle ORM)** & **Optional Supabase**: Server-side relational storage (`src/db/`) and Web Push subscription persistence.

## Tech Stack

- **Frontend**: React 19, TypeScript (strict), React Router v7, Tailwind CSS v4, Lucide Icons, Recharts, Three.js, Vite 8
- **Backend (`server.ts`)**: Express 4, `ws`, `@google/genai`, `firebase-admin`, `web-push`, `pg` / `drizzle-orm`
- **Testing & Quality**: Vitest, Testing Library, ESLint (`@firebase/eslint-plugin-security-rules`), TypeScript `tsc --noEmit`

## Quick Start

```bash
npm install
npm run dev
```

For environment variables (optional Firebase, Cloud SQL PostgreSQL, Gemini API key, Google Maps key, VAPID keys, or Supabase), copy `.env.example` to `.env`.

## Scripts

- `npm run dev` — Start Express + Vite development server on port `3000`
- `npm run build` — Production Vite build (`dist/`)
- `npm start` — Run production Node server (`server.ts` on Node 22+)
- `npm run lint` — TypeScript typecheck (`tsc --noEmit`)
- `npm run eslint` — ESLint across codebase
- `npm run test:run` — Run full Vitest suite

## GitHub CI & Deployment

Pushing to `main` automatically triggers:
- **CI (`.github/workflows/ci.yml`)**: TypeScript check, ESLint, Firestore security rules lint, full Vitest runs in UTC and `Asia/Dhaka`, and production Vite build.
- **GitHub Pages (`.github/workflows/deploy.yml`)**: Builds `dist/` with the repository base path and deploys to GitHub Pages.

## Documentation

- [Architecture & Data Invariants](docs/ARCHITECTURE.md)
- [Deployment & Environment Guide](docs/DEPLOYMENT.md)
- [Evidence Review](docs/EVIDENCE-REVIEW.md)
- [Localisation Guide](docs/LOCALISATION.md)
- [Changelog](docs/CHANGELOG.md)

## Medical Disclaimer

TikaTrack is an informational and personal record-keeping tool and does not replace clinical advice, diagnosis, or official Directorate General of Health Services (DGHS) EPI cards. Always verify immunization decisions with a qualified healthcare professional.

## License

MIT — see [LICENSE](LICENSE).
