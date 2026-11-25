/**
 * TikaTrack service worker.
 *
 * This file is the *template*: `vite.config.ts` (`pwaAssets()`) fills in the
 * deploy base, a build-specific cache name and the list of URLs that make up the
 * app shell, then emits the result as `dist/sw.js`. Edit this file, never the
 * generated one.
 *
 * Strategy
 *   install  → precache the app shell (hashed assets, index.html, icons,
 *              epi-schedule.json) and wait so open forms aren't interrupted until
 *              the user accepts the update
 *   activate → delete stale build caches from previous builds while preserving
 *              the persistent `tikatrack-data-v1` offline data cache, then
 *              `clients.claim()`
 *   navigate → network first; on a network error *or* an error response (a GitHub
 *              Pages deep link returns the `404.html` bounce page) serve the
 *              cached SPA shell so routes work offline and on hosts without
 *              rewrite rules
 *   data     → network-first with `tikatrack-data-v1` cache fallback for the
 *              national EPI schedule (`/api/epi-schedule`, `/epi-schedule.json`)
 *              and synced user profile data (`/api/family/profiles`,
 *              `/__offline/profiles.json`)
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
const DATA_CACHE_NAME = 'tikatrack-data-v1';
const BASE = '{{BASE}}';
const PRECACHE = /* {{PRECACHE}} */ [];
const IS_DEV = CACHE_NAME === 'tikatrack-dev';

/** The SPA shell: what a navigation falls back to when the network is gone. */
const OFFLINE_URL = `${BASE}index.html`;
const EPI_SCHEDULE_ASSET_URL = `${BASE}epi-schedule.json`;
const EPI_SCHEDULE_API_URL = `${BASE}api/epi-schedule`;
const OFFLINE_EPI_SCHEDULE_URL = `${BASE}__offline/epi-schedule.json`;
const OFFLINE_PROFILES_URL = `${BASE}__offline/profiles.json`;
const FAMILY_PROFILES_API_URL = `${BASE}api/family/profiles`;

function createJsonResponse(data, extraHeaders) {
  const body = JSON.stringify(data);
  if (typeof Response === 'function') {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (extraHeaders) {
      for (const key of Object.keys(extraHeaders)) {
        headers[key] = extraHeaders[key];
      }
    }
    return new Response(body, { status: 200, headers });
  }
  return {
    ok: true,
    status: 200,
    body,
    type: 'basic',
    clone: () => createJsonResponse(data, extraHeaders),
  };
}

