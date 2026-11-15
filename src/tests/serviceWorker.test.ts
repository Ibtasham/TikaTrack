import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyServiceWorkerUpdate,
  clearOfflineCache,
  formatBytes,
  getStorageEstimate,
  isServiceWorkerSupported,
  registerServiceWorker,
  serviceWorkerUrl,
  unregisterServiceWorker,
} from '../lib/serviceWorker';

/**
 * The worker lifecycle has to be exercised with fakes: jsdom implements neither
 * `navigator.serviceWorker` nor `caches`, and a real registration needs a
 * production build served over HTTP.
 */

interface FakeWorker {
  state: string;
  postMessage: ReturnType<typeof vi.fn>;
  listeners: Map<string, Array<(event: { target: FakeWorker }) => void>>;
  addEventListener: (type: string, handler: (event: { target: FakeWorker }) => void) => void;
  emitState: (state: string) => void;
}

function fakeWorker(state = 'installing'): FakeWorker {
  const listeners = new Map<string, Array<(event: { target: FakeWorker }) => void>>();
  const worker: FakeWorker = {
    state,
    postMessage: vi.fn(),
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    emitState(next) {
      worker.state = next;
      for (const handler of listeners.get('statechange') ?? []) handler({ target: worker });
    },
  };
  return worker;
}

interface FakeRegistration {
  waiting: FakeWorker | null;
  installing: FakeWorker | null;
  active: FakeWorker | null;
  addEventListener: (type: string, handler: () => void) => void;
  unregister: ReturnType<typeof vi.fn>;
  emit: (type: string) => void;
  listeners: Map<string, Array<() => void>>;
}

function fakeRegistration(init: Partial<FakeRegistration> = {}): FakeRegistration {
  const listeners = new Map<string, Array<() => void>>();
  return {
    waiting: null,
    installing: null,
    active: fakeWorker('activated'),
    unregister: vi.fn(async () => true),
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    emit(type) {
      for (const handler of listeners.get(type) ?? []) handler();
    },
    ...init,
  };
}

interface FakeCacheStorage {
  keys: () => Promise<string[]>;
  delete: (name: string) => Promise<boolean>;
  deleted: string[];
}

function installCacheStorage(names: string[]): FakeCacheStorage {
  const deleted: string[] = [];
  const storage = {
    keys: vi.fn(async () => names.filter((name) => !deleted.includes(name))),
    delete: vi.fn(async (name: string) => {
      deleted.push(name);
      return true;
    }),
    deleted,
  };
  Object.defineProperty(globalThis, 'caches', {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage as unknown as FakeCacheStorage;
}

function removeCacheStorage(): void {
  delete (globalThis as { caches?: unknown }).caches;
}

/** `controller` is null on a device that has never run the app before. */
function installServiceWorker(
  register: ReturnType<typeof vi.fn>,
  controller: unknown = null,
): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register, controller, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    configurable: true,
    writable: true,
  });
}

function removeServiceWorker(): void {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
}

beforeEach(() => {
  removeServiceWorker();
  removeCacheStorage();
  vi.unstubAllEnvs();
});

afterEach(() => {
  removeServiceWorker();
  removeCacheStorage();
  vi.useRealTimers();
});

describe('isServiceWorkerSupported', () => {
  it('is false without the API', () => {
    expect(isServiceWorkerSupported()).toBe(false);
  });

  it('is false when only one of worker/caches exists', () => {
    installServiceWorker(vi.fn());
    expect(isServiceWorkerSupported()).toBe(false);
    installCacheStorage([]);
    expect(isServiceWorkerSupported()).toBe(true);
  });
});

describe('serviceWorkerUrl', () => {
  it('is relative to the deploy base', () => {
    expect(serviceWorkerUrl()).toBe(`${import.meta.env.BASE_URL}sw.js`);
    vi.stubEnv('BASE_URL', '/tikatrack/');
    expect(serviceWorkerUrl()).toBe('/tikatrack/sw.js');
  });
});

