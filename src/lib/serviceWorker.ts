/**
 * Service-worker registration and lifecycle helpers.
 *
 * The worker itself is generated at build time (`sw.template.js` → `dist/sw.js`)
 * so it can precache the exact hashed asset list of the build it shipped with.
 *
 * Two rules shape this module:
 *
 *  1. **Opt-in by environment.** Registration only happens in a production
 *     build, so `npm run dev` never serves a cached page over live edits.
 *  2. **Never throw.** A blocked service worker (Firefox private mode, an
 *     enterprise policy, a host that serves `sw.js` with the wrong MIME type)
 *     must degrade to "the app works, just not offline" — never to a white
 *     screen. Every entry point returns a nullable result and logs a warning.
 */

export interface ServiceWorkerHooks {
  /** First install on this device: the app shell is now available offline. */
  onInstalled?: () => void;
  /** A newer build finished installing and is waiting to take over. */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}

/** `true` when the browser can run a worker *and* the Cache Storage API. */
export function isServiceWorkerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'caches' in window
  );
}

/** Absolute URL of the generated worker, respecting the deploy base. */
export function serviceWorkerUrl(): string {
  return `${import.meta.env.BASE_URL}sw.js`;
}

/**
 * Register the worker and report lifecycle events.
 *
 * Returns the registration, or `null` when it was skipped (non-production,
 * unsupported browser) or failed.
 */
export async function registerServiceWorker(
  hooks: ServiceWorkerHooks = {},
  enabled: boolean = import.meta.env.PROD,
): Promise<ServiceWorkerRegistration | null> {
  if (!enabled || !isServiceWorkerSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
      scope: import.meta.env.BASE_URL,
    });

    // A worker from a previous visit may already be waiting.
    if (registration.waiting && navigator.serviceWorker.controller) {
      hooks.onUpdateAvailable?.(registration);
    }

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;
        // `controller` is null on the very first install: nothing to update from.
        if (navigator.serviceWorker.controller) hooks.onUpdateAvailable?.(registration);
        else hooks.onInstalled?.();
      });
    });

    return registration;
  } catch (error) {
    console.warn('[sw] registration failed — continuing without offline support', error);
    return null;
  }
}

/**
 * Ask the waiting worker to take over and reload once it controls the page.
 *
 * Resolves `true` when the reload was triggered. A 5 s watchdog covers hosts
 * where `controllerchange` never fires (e.g. the worker was already active).
 */
export async function applyServiceWorkerUpdate(
  registration: ServiceWorkerRegistration | null,
  reload: () => void = () => window.location.reload(),
): Promise<boolean> {
  const waiting = registration?.waiting;
  if (!waiting) return false;

  const controllerChanged = new Promise<boolean>((resolve) => {
    const onChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    setTimeout(() => resolve(false), 5000);
  });

  waiting.postMessage('SKIP_WAITING');
  await controllerChanged;
  reload();
  return true;
}

/**
 * Delete every cache this app owns. Used by the privacy page so "remove my data
 * from this device" really means all of it, offline copies included.
 */
export async function clearOfflineCache(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const keys = await caches.keys();
    const ours = keys.filter((key) => key.startsWith('tikatrack-'));
    await Promise.all(ours.map((key) => caches.delete(key)));
    return ours.length;
  } catch (error) {
    console.warn('[sw] could not clear caches', error);
    return 0;
  }
}

/** Unregister the worker and drop its caches. */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    await clearOfflineCache();
    return false;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(registrations.map((entry) => entry.unregister()));
    await clearOfflineCache();
    return results.some(Boolean);
  } catch (error) {
    console.warn('[sw] could not unregister', error);
    return false;
  }
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

/** How much space the browser says this origin is using, when it will tell us. */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== 'number') return null;
    return { usage, quota: typeof quota === 'number' ? quota : 0 };
  } catch {
    return null;
  }
}

/** Human-readable byte size, used by the privacy page. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
