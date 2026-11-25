import { beforeEach, describe, expect, it, vi } from 'vitest';

// Vite's `?raw` import: the template as text, exactly as the build plugin reads it.
import swTemplate from '../../sw.template.js?raw';

/**
 * The generated `dist/sw.js` is the thing that decides whether TikaTrack really
 * works offline, so the template is executed here against a minimal fake
 * ServiceWorker global: install, activate, message and fetch are all driven the
 * way a browser drives them.
 *
 * The fakes mirror the two behaviours the worker relies on:
 *   - a `Cache` keys entries by *absolute* URL, so `cache.add('/index.html')`
 *     and `cache.match('https://host/index.html')` agree;
 *   - `fetch` rejects (rather than resolving with an error response) when the
 *     network is gone.
 */

const ORIGIN = 'https://tikatrack.test';

interface FakeResponse {
  ok: boolean;
  status: number;
  body: string;
  type: 'basic' | 'error';
  clone(): FakeResponse;
}

function makeResponse(body: string, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    body,
    type: 'basic',
    clone() {
      return makeResponse(body, status);
    },
  };
}

const ERROR_RESPONSE: FakeResponse = {
  ok: false,
  status: 0,
  body: '',
  type: 'error',
  clone: () => ERROR_RESPONSE,
};

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}

function request(url: string, init: Partial<FakeRequest> = {}): FakeRequest {
  return {
    url: url.startsWith('http') ? url : `${ORIGIN}${url}`,
    method: init.method ?? 'GET',
    mode: init.mode ?? 'no-cors',
  };
}

function absolute(url: string): string {
  return url.startsWith('http') ? url : new URL(url, ORIGIN).href;
}

class FakeCache {
  readonly entries = new Map<string, FakeResponse>();

  constructor(private readonly loader: (target: string | FakeRequest) => Promise<FakeResponse>) {}

  async add(url: string): Promise<void> {
    const key = absolute(url);
    const response = await this.loader(key);
    // `Cache.add` rejects on a non-OK response, which is how the worker learns
    // an optional asset is missing.
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
    this.entries.set(key, response);
  }

  async put(req: FakeRequest | string, response: FakeResponse): Promise<void> {
    this.entries.set(absolute(typeof req === 'string' ? req : req.url), response);
  }

