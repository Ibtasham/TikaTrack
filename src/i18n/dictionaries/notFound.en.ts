/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'notFound.title': 'Page not found',
  'notFound.body': 'That link does not exist. Try the vaccine library or go back home.',
  'notFound.home': 'Back to home',
  'notFound.vaccines': 'Browse vaccines',
  'notFound.subtitle': 'That page does not exist. It may have moved, or the link may be mistyped.',
  'notFound.suggestions': 'Or try one of these',
};
