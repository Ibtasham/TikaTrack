/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'confirm.deleteProfile.title': 'Delete this profile?',
  'confirm.deleteProfile.body':
    '“{0}” and all of their recorded doses will be removed from this device. This cannot be undone.',
  'confirm.delete.title': 'Are you sure?',
  'confirm.delete': 'Delete',
  'confirm.keep': 'Keep it',
};