  async match(req: FakeRequest | string): Promise<FakeResponse | undefined> {
    return this.entries.get(absolute(typeof req === 'string' ? req : req.url));
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();

  constructor(private readonly loader: (target: string | FakeRequest) => Promise<FakeResponse>) {}

  async open(name: string): Promise<FakeCache> {
    const existing = this.caches.get(name);
    if (existing) return existing;
    const created = new FakeCache(this.loader);
    this.caches.set(name, created);
    return created;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

interface HarnessOptions {
  base?: string;
  precache?: string[];
  /** Path -> response for the fake network. Missing paths 404. */
  routes?: Record<string, FakeResponse>;
  online?: boolean;
}

interface Harness {
  fire: (type: string, init?: { request?: FakeRequest; data?: unknown }) => Promise<unknown>;
  /** Outcome of every `waitUntil` promise from the most recent event. */
  settled: Array<PromiseSettledResult<unknown>>;
  respondWith: ReturnType<typeof vi.fn>;
  pending: () => Promise<void>;
  storage: FakeCacheStorage;
  cacheName: string;
  skipWaiting: ReturnType<typeof vi.fn>;
  claim: ReturnType<typeof vi.fn>;
  fetches: string[];
  setOnline: (online: boolean) => void;
  activeCache: () => Promise<FakeCache>;
  warnings: unknown[][];
}

function createHarness(options: HarnessOptions = {}): Harness {
  const base = options.base ?? '/';
  const precache = (options.precache ?? ['/index.html', '/assets/app-1.js']).map(
    (path) => `${base}${path.replace(/^\//, '')}`,
  );
  const source = swTemplate
    .split('{{CACHE_NAME}}')
    .join('tikatrack-vTEST')
    .split('{{BASE}}')
    .join(base)
    .replace(/\/\* \{\{PRECACHE\}\} \*\/ \[\]/, `/* {{PRECACHE}} */ ${JSON.stringify(precache)}`);

  // A realistic shell: the SPA entry plus one hashed asset. Individual tests
  // override or extend it.
  const defaults: Record<string, FakeResponse> = {
    [`${base}index.html`]: makeResponse('<!doctype html><div id="root"></div>'),
    [`${base}assets/app-1.js`]: makeResponse('console.log("app")'),
  };
  const routes = new Map<string, FakeResponse>(
    Object.entries({ ...defaults, ...options.routes }).map(([path, value]) => [
      absolute(path),
      value,
    ]),
  );
  let online = options.online ?? true;
  const fetches: string[] = [];

  /** The worker calls `fetch(request)`; the cache calls `cache.add(url)`. */
  const loader = async (target: string | FakeRequest): Promise<FakeResponse> => {
    const url = absolute(typeof target === 'string' ? target : target.url);
    fetches.push(url);
    if (!online) throw new Error('offline');
    return routes.get(url) ?? makeResponse(`missing:${url}`, 404);
  };

  const storage = new FakeCacheStorage(loader);
  const listeners = new Map<string, Array<(event: never) => void>>();
  const respondWith = vi.fn();
  const pending: Array<Promise<unknown>> = [];
  const skipWaiting = vi.fn(async () => undefined);
  const claim = vi.fn(async () => undefined);
  const warnings: unknown[][] = [];

  const selfStub = {
    location: new URL(base, ORIGIN),
    addEventListener(type: string, handler: (event: never) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    skipWaiting,
    clients: { claim },
  };

  const run = new Function(
    'self',
    'caches',
    'clients',
    'fetch',
    'Response',
    'console',
    `${source}\n//# sourceURL=sw.template.js`,
  ) as (...args: unknown[]) => void;

  run(
    selfStub,
    storage,
    selfStub.clients,
    loader,
    { error: () => ERROR_RESPONSE },
    { warn: (...args: unknown[]) => warnings.push(args) },
  );

  const fire = async (type: string, init: { request?: FakeRequest; data?: unknown } = {}) => {
    const event = {
      request: init.request,
      data: init.data,
      respondWith,
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(promise);
      },
    };
    for (const handler of listeners.get(type) ?? []) handler(event as never);
    harness.settled = await Promise.allSettled(pending.splice(0));
    if (respondWith.mock.calls.length === 0) return undefined;
    const last = respondWith.mock.calls[respondWith.mock.calls.length - 1][0];
    return last;
  };

  const harness: Harness = {
    settled: [],
    fire,
    respondWith,
    pending: async () => {
      await Promise.allSettled(pending.splice(0));
    },
    storage,
    cacheName: 'tikatrack-vTEST',
    skipWaiting,
    claim,
    fetches,
    setOnline: (next: boolean) => {
      online = next;
    },
    activeCache: () => storage.open('tikatrack-vTEST'),
    warnings,
  };
  return harness;
}

/** A worker that has already installed and activated. */
async function installedHarness(options: HarnessOptions = {}): Promise<Harness> {
  const harness = createHarness(options);
  await harness.fire('install');
  await harness.fire('activate');
  harness.fetches.length = 0;
  harness.respondWith.mockClear();
  harness.skipWaiting.mockClear();
  harness.claim.mockClear();
  return harness;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('service worker: install', () => {
  it('precaches every shell URL into a build-scoped cache', async () => {
    const harness = createHarness();
    await harness.fire('install');

    const cache = await harness.activeCache();
    expect([...cache.entries.keys()].sort()).toEqual([
      `${ORIGIN}/assets/app-1.js`,
      `${ORIGIN}/index.html`,
    ]);
    expect(await harness.storage.keys()).toEqual(['tikatrack-vTEST']);
  });

  it('waits after caching the shell so active user sessions are not interrupted', async () => {
    const harness = createHarness();
    await harness.fire('install');
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });

  it('aborts the install when the SPA shell itself cannot be cached', async () => {
    const harness = createHarness({ online: false });
    await harness.fire('install');

    // `waitUntil` rejected, so the browser keeps the previous worker.
    expect(harness.settled[0].status).toBe('rejected');
    expect(harness.skipWaiting).not.toHaveBeenCalled();
    expect(harness.warnings.flat().join(' ')).toContain('not precached');
  });

  it('still installs when an optional asset 404s, and says which one', async () => {
    const harness = createHarness({
      precache: ['/index.html', '/icons/missing.png'],
      routes: { '/index.html': makeResponse('shell') },
    });
    await harness.fire('install');

    expect(harness.skipWaiting).not.toHaveBeenCalled();
    expect(harness.warnings.flat().join(' ')).toContain('/icons/missing.png');
  });
});

describe('service worker: activate', () => {
  it('drops caches from previous builds but leaves other origins alone', async () => {
    const harness = createHarness();
    await harness.storage.open('tikatrack-vOLD');
    await harness.storage.open('some-other-app-v1');
    await harness.fire('activate');

    // The stale build cache is gone; a cache belonging to another app is not
    // this worker's business.
    expect(await harness.storage.keys()).toEqual(['some-other-app-v1']);
    expect(harness.claim).toHaveBeenCalledTimes(1);
  });
});

describe('service worker: messages', () => {
  it('skips waiting when the page asks for the update', async () => {
    const harness = createHarness();
    await harness.fire('message', { data: 'SKIP_WAITING' });
    await harness.fire('message', { data: { type: 'SKIP_WAITING' } });
    expect(harness.skipWaiting).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated messages', async () => {
    const harness = createHarness();
    await harness.fire('message', { data: { type: 'ping' } });
    expect(harness.skipWaiting).not.toHaveBeenCalled();
  });
});

describe('service worker: navigation', () => {
  it('goes to the network while online', async () => {
    const harness = await installedHarness({
      routes: { '/tracker': makeResponse('live page') },
    });

    const result = (await harness.fire('fetch', {
      request: request('/tracker', { mode: 'navigate' }),
    })) as FakeResponse;

    expect(result.body).toBe('live page');
    expect(harness.fetches).toContain(`${ORIGIN}/tracker`);
  });

  it('serves the cached shell when the host has no rewrite rules (404 deep link)', async () => {
    const harness = await installedHarness();

    const result = (await harness.fire('fetch', {
      request: request('/tracker', { mode: 'navigate' }),
    })) as FakeResponse;

    expect(result.body).toContain('id="root"');
  });

  it('serves the cached shell when the network is gone', async () => {
    const harness = await installedHarness();
    harness.setOnline(false);

    const result = (await harness.fire('fetch', {
      request: request('/vaccines/bcg', { mode: 'navigate' }),
    })) as FakeResponse;

    expect(result.body).toContain('id="root"');
  });

  it('returns a network error when offline with nothing cached', async () => {
    const harness = createHarness({ online: false });
    const result = (await harness.fire('fetch', {
      request: request('/', { mode: 'navigate' }),
    })) as FakeResponse;

    expect(result.type).toBe('error');
  });
});

describe('service worker: assets', () => {
  it('serves a precached asset without touching the network', async () => {
    const harness = await installedHarness();

    const result = (await harness.fire('fetch', {
      request: request('/assets/app-1.js'),
    })) as FakeResponse;

    expect(result.body).toBe('console.log("app")');
    expect(harness.fetches).toEqual([]);
  });

  it('fills the cache from the network on a miss, then serves from cache', async () => {
    const harness = await installedHarness({
      routes: { '/assets/lazy-2.js': makeResponse('lazy chunk') },
    });

    const first = (await harness.fire('fetch', {
      request: request('/assets/lazy-2.js'),
    })) as FakeResponse;
    const second = (await harness.fire('fetch', {
      request: request('/assets/lazy-2.js'),
    })) as FakeResponse;

    expect(first.body).toBe('lazy chunk');
    expect(second.body).toBe('lazy chunk');
    expect(harness.fetches).toEqual([`${ORIGIN}/assets/lazy-2.js`]);
  });

  it('does not cache files outside the app shell', async () => {
    const harness = await installedHarness({
      routes: { '/random.txt': makeResponse('hello') },
    });

    await harness.fire('fetch', { request: request('/random.txt') });
    const cache = await harness.activeCache();
    expect(cache.entries.has(`${ORIGIN}/random.txt`)).toBe(false);
  });

  it('does not cache error responses', async () => {
    const harness = await installedHarness({
      routes: { '/assets/gone.js': makeResponse('nope', 500) },
    });

    await harness.fire('fetch', { request: request('/assets/gone.js') });
    const cache = await harness.activeCache();
    expect(cache.entries.has(`${ORIGIN}/assets/gone.js`)).toBe(false);
  });
});

describe('service worker: request filtering', () => {
  it('never intercepts cross-origin requests (e.g. Supabase)', async () => {
    const harness = await installedHarness();

    await harness.fire('fetch', { request: request('https://project.supabase.co/rest/v1/doses') });

    expect(harness.respondWith).not.toHaveBeenCalled();
  });

  it('never intercepts writes', async () => {
    const harness = await installedHarness();

    await harness.fire('fetch', { request: request('/sync', { method: 'POST' }) });

    expect(harness.respondWith).not.toHaveBeenCalled();
  });
});

describe('service worker: sub-path deploy', () => {
  it('precaches, falls back and caches relative to the base', async () => {
    const harness = await installedHarness({ base: '/tikatrack/' });
    const cache = await harness.activeCache();
    expect([...cache.entries.keys()].sort()).toEqual([
      `${ORIGIN}/tikatrack/assets/app-1.js`,
      `${ORIGIN}/tikatrack/index.html`,
    ]);

    harness.setOnline(false);
    const result = (await harness.fire('fetch', {
      request: request('/tikatrack/tracker', { mode: 'navigate' }),
    })) as FakeResponse;
    expect(result.body).toContain('id="root"');
  });
});

describe('service worker: offline EPI schedule and user profile caching', () => {
  it('caches the national EPI schedule via message and serves /api/epi-schedule offline', async () => {
    const harness = await installedHarness();
    const payload = {
      version: 'bangladesh-epi-2026.1',
      milestones: [{ ageDays: 0, age: { en: 'At Birth', bn: 'জন্মের সময়' }, vaccines: [] }],
      vaccines: [{ id: 'bcg' }],
    };

    await harness.fire('message', {
      data: { type: 'CACHE_EPI_SCHEDULE', payload },
    });

    harness.setOnline(false);
    const apiResult = (await harness.fire('fetch', {
      request: request('/api/epi-schedule'),
    })) as FakeResponse;

    expect(apiResult.ok).toBe(true);
    expect(JSON.parse(apiResult.body).version).toBe('bangladesh-epi-2026.1');
  });

  it('caches user profile data via message and serves /api/family/profiles fallback offline', async () => {
    const harness = await installedHarness();
    const profiles = [
      { id: 'prof-1', name: 'Ayesha Rahman', dateOfBirth: '2025-09-01', events: [] },
    ];

    await harness.fire('message', {
      data: { type: 'CACHE_PROFILES', profiles, updatedAt: '2026-11-24T12:00:00.000Z' },
    });

    harness.setOnline(false);
    const snapshotResult = (await harness.fire('fetch', {
      request: request('/__offline/profiles.json'),
    })) as FakeResponse;
    expect(snapshotResult.ok).toBe(true);
    expect(JSON.parse(snapshotResult.body).profiles[0].name).toBe('Ayesha Rahman');

    const apiFallback = (await harness.fire('fetch', {
      request: request('/api/family/profiles'),
    })) as FakeResponse;
    expect(apiFallback.ok).toBe(true);
    expect(JSON.parse(apiFallback.body).profiles).toHaveLength(1);
  });

  it('preserves tikatrack-data-v1 across build updates on activate and clears it on CLEAR_OFFLINE_DATA', async () => {
    const harness = await installedHarness();
    await harness.storage.open('tikatrack-vOLD');
    await harness.fire('message', {
      data: { type: 'CACHE_PROFILES', profiles: [{ id: 'p1', name: 'Nora' }] },
    });

    await harness.fire('activate');
    const keysAfterActivate = await harness.storage.keys();
    expect(keysAfterActivate).toContain('tikatrack-data-v1');
    expect(keysAfterActivate).not.toContain('tikatrack-vOLD');

    await harness.fire('message', { data: { type: 'CLEAR_OFFLINE_DATA' } });
    expect(await harness.storage.keys()).not.toContain('tikatrack-data-v1');
  });
});

