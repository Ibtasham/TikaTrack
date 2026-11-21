/**
 * TikaTrack service worker.
 *
 * This file is the *template*: `vite.config.ts` (`pwaAssets()`) fills in the
 * deploy base, a build-specific cache name and the list of URLs that make up the
 * app shell, then emits the result as `dist/sw.js`. Edit this file, never the
 * generated one.
 *
 * Strategy
 *   install  → precache the app shell (hashed assets, index.html, icons) and wait
 *              so open forms aren't interrupted until the user accepts the update
 *   activate → delete caches left behind by previous builds, then `clients.claim()`
 *   navigate → network first; on a network error *or* an error response (a GitHub
 *              Pages deep link returns the `404.html` bounce page) serve the
 *              cached SPA shell so routes work offline and on hosts without
 *              rewrite rules
 *   assets   → cache first (every URL is content-hashed, so a hit is always
 *              correct), and fill the cache from the network on a miss
 *
 * Cross-origin requests — Supabase, if the user configured it — are never
 * intercepted, so the worker cannot mask a backend failure or serve stale cloud
 * data. Only same-origin `GET`s are handled at all.
 */

/* Build-time substitutions. `PRECACHE` keeps a valid-JS default so this file
 * stays parseable by Prettier and ESLint before the plugin rewrites it. */
const CACHE_NAME = '{{CACHE_NAME}}';
const BASE = '{{BASE}}';
const PRECACHE = /* {{PRECACHE}} */ [];
const IS_DEV = CACHE_NAME === 'tikatrack-dev';

/** The SPA shell: what a navigation falls back to when the network is gone. */
const OFFLINE_URL = `${BASE}index.html`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (IS_DEV) {
        await self.skipWaiting();
        return;
      }

      const cache = await caches.open(CACHE_NAME);
      // `addAll` would reject the whole install if a single optional file 404s,
      // so add them one by one and only require the shell itself to succeed.
      const results = await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      const failed = PRECACHE.filter((_, index) => results[index].status === 'rejected');
      if (failed.length > 0) console.warn('[sw] not precached:', failed);

      if (!(await cache.match(OFFLINE_URL))) {
        throw new Error('[sw] app shell could not be cached — aborting install');
      }
      // Stay in the waiting state until AppStatus dispatches SKIP_WAITING so we
      // never reload or swap assets under an active form or dose entry.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('tikatrack-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Lets the page ask the waiting worker to take over ("Update available"). */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { body: event.data.text() };
      } catch {
        payload = {};
      }
    }
  }

  const title = payload.title || 'TikaTrack Vaccination Reminder';
  const body =
    payload.body || 'An upcoming vaccination dose is scheduled in 48 hours.';
  const targetUrl = payload.url || `${BASE}reminders`;
  const icon = payload.icon || `${BASE}icons/icon-192.png`;
  const badge = payload.badge || `${BASE}icons/icon-192.png`;
  const actions = Array.isArray(payload.actions) ? payload.actions : undefined;

  const options = {
    body,
    icon,
    badge,
    tag: payload.tag || 'tikatrack-48h-reminder',
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: targetUrl,
      recordUrl: payload.recordUrl || `${BASE}tracker`,
      profileId: payload.profileId || null,
      vaccineId: payload.vaccineId || null,
      scheduledDate: payload.scheduledDate || null,
    },
    ...(actions ? { actions } : {}),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const relativeTarget =
    event.action === 'record' && data.recordUrl
      ? data.recordUrl
      : data.url || `${BASE}reminders`;
  const targetUrl = new URL(relativeTarget, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          if (typeof client.navigate === 'function') {
            await client.navigate(targetUrl).catch(() => undefined);
          }
          if (typeof client.focus === 'function') {
            return client.focus();
          }
        }
      }

      if (typeof self.clients.openWindow === 'function') {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_DEV) return;

  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(request.mode === 'navigate' ? navigate(request, url) : asset(request, url));
});

/** Cached copy of the exact URL, otherwise the SPA shell. */
async function shellFor(url) {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(url.href)) || (await cache.match(OFFLINE_URL)) || null;
}

async function navigate(request, url) {
  try {
    const response = await fetch(request);
    // 404s on a static host are still app routes: the shell renders them.
    if (response.ok) return response;
    return (await shellFor(url)) || response;
  } catch {
    return (await shellFor(url)) || Response.error();
  }
}

/** Assets worth keeping: hashed bundles, icons and anything precached. */
function isCacheable(url) {
  const { pathname } = url;
  return (
    pathname.startsWith(`${BASE}assets/`) ||
    pathname.startsWith(`${BASE}icons/`) ||
    PRECACHE.includes(pathname)
  );
}

async function asset(request, url) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Opaque/error responses are never worth storing.
    if (response.ok && isCacheable(url)) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || Response.error();
  }
}

