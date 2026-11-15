# Deployment

TikaTrack is a **static** single-page app. Deploying it means building `dist/`
and serving it from any static host. There is no application server; the only
optional backend is Supabase (auth + sync), which is a hosted service you
configure with environment variables.

## 1. Build

```bash
npm ci                 # reproducible install from package-lock.json
npm run build          # tsc -b && vite build  →  dist/
```

`dist/` is the entire deployable artefact. Serve it over HTTPS from any static
host or CDN. To sanity-check the production build locally:

```bash
npm run preview        # http://localhost:4173
```

> [!NOTE]
> The build has **no required environment variables**. If you omit the Supabase
> variables the app runs in local-only mode — this is the default and is fully
> functional.

## 2. SPA routing

TikaTrack uses client-side routing (`BrowserRouter`), so the host must serve
`index.html` for unknown paths (a deep link like `/tracker` must not 404).

### Hosts with rewrite rules (recommended)

**Netlify** — add `public/_redirects` (or a `netlify.toml`):

```
/*    /index.html   200
```

**Vercel** — add `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Cloudflare Pages** — Functions or `_redirects`:

```
/*  /index.html  200
```

**nginx**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

With a proper rewrite the generated `dist/404.html` is simply never requested;
leaving it in the build is harmless.

### GitHub Pages (no rewrite support)

GitHub Pages cannot rewrite, so the build **generates `dist/404.html`** from
`404.template.html` (a small Vite plugin in `vite.config.ts`), with your deploy
base baked in. For an unknown path it forwards the original location to
`<base>?tikatrack_route=<path>` — plus a `sessionStorage` copy — and
`src/lib/spaRedirect.ts` restores the address bar before React Router mounts.

There is nothing extra to configure, but `VITE_BASE` must be correct: the
redirect target, the asset URLs _and_ the router's `basename` are all derived from
it. To deploy under `https://<user>.github.io/<repo>/`:

1. Build with the repository base path:

   ```bash
   VITE_BASE=/<repo>/ npm run build
   ```

2. Publish `dist/` to the `gh-pages` branch (or use `actions/deploy-pages`). A
   minimal workflow:

   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy
   on:
     push:
       branches: [main]
   permissions:
     pages: write
     id-token: write
     contents: read
   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm }
         - run: npm ci
         - run: VITE_BASE=/${{ github.event.repository.name }}/ npm run build
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with: { path: dist }
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

   `VITE_BASE` must match the path your site is served from, or asset URLs will 404.

## 3. Offline & installability (PWA)

Two artefacts make the app installable and usable with no network. Both are
generated at build time from a template, so they always agree with `VITE_BASE`:

| Template                 | Emitted as                  | Why it is templated                                                           |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `manifest.template.json` | `dist/manifest.webmanifest` | `id`, `start_url`, `scope` and every icon path need the deploy base           |
| `sw.template.js`         | `dist/sw.js`                | the precache list is derived from the bundle; the cache name hashes that list |

Edit the templates, never the generated files. In dev the manifest is served by a
Vite middleware, while the service worker is **not** registered (registration is
`import.meta.env.PROD`-only) so a stale worker cannot serve yesterday's modules
while you iterate. To exercise the offline path locally, use `npm run preview`.

Caching strategy:

- **App shell** — hashed JS/CSS, `index.html`, icons, manifest and `public/`
  assets are precached on `install`, then served cache-first. Every URL is
  content-hashed, so a cache hit is always the correct file.
- **Navigations** — network-first; on a network error _or_ an error response (a
  GitHub Pages deep link returns the `404.html` bounce page) the cached SPA shell
  is served. That is what makes routes work offline on hosts with no rewrite rule.
- **Cross-origin** — never intercepted. Supabase, if configured, must not be
  masked by the worker or served from cache.

Requirements and gotchas:

- **HTTPS is mandatory** for both the service worker and the QR camera
  (`getUserMedia`). `http://localhost` counts as a secure context, which is why
  local preview works. On an insecure origin the scanner says so explicitly
  instead of failing silently.
- **iOS Safari** has no `beforeinstallprompt`, so the in-app _Install_ button
  stays hidden there — a control that cannot work is worse than no control. Those
  users install via Share → Add to Home Screen, which the base-correct manifest
  makes work on a project site too.
- **A new deploy never interrupts the user.** The new worker installs and waits;
  `AppStatus` then offers a reload, and only after it is accepted does
  `skipWaiting()` + `clients.claim()` take over. Caches from previous builds are
  deleted on `activate`.
- Users can delete the offline copy from **Privacy → Offline copy of the app**,
  which clears the caches and unregisters the worker. That page also reports how
  much browser storage is in use.

## 4. Optional: Supabase (accounts + cloud sync)

Skip this entirely for a local-only deployment. To enable cloud mode:

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema in `supabase/migrations/` (SQL editor, in order):
   - `001_initial_schema.sql` — profiles, dose records, families, members.
   - `002_digital_passport.sql` — stored certificates.
   - `003_knowledge_base.sql` — optional server-side FAQ/knowledge table.
3. Copy the **Project Settings → API** values into your host's environment (and
   into `.env.local` for local dev):

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

4. Rebuild. When both variables are present and non-empty, `isSupabaseConfigured()`
   returns true, the client initialises, and the UI switches its labels from
   "Local mode" to "Cloud sync". Family sharing (invites, roles) becomes available.
5. Allow-list the callback URLs in **Supabase → Auth → URL Configuration**. The app
   sends `<origin><base>auth?mode=verify` (sign-up) and `<origin><base>auth?mode=reset`
   (password reset), so on a sub-path deploy both include your `VITE_BASE` prefix.

> [!WARNING]
> Only ever expose the **anon** key to the client. Enforce access with **Row Level
> Security** in your migrations — the anon key is public by design. Never put a
> `service_role` key in a `VITE_*` variable; anything prefixed `VITE_` is bundled
> into the public client.

Server-side integrations (e.g. email via `RESEND_API_KEY`) belong to a separate
backend and are **never** referenced by this client bundle.

## 5. Environment reference

| Variable                 | Required | Default     | Purpose                                       |
| ------------------------ | :------: | ----------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`      |    no    | _(empty)_   | Enables cloud auth/sync when set with the key |
| `VITE_SUPABASE_ANON_KEY` |    no    | _(empty)_   | Supabase anon (public) key                    |
| `VITE_APP_NAME`          |    no    | `TikaTrack` | Display name                                  |
| `VITE_BASE`              |    no    | `/`         | Base path for sub-directory deploys           |

## 6. Troubleshooting the build

| Symptom                                                | Cause / fix                                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite build` is killed (exit 137) or the machine swaps | Source maps for the `recharts` chunk are the memory hog. Build without them: `TIKATRACK_SOURCEMAPS=false npm run build`. Raising the heap (`NODE_OPTIONS=--max-old-space-size=4096`) does not help when the _container_ is the limit. CI runners are unaffected. |
| Assets 404 after deploying to `/<repo>/`               | `VITE_BASE` was not set at build time. Every asset URL _and_ the router's `basename` come from it — rebuild with `VITE_BASE=/<repo>/`.                                                                                                                           |
| Deep links work locally but 404 in production          | The host has no SPA rewrite. Add one (section 2) or rely on the generated `dist/404.html` (GitHub Pages).                                                                                                                                                        |
| Deep links still land on the home page on GitHub Pages | `dist/404.html` is missing from the published artefact — confirm the deploy publishes the whole `dist/` directory, and that `VITE_BASE` matches the site path.                                                                                                   |
| Dark mode or Bangla does not persist across a reload   | Storage is unavailable (private browsing / blocked cookies). The app keeps working and the Privacy page reports that nothing is persisted.                                                                                                                       |

## 7. Post-deploy checklist

- [ ] Load the site root and a **deep link** (e.g. `/tracker`) directly — both
      must render (verifies SPA routing / the generated `dist/404.html`).
- [ ] Toggle **dark mode** and **language**; reload — both must persist with no
      flash (verifies the pre-paint script).
- [ ] Add a family member and a dose; reload — data must persist (localStorage).
- [ ] Open **Privacy** and confirm the storage estimate and export/erase work.
- [ ] If Supabase is configured: sign up, sign in, and confirm the header shows
      cloud mode; if not: confirm it shows local mode and no network calls are
      made to a Supabase host.
- [ ] Switch the browser to **offline** and reload — the app must open from cache
      and show the offline banner (verifies `dist/sw.js` and its precache list).
- [ ] On a phone, **install to home screen** — it must open standalone, with
      icons, on the right page (verifies the templated manifest, especially on a
      sub-path deploy).
- [ ] Deploy a change, then reload twice — the **update available** banner should
      offer the new build rather than yanking the page.
- [ ] Over HTTPS, open **Passport** and start the camera scanner; over plain HTTP
      it must explain why it cannot, not fail silently.
- [ ] Export a `.ics` from the tracker and open it in a calendar app — the alarms
      should match the reminder lead times set in the app.
