import type { Language } from './types';

export const LANGUAGE_STORAGE_KEY = 'tikatrack.language';

/** Type guard for values coming from storage or the URL. */
export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'bn';
}

/**
 * Resolve the language to start with: stored preference first, then the
 * browser's `Accept-Language` style list, then English.
 */
export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    /* ignore */
  }

  if (typeof navigator !== 'undefined') {
    for (const candidate of navigator.languages ?? [navigator.language]) {
      const code = candidate.toLowerCase().split('-')[0];
      if (code === 'bn') return 'bn';
      if (code === 'en') return 'en';
    }
  }

  return 'en';
}
