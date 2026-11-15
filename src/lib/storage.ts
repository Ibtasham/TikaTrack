/**
 * localStorage helpers.
 *
 * Every read is defensive: corrupt or hand-edited data must never be able to
 * crash the app, and Safari private mode (where `setItem` throws) must degrade
 * to "nothing persisted" rather than a white screen.
 */

export const STORAGE_PREFIX = 'tikatrack.';

export const STORAGE_KEYS = {
  profiles: `${STORAGE_PREFIX}profiles`,
  theme: `${STORAGE_PREFIX}theme`,
  textSize: `${STORAGE_PREFIX}textSize`,
  language: `${STORAGE_PREFIX}language`,
  reminders: 'tikatrack-reminders',
  reminderPreferences: 'tikatrack-reminder-preferences',
  sentNotifications: 'tikatrack-sent-notifications',
  acknowledgedReminders: 'tikatrack-acknowledged-reminders',
  passports: `${STORAGE_PREFIX}passports`,
  compare: `${STORAGE_PREFIX}compare-selection`,
  onboardingDismissed: `${STORAGE_PREFIX}onboarding-dismissed`,
} as const;

/** Keys used by earlier TikaTrack versions, kept so upgrades do not lose data. */
export const LEGACY_STORAGE_KEYS = {
  profiles: 'tikatrack-profiles',
  theme: 'theme',
} as const;

function getStorage(): Storage | null {
  try {
    const probe = '__tikatrack_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** `true` when localStorage is usable. */
export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

/** Read + `JSON.parse` a key, returning `fallback` on any problem. */
export function readJSON<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] could not read "${key}"`, error);
    return fallback;
  }
}

/** `JSON.stringify` + write a key. Returns `false` when the write failed. */
export function writeJSON(key: string, value: unknown): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] could not write "${key}"`, error);
    return false;
  }
}

export function readString(key: string, fallback = ''): string {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* nothing we can do */
  }
}

/** Read a key, transparently migrating a legacy key when present. */
export function readJSONWithLegacy<T>(key: string, legacyKey: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    if (storage.getItem(key) !== null) return readJSON(key, fallback);
    if (storage.getItem(legacyKey) !== null) {
      const migrated = readJSON<T>(legacyKey, fallback);
      writeJSON(key, migrated);
      storage.removeItem(legacyKey);
      return migrated;
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

export function readStringWithLegacy(key: string, legacyKey: string, fallback = ''): string {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const current = storage.getItem(key);
    if (current !== null) return current;
    const legacy = storage.getItem(legacyKey);
    if (legacy !== null) {
      storage.setItem(key, legacy);
      storage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

/** Approximate bytes used by TikaTrack keys — shown on the Privacy page. */
export function estimateStorageUsage(): { bytes: number; keys: number } {
  const storage = getStorage();
  if (!storage) return { bytes: 0, keys: 0 };
  let bytes = 0;
  let keys = 0;
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith('tikatrack')) continue;
      keys += 1;
      bytes += key.length + (storage.getItem(key)?.length ?? 0);
    }
  } catch {
    /* ignore */
  }
  // UTF-16 in browsers => 2 bytes per char.
  return { bytes: bytes * 2, keys };
}

/** Delete every key TikaTrack owns. */
export function clearAllTikaTrackData(): number {
  const storage = getStorage();
  if (!storage) return 0;
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith('tikatrack')) doomed.push(key);
  }
  doomed.forEach((key) => storage.removeItem(key));
  return doomed.length;
}
