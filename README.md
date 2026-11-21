# TikaTrack

Bilingual (English & Bangla) immunization companion built for Bangladesh's EPI schedule and lifelong family vaccination tracking from newborn to senior years.

## Core Capabilities

- **Lifespan Immunization Schedule & Family Tracker**: Tracks individual dose events (`VaccinationEvent` ledger) across birth, EPI childhood milestones, school-age boosters, adult/maternal immunization, and older-adult vaccines.
- **WHO Child & Adolescent Growth Tracker**: Interactive Recharts percentiles against WHO 0–60 month weight/height curves and WHO Reference 2007 BMI-for-age (5–19 years), with vaccination milestone pins.
- **TikaBot AI & Offline RAG Assistant**:
  - Offline bilingual BM25 retrieval over verified Bangladesh EPI & clinical vaccine data (`src/lib/ragEngine.ts`) with emergency symptom triage.
  - Optional server-proxied Gemini streaming & Live Voice Q&A via `/api/tikabot/*` and WebSocket `/ws/live-voice`.
- **Verifiable Digital Vaccination Passport**:
  - QR code certificates with both per-device HMAC (`TIKAPASS2`) and cross-device verifiable ECDSA P-256 signatures (`TIKAPASS3`), plus printable PDF/SVG export with Unicode Bangla text fallback.
- **Interactive Cold-Chain 3D Explorer & Centres Map**:
  - Three.js WHO PQS cold-chain explorer (`ColdChainScene.ts`) and Bangladesh vaccination centre locator (`CentresMap.tsx` with Google Maps Platform integration).
- **Web Push 48-Hour Alerts & Offline-First PWA**:
  - Custom service worker (`sw.template.js`) with build-hashed precaching, update-waiting prompt, and VAPID-authenticated Web Push reminders (`web-push`).
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
