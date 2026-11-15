import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllTikaTrackData,
  estimateStorageUsage,
  isStorageAvailable,
  LEGACY_STORAGE_KEYS,
  readJSON,
  readJSONWithLegacy,
  readString,
  readStringWithLegacy,
  removeKey,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  writeJSON,
  writeString,
} from '../lib/storage';

/** A localStorage that throws on every access, like Safari private browsing. */
function simulateUnavailableStorage() {
  const denied = () => {
    throw new Error('storage denied');
  };
  vi.stubGlobal('localStorage', {
    getItem: denied,
    setItem: denied,
    removeItem: denied,
    clear: denied,
    key: denied,
    length: 0,
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('key namespacing', () => {
  it('prefixes every modern key with tikatrack', () => {
    expect(STORAGE_PREFIX).toBe('tikatrack.');
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('tikatrack')).toBe(true);
    }
  });

  it('keeps the pre-2.0 keys so upgrades can migrate them', () => {
    // These are exactly the keys the original app wrote.
    expect(LEGACY_STORAGE_KEYS).toEqual({ profiles: 'tikatrack-profiles', theme: 'theme' });
  });

  it('has distinct keys', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('read/write JSON', () => {
  // Corrupt-data tests warn deliberately; keep the test output readable.
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('round-trips structured data', () => {
    const value = { a: 1, list: [1, 2, 3], nested: { ok: true } };
    expect(writeJSON(STORAGE_KEYS.profiles, value)).toBe(true);
    expect(readJSON(STORAGE_KEYS.profiles, null)).toEqual(value);
  });

  it('returns the fallback for a missing key', () => {
    expect(readJSON('tikatrack.nope', ['fallback'])).toEqual(['fallback']);
  });

  it('returns the fallback and warns on corrupt JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEYS.profiles, '{ this is not json');

    expect(readJSON(STORAGE_KEYS.profiles, [])).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('stores null and false faithfully', () => {
    writeJSON('tikatrack.flag', false);
    expect(readJSON('tikatrack.flag', true)).toBe(false);

    writeJSON('tikatrack.nothing', null);
    expect(readJSON('tikatrack.nothing', 'default')).toBeNull();
  });
});

describe('read/write strings', () => {
  it('round-trips and removes', () => {
    expect(writeString(STORAGE_KEYS.theme, 'dark')).toBe(true);
    expect(readString(STORAGE_KEYS.theme)).toBe('dark');

    removeKey(STORAGE_KEYS.theme);
    expect(readString(STORAGE_KEYS.theme, 'light')).toBe('light');
  });
});

describe('legacy key migration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('moves a legacy JSON value into the namespaced key', () => {
    const profiles = [{ id: 'p1', name: 'Ayesha' }];
    localStorage.setItem(LEGACY_STORAGE_KEYS.profiles, JSON.stringify(profiles));

    expect(readJSONWithLegacy(STORAGE_KEYS.profiles, LEGACY_STORAGE_KEYS.profiles, [])).toEqual(
      profiles,
    );
    // Migrated, and the old key cleaned up.
    expect(localStorage.getItem(STORAGE_KEYS.profiles)).toBe(JSON.stringify(profiles));
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.profiles)).toBeNull();
  });

  it('prefers the modern key when both exist', () => {
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify([{ id: 'new' }]));
    localStorage.setItem(LEGACY_STORAGE_KEYS.profiles, JSON.stringify([{ id: 'old' }]));

    expect(readJSONWithLegacy(STORAGE_KEYS.profiles, LEGACY_STORAGE_KEYS.profiles, [])).toEqual([
      { id: 'new' },
    ]);
  });

  it('falls back when neither key exists', () => {
    expect(readJSONWithLegacy(STORAGE_KEYS.profiles, LEGACY_STORAGE_KEYS.profiles, [])).toEqual([]);
  });

  it('migrates a legacy string value (the old "theme" key)', () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.theme, 'dark');

    expect(readStringWithLegacy(STORAGE_KEYS.theme, LEGACY_STORAGE_KEYS.theme)).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.theme)).toBeNull();
  });

  it('returns the fallback when a legacy value is corrupt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(LEGACY_STORAGE_KEYS.profiles, 'not json');
    expect(readJSONWithLegacy(STORAGE_KEYS.profiles, LEGACY_STORAGE_KEYS.profiles, [])).toEqual([]);
  });
});

describe('estimateStorageUsage', () => {
  it('counts only TikaTrack keys, in UTF-16 bytes', () => {
    localStorage.setItem('tikatrack.a', '1234'); // 11 + 4 characters
    localStorage.setItem('tikatrack.b', 'xy'); // 11 + 2 characters
    localStorage.setItem('some-other-app', 'ignored');

    const usage = estimateStorageUsage();
    expect(usage.keys).toBe(2);
    expect(usage.bytes).toBe(('tikatrack.a'.length + 4 + 'tikatrack.b'.length + 2) * 2);
  });

  it('reports zero on empty storage', () => {
    expect(estimateStorageUsage()).toEqual({ bytes: 0, keys: 0 });
  });
});

describe('clearAllTikaTrackData', () => {
  it('removes every TikaTrack key and nothing else', () => {
    localStorage.setItem('tikatrack.profiles', '[]');
    localStorage.setItem('tikatrack-reminders', '[]'); // legacy-style key, still ours
    localStorage.setItem('other-app', 'keep me');

    expect(clearAllTikaTrackData()).toBe(2);
    expect(localStorage.getItem('other-app')).toBe('keep me');
    expect(localStorage.getItem('tikatrack.profiles')).toBeNull();
  });

  it('returns 0 when there is nothing to clear', () => {
    expect(clearAllTikaTrackData()).toBe(0);
  });
});

describe('when storage is unavailable', () => {
  beforeEach(() => {
    simulateUnavailableStorage();
  });

  it('reports unavailability instead of throwing', () => {
    expect(isStorageAvailable()).toBe(false);
  });

  it('degrades every read to its fallback', () => {
    expect(readJSON('tikatrack.profiles', [])).toEqual([]);
    expect(readString('tikatrack.theme', 'light')).toBe('light');
    expect(readJSONWithLegacy('tikatrack.profiles', 'tikatrack-profiles', [])).toEqual([]);
    expect(readStringWithLegacy('tikatrack.theme', 'theme', 'light')).toBe('light');
    expect(estimateStorageUsage()).toEqual({ bytes: 0, keys: 0 });
    expect(clearAllTikaTrackData()).toBe(0);
  });

  it('reports failed writes rather than throwing', () => {
    expect(writeJSON('tikatrack.profiles', [])).toBe(false);
    expect(writeString('tikatrack.theme', 'dark')).toBe(false);
    expect(() => removeKey('tikatrack.theme')).not.toThrow();
  });
});

describe('isStorageAvailable', () => {
  it('is true in a normal browser-like environment', () => {
    expect(isStorageAvailable()).toBe(true);
  });
});
