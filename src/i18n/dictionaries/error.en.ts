/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'error.title': 'TikaTrack hit an unexpected error',
  'error.body':
    'Your saved records are still on this device. Reload the page, or go home and try again.',
  'error.reload': 'Reload',
  'error.home': 'Go home',
  'error.details': 'Error details',
  'error.boundary.title': 'This page hit an error',
  'error.boundary.body':
    'Your saved data is untouched — this is a rendering problem. Reloading usually fixes it.',
  'error.offline.title': 'You appear to be offline',
  'error.offline.body':
    'TikaTrack keeps working from what is already stored in this browser, but new lookups may fail.',
};
