/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'onboarding.eyebrow': 'Welcome to TikaTrack',
  'onboarding.step': 'Step {0} of {1}',
  'onboarding.progress': 'Tour progress',
  'onboarding.skip': 'Skip the tour',
  'onboarding.finish': 'Get started',

  'onboarding.privacy.title': 'Your data stays on this device',
  'onboarding.privacy.body':
    'No account, no server, no advertising. Records live in this browser, and nothing is uploaded unless you switch on cloud sync yourself. You can export or erase all of it from the Privacy page at any time.',

  'onboarding.start.title': 'Start with one family member',
  'onboarding.start.body':
    'Add a name and a date of birth. TikaTrack works out the national schedule from those two facts, flags what is overdue, plans the catch-up doses, and reminds you before each one.',
  'onboarding.start.cta': 'Add a member',

  'onboarding.everywhere.title': 'Take it with you',
  'onboarding.everywhere.body':
    'Install the app to use it with no signal at the clinic, put the remaining doses in your phone calendar, print a card for the health worker, or share a summary with whoever is taking the child. Language and text size are in the header.',
};
