import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  detectBiometricSupport,
  getVaultSessionSnapshot,
  subscribeVaultSession,
  type BiometricSupportInfo,
  type VaultSessionSnapshot,
} from '../lib/biometricLock';
import {
  getLocalNotificationSnapshot,
  subscribeLocalNotifications,
  type LocalNotificationSnapshot,
} from '../lib/localNotifications';
import {
  applyServiceWorkerUpdate,
  ensureOfflineDataServiceWorker,
  registerServiceWorker,
} from '../lib/serviceWorker';
import { readJSON, writeJSON } from '../lib/storage';

/**
 * `useState` that mirrors itself into localStorage.
 *
 * Reads are resilient to corrupt data (falls back to `initialValue`) and writes
 * never throw when storage is unavailable.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const stored = readJSON<T | null>(key, null);
    if (stored === null) return initialValue;
    if (validate && !validate(stored)) return initialValue;
    return stored;
  });

  useEffect(() => {
    writeJSON(key, state);
  }, [key, state]);

  return [state, setState];
}

/** Debounce a fast-changing value (search boxes). */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Track a media query, e.g. `(min-width: 1024px)`. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Escape-key handler, used by every modal so keyboard users can always get out.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler.current();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [active]);
}

/**
 * Lock body scrolling while a modal is open and restore the previous value.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/**
 * Announce a message to screen readers via a polite live region.
 *
 * Returns the element props to spread onto a visually-hidden container.
 */
export function useLiveAnnouncer() {
  const [message, setMessage] = useState('');
  const announce = useCallback((next: string) => {
    setMessage('');
    // Resetting first guarantees repeated identical messages are still read out.
    requestAnimationFrame(() => setMessage(next));
  }, []);

  return {
    announce,
    liveRegionProps: {
      role: 'status' as const,
      'aria-live': 'polite' as const,
      'aria-atomic': true as const,
      className: 'sr-only',
      children: message,
    },
  };
}

/** Simple interval that pauses when the tab is hidden. */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      saved.current();
    }, delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

/** `true` while the browser has a network connection. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

/**
 * The Chromium "install this site" prompt, deferred so the app decides when to
 * show it (a prompt that appears before the user has recorded a single dose is
 * just noise). `canInstall` stays `false` on browsers without the event — iOS
 * Safari, Firefox — where the UI falls back to "use your browser's Share menu".
 */
export interface InstallPromptState {
  canInstall: boolean;
  /** `true` once the app has been installed (or the page is running installed). */
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(display-mode: standalone)').matches === true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      return outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
      return 'unavailable';
    }
  }, [deferred]);

  return { canInstall: deferred !== null, installed, promptInstall };
}

export interface ServiceWorkerState {
  /** `true` once the shell has been cached and the app works offline. */
  offlineReady: boolean;
  /** `true` when a newer build is waiting to take over. */
  updateAvailable: boolean;
  /** Activate the waiting worker and reload. */
  applyUpdate: () => Promise<boolean>;
}

/**
 * Registers the service worker once and surfaces its lifecycle to the UI.
 *
 * Mounted from `Layout`, so it runs on every page but only in production builds
 * (see `registerServiceWorker`).
 */
export function useServiceWorkerUpdate(
  enabled: boolean = import.meta.env.PROD,
  onUpdate?: () => void,
): ServiceWorkerState {
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const started = useRef(false);
  const notify = useRef(onUpdate);
  notify.current = onUpdate;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void registerServiceWorker(
      {
        onInstalled: () => setOfflineReady(true),
        onUpdateAvailable: (next) => {
          registration.current = next;
          setUpdateAvailable(true);
          notify.current?.();
        },
      },
      enabled,
    ).then((next) => {
      if (next) registration.current = next;
    });

    if (!enabled && import.meta.env.MODE !== 'test') {
      void ensureOfflineDataServiceWorker();
    }
  }, [enabled]);

  const applyUpdate = useCallback(async () => {
    const applied = await applyServiceWorkerUpdate(registration.current);
    if (applied) setUpdateAvailable(false);
    return applied;
  }, []);

  return { offlineReady, updateAvailable, applyUpdate };
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  );
}

export interface FocusTrapOptions {
  /** Called on Escape. */
  onEscape?: () => void;
  /** Called on a pointer-down outside the container — for popovers and menus. */
  onOutsideClick?: () => void;
  /** Move focus into the container on open (default `true`). */
  autoFocus?: boolean;
}

/**
 * Keep Tab focus inside a dialog while it is open, and give it back to whatever
 * had focus before.
 *
 * Without this, a keyboard user tabbing through `VaccineModal` walks off into
 * the page *behind* the overlay — they can activate controls they cannot see.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  options: FocusTrapOptions = {},
) {
  const container = useRef<T>(null);
  const restoreTo = useRef<Element | null>(null);
  const callbacks = useRef(options);
  callbacks.current = options;

  useEffect(() => {
    if (!active) return;
    const node = container.current;
    if (!node) return;

    restoreTo.current = document.activeElement;

    // `tabIndex` makes the container itself focusable, so a dialog with no
    // controls still traps focus instead of letting it escape to the document.
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');

    if (callbacks.current.autoFocus !== false) {
      const targets = focusableWithin(node);
      (targets[0] ?? node).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        callbacks.current.onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const targets = focusableWithin(node);
      if (targets.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = targets[0];
      const last = targets[targets.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !node.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!callbacks.current.onOutsideClick) return;
      if (!node.contains(event.target as Node)) callbacks.current.onOutsideClick();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      const previous = restoreTo.current;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [active]);

  return container;
}

/**
 * Reactive subscription to the client-side WebAuthn / PIN biometric passport vault
 * and hardware capability detection.
 */
export function useBiometricVaultState(): {
  snapshot: VaultSessionSnapshot;
  support: BiometricSupportInfo | null;
} {
  const [snapshot, setSnapshot] = useState<VaultSessionSnapshot>(() =>
    getVaultSessionSnapshot(),
  );
  const [support, setSupport] = useState<BiometricSupportInfo | null>(null);

  useEffect(() => {
    setSnapshot(getVaultSessionSnapshot());
    const unsub = subscribeVaultSession(() => {
      setSnapshot(getVaultSessionSnapshot());
    });
    let cancelled = false;
    void detectBiometricSupport().then((info) => {
      if (!cancelled) setSupport(info);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { snapshot, support };
}

/**
 * Reactive subscription to the offline Local Notification scheduler queue & state.
 */
export function useLocalNotifications(): LocalNotificationSnapshot {
  return useSyncExternalStore(
    subscribeLocalNotifications,
    getLocalNotificationSnapshot,
    getLocalNotificationSnapshot,
  );
}