function toAbsoluteUrl(path) {
  try {
    return new URL(path, self.location.origin).href;
  } catch {
    return path;
  }
}

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
          .filter(
            (key) => key.startsWith('tikatrack-') && key !== CACHE_NAME && key !== DATA_CACHE_NAME,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Lets the page manage updates and sync offline EPI schedule + profile caches. */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data?.type === 'CACHE_EPI_SCHEDULE' && data.payload) {
    event.waitUntil(
      (async () => {
        const dataCache = await caches.open(DATA_CACHE_NAME);
        await Promise.all([
          dataCache.put(
            toAbsoluteUrl(OFFLINE_EPI_SCHEDULE_URL),
            createJsonResponse(data.payload, { 'X-TikaTrack-Cache': 'sw-data' }),
          ),
          dataCache.put(
            toAbsoluteUrl(EPI_SCHEDULE_ASSET_URL),
            createJsonResponse(data.payload, { 'X-TikaTrack-Cache': 'sw-data' }),
          ),
        ]);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        }
      })(),
    );
    return;
  }

  if (data?.type === 'CACHE_PROFILES' && Array.isArray(data.profiles)) {
    event.waitUntil(
      (async () => {
        const dataCache = await caches.open(DATA_CACHE_NAME);
        const snapshot = {
          profiles: data.profiles,
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
          count: data.profiles.length,
        };
        await dataCache.put(
          toAbsoluteUrl(OFFLINE_PROFILES_URL),
          createJsonResponse(snapshot, { 'X-TikaTrack-Cache': 'sw-data' }),
        );
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true, count: snapshot.count });
        }
      })(),
    );
    return;
  }

  if (data?.type === 'CLEAR_OFFLINE_DATA') {
    event.waitUntil(
      (async () => {
        await caches.delete(DATA_CACHE_NAME);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        }
      })(),
    );
    return;
  }

  if (data?.type === 'GET_OFFLINE_STATUS') {
    event.waitUntil(
      (async () => {
        const dataCache = await caches.open(DATA_CACHE_NAME);
        const [scheduleHit, profilesHit] = await Promise.all([
          dataCache.match(toAbsoluteUrl(OFFLINE_EPI_SCHEDULE_URL)),
          dataCache.match(toAbsoluteUrl(OFFLINE_PROFILES_URL)),
        ]);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            ok: true,
            hasSchedule: Boolean(scheduleHit),
            hasProfiles: Boolean(profilesHit),
          });
        }
      })(),
    );
    return;
  }

  if (data?.type === 'SHOW_LOCAL_NOTIFICATION' && data.title) {
    event.waitUntil(
      self.registration.showNotification(data.title, data.options || {}),
    );
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

function isEpiScheduleRequest(url) {
  const { pathname } = url;
  return (
    pathname === EPI_SCHEDULE_ASSET_URL ||
    pathname === EPI_SCHEDULE_API_URL ||
    pathname === OFFLINE_EPI_SCHEDULE_URL
  );
}

function isOfflineSnapshotRequest(url) {
  return (
    url.pathname === OFFLINE_PROFILES_URL || url.pathname === OFFLINE_EPI_SCHEDULE_URL
  );
}

function isProfilesApiRequest(url) {
  return url.pathname === FAMILY_PROFILES_API_URL;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (IS_DEV) {
    if (isOfflineSnapshotRequest(url)) {
      event.respondWith(serveOfflineSnapshot(request, url));
      return;
    }
    if (isEpiScheduleRequest(url)) {
      event.respondWith(networkFirstEpiSchedule(request, url));
      return;
    }
    if (isProfilesApiRequest(url)) {
      event.respondWith(networkFirstProfileApi(request));
      return;
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request, url));
    return;
  }

  if (isOfflineSnapshotRequest(url)) {
    event.respondWith(serveOfflineSnapshot(request, url));
    return;
  }

  if (isEpiScheduleRequest(url)) {
    event.respondWith(networkFirstEpiSchedule(request, url));
    return;
  }

  if (isProfilesApiRequest(url)) {
    event.respondWith(networkFirstProfileApi(request));
    return;
  }

  event.respondWith(asset(request, url));
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

async function serveOfflineSnapshot(request, url) {
  const dataCache = await caches.open(DATA_CACHE_NAME);
  const cached = (await dataCache.match(request)) || (await dataCache.match(url.href));
  if (cached) return cached;
  return createJsonResponse(
    url.pathname === OFFLINE_PROFILES_URL ? { profiles: [], count: 0 } : { milestones: [] },
    { 'X-TikaTrack-Cache': 'empty' },
  );
}

async function networkFirstEpiSchedule(request, url) {
  const dataCache = await caches.open(DATA_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await dataCache.put(request, response.clone());
      return response;
    }
  } catch {
    // Fall back to Service Worker cached EPI schedule when offline.
  }

  const fromDataCache =
    (await dataCache.match(request)) ||
    (await dataCache.match(toAbsoluteUrl(OFFLINE_EPI_SCHEDULE_URL))) ||
    (await dataCache.match(toAbsoluteUrl(EPI_SCHEDULE_ASSET_URL)));
  if (fromDataCache) return fromDataCache;

  const shellCache = await caches.open(CACHE_NAME);
  const fromShellCache =
    (await shellCache.match(request)) ||
    (await shellCache.match(toAbsoluteUrl(EPI_SCHEDULE_ASSET_URL))) ||
    (await shellCache.match(url.href));
  if (fromShellCache) return fromShellCache;

  return Response.error();
}

async function networkFirstProfileApi(request) {
  const dataCache = await caches.open(DATA_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await dataCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedApi = await dataCache.match(request);
    if (cachedApi) return cachedApi;
    const cachedSnapshot = await dataCache.match(toAbsoluteUrl(OFFLINE_PROFILES_URL));
    if (cachedSnapshot) return cachedSnapshot;
    return Response.error();
  }
}

/** Assets worth keeping: hashed bundles, icons and anything precached. */
function isCacheable(url) {
  const { pathname } = url;
  return (
    pathname.startsWith(`${BASE}assets/`) ||
    pathname.startsWith(`${BASE}icons/`) ||
    pathname === EPI_SCHEDULE_ASSET_URL ||
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