describe('registerServiceWorker', () => {
  it('does nothing outside a production build', async () => {
    const register = vi.fn();
    installServiceWorker(register);
    installCacheStorage([]);

    await expect(registerServiceWorker({}, false)).resolves.toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser lacks the API', async () => {
    await expect(registerServiceWorker({}, true)).resolves.toBeNull();
  });

  it('registers under the deploy base and returns the registration', async () => {
    const registration = fakeRegistration();
    const register = vi.fn(async () => registration);
    installServiceWorker(register);
    installCacheStorage([]);

    await expect(registerServiceWorker({}, true)).resolves.toBe(registration);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('reports an update that was already waiting from a previous visit', async () => {
    const waiting = fakeWorker('installed');
    const registration = fakeRegistration({ waiting });
    // A controller means the page is already served by an older worker.
    installServiceWorker(
      vi.fn(async () => registration),
      {},
    );
    installCacheStorage([]);
    const onUpdateAvailable = vi.fn();

    await registerServiceWorker({ onUpdateAvailable }, true);

    expect(onUpdateAvailable).toHaveBeenCalledWith(registration);
  });

  it('reports a first install, then later updates, as the worker installs', async () => {
    const registration = fakeRegistration();
    installServiceWorker(vi.fn(async () => registration));
    installCacheStorage([]);
    const onInstalled = vi.fn();
    const onUpdateAvailable = vi.fn();

    await registerServiceWorker({ onInstalled, onUpdateAvailable }, true);

    // No controller yet: this device has never run TikaTrack before.
    const first = fakeWorker();
    registration.installing = first;
    registration.emit('updatefound');
    first.emitState('installed');
    expect(onInstalled).toHaveBeenCalledTimes(1);
    expect(onUpdateAvailable).not.toHaveBeenCalled();

    // Second visit: a controller exists, so an installed worker is an update.
    (navigator.serviceWorker as unknown as { controller: unknown }).controller = {};
    const second = fakeWorker();
    registration.installing = second;
    registration.emit('updatefound');
    second.emitState('installed');
    expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
    expect(onInstalled).toHaveBeenCalledTimes(1);
  });

  it('ignores intermediate worker states', async () => {
    const registration = fakeRegistration();
    installServiceWorker(vi.fn(async () => registration));
    installCacheStorage([]);
    const onInstalled = vi.fn();

    await registerServiceWorker({ onInstalled }, true);
    const worker = fakeWorker();
    registration.installing = worker;
    registration.emit('updatefound');
    worker.emitState('installing');
    worker.emitState('activating');

    expect(onInstalled).not.toHaveBeenCalled();
  });

  it('survives a registration failure and warns instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    installServiceWorker(vi.fn(async () => Promise.reject(new Error('blocked by policy'))));
    installCacheStorage([]);

    await expect(registerServiceWorker({}, true)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe('applyServiceWorkerUpdate', () => {
  it('is a no-op without a waiting worker', async () => {
    const reload = vi.fn();
    await expect(applyServiceWorkerUpdate(null, reload)).resolves.toBe(false);
    await expect(
      applyServiceWorkerUpdate(fakeRegistration() as unknown as ServiceWorkerRegistration, reload),
    ).resolves.toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('asks the worker to skip waiting and reloads once it takes control', async () => {
    const waiting = fakeWorker('installed');
    const registration = fakeRegistration({ waiting });
    // A holder object, because TypeScript cannot see an assignment that happens
    // inside the listener and would narrow the variable to `null`.
    const controllerEvents: { onChange: (() => void) | null } = { onChange: null };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: (_type: string, handler: () => void) => {
          controllerEvents.onChange = handler;
        },
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
    const reload = vi.fn();

    const apply = applyServiceWorkerUpdate(
      registration as unknown as ServiceWorkerRegistration,
      reload,
    );
    await Promise.resolve();
    expect(waiting.postMessage).toHaveBeenCalledWith('SKIP_WAITING');
    expect(reload).not.toHaveBeenCalled();

    controllerEvents.onChange?.();
    await expect(apply).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway when the controller never changes', async () => {
    vi.useFakeTimers();
    const waiting = fakeWorker('installed');
    const registration = fakeRegistration({ waiting });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true,
      writable: true,
    });
    const reload = vi.fn();

    const apply = applyServiceWorkerUpdate(
      registration as unknown as ServiceWorkerRegistration,
      reload,
    );
    await vi.advanceTimersByTimeAsync(5000);

    await expect(apply).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('clearOfflineCache', () => {
  it('deletes only caches this app owns and reports how many', async () => {
    const storage = installCacheStorage(['tikatrack-v1', 'tikatrack-v2', 'other-app-v9']);

    await expect(clearOfflineCache()).resolves.toBe(2);
    expect(storage.deleted.sort()).toEqual(['tikatrack-v1', 'tikatrack-v2']);
  });

  it('is a no-op without the Cache Storage API', async () => {
    await expect(clearOfflineCache()).resolves.toBe(0);
  });

  it('swallows errors from a blocked cache', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(globalThis, 'caches', {
      value: {
        keys: () => Promise.reject(new Error('denied')),
      },
      configurable: true,
      writable: true,
    });

    await expect(clearOfflineCache()).resolves.toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});

describe('unregisterServiceWorker', () => {
  it('unregisters every worker and clears the caches', async () => {
    const registration = fakeRegistration();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: vi.fn(async () => [registration]) },
      configurable: true,
      writable: true,
    });
    const storage = installCacheStorage(['tikatrack-v1']);

    await expect(unregisterServiceWorker()).resolves.toBe(true);
    expect(registration.unregister).toHaveBeenCalledTimes(1);
    expect(storage.deleted).toEqual(['tikatrack-v1']);
  });

  it('still clears caches when the API is missing', async () => {
    const storage = installCacheStorage(['tikatrack-v1']);
    await expect(unregisterServiceWorker()).resolves.toBe(false);
    expect(storage.deleted).toEqual(['tikatrack-v1']);
  });

  it('reports false when unregistering fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: () => Promise.reject(new Error('nope')) },
      configurable: true,
      writable: true,
    });
    installCacheStorage([]);

    await expect(unregisterServiceWorker()).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('getStorageEstimate', () => {
  it('returns usage and quota', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: async () => ({ usage: 1_500_000, quota: 60_000_000 }) },
      configurable: true,
      writable: true,
    });

    await expect(getStorageEstimate()).resolves.toEqual({ usage: 1_500_000, quota: 60_000_000 });
  });

  it('is null when the browser will not say', async () => {
    Object.defineProperty(navigator, 'storage', { value: {}, configurable: true, writable: true });
    await expect(getStorageEstimate()).resolves.toBeNull();
  });

  it('is null when usage is missing or the call throws', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: async () => ({ quota: 1 }) },
      configurable: true,
      writable: true,
    });
    await expect(getStorageEstimate()).resolves.toBeNull();

    Object.defineProperty(navigator, 'storage', {
      value: { estimate: () => Promise.reject(new Error('blocked')) },
      configurable: true,
      writable: true,
    });
    await expect(getStorageEstimate()).resolves.toBeNull();
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [-5, '0 B'],
    [Number.NaN, '0 B'],
    [512, '512 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [20 * 1024, '20 KB'],
    [3 * 1024 * 1024, '3.0 MB'],
    [2 * 1024 * 1024 * 1024, '2.0 GB'],
  ])('formats %s as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
