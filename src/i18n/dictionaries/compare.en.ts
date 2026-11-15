/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'compare.title': 'Compare vaccines',
  'compare.subtitle': 'Pick two to four vaccines and see them side by side',
  'compare.picker': 'Choose vaccines',
  'compare.selected': '{0} of {1} selected',
  'compare.hint': 'Select at least two vaccines to compare.',
  'compare.limit': 'You can compare up to {0} vaccines.',
  'compare.clear': 'Clear selection',
  'compare.attribute.name': 'Vaccine',
  'compare.attribute.fullName': 'Full name',
  'compare.attribute.disease': 'Prevents',
  'compare.attribute.category': 'Category',
  'compare.attribute.schedule': 'Schedule',
  'compare.attribute.doses': 'Doses',
  'compare.attribute.efficacy': 'Effectiveness',
  'compare.attribute.ageGroup': 'Age group',
  'compare.attribute.introduced': 'In Bangladesh since',
  'compare.attribute.commonEffects': 'Common side effects',
  'compare.attribute.seriousEffects': 'Rare but serious',
  'compare.attribute.contraindications': 'Who should not take it',
  'compare.attribute.source': 'Source',
  'compare.print': 'Print comparison',
  'compare.empty': 'No vaccines selected yet',
  'compare.addFirst': 'Add at least one vaccine to see a side-by-side comparison.',
  'compare.addSecond': 'Add a second vaccine to compare them.',
  'compare.browse': 'Browse vaccines',
  'compare.remove': 'Remove',
  'compare.attribute': 'Attribute',
};
