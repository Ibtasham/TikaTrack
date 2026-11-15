/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'home.stats.vaccines': 'Vaccines documented',
  'home.stats.centres': 'Verified centres',
  'home.stats.districts': 'Districts covered',
  'home.stats.divisions': 'Divisions',
  'home.stats.languages': 'Languages',
  'home.offline.title': 'Works offline, keeps data local',
  'home.offline.body':
    'No account needed. Profiles, doses and reminders live in your browser and never leave your device unless you turn on cloud sync. The app itself is cached too, so it opens with no connection at all.',
  'home.hero.title': 'Every vaccine, on time, for every member of your family.',
  'home.hero.subtitle':
    'Source-backed schedules for Bangladesh, catch-up planning, dose tracking and 99 verified centres — in English and বাংলা, and it all works offline.',
  'home.hero.primary': 'Browse the schedule',
  'home.hero.secondary': 'Add a family member',
  'home.hero.tertiary': 'Ask TikaBot',
  'home.features.schedule.title': 'Age-based schedule',
  'home.features.schedule.body':
    'The Bangladesh EPI schedule from birth to 15 months, plus catch-up planning when a dose was missed.',
  'home.features.tracker.title': 'Family tracking',
  'home.features.tracker.body':
    'Keep a record for every member. Doses, dates, centres and notes stay on your device — and go out as a calendar file, a chat message or a printable card.',
  'home.features.centres.title': 'Verified centres',
  'home.features.centres.body':
    'Government, private, NGO and hospital centres with phone numbers, hours and the source they were checked against.',
  'home.features.bot.title': 'TikaBot assistant',
  'home.features.bot.body':
    'Ask about side effects, spacing between doses or what to do if you are behind. Answers cite their source, and can add what your own saved record says.',
  'home.features.passport.title': 'Digital passport',
  'home.features.passport.body':
    'Generate a signed QR certificate, share it as an image, and verify it again offline — even by scanning it with a phone.',
  'home.features.analytics.title': 'Progress analytics',
  'home.features.analytics.body':
    'See completion rates, what is due next and where the family is behind, with printable charts.',
  'home.quick.title': 'Jump straight in',
  'home.cta.title': 'Start with one family member',
  'home.cta.body':
    'It takes about twenty seconds. Nothing is uploaded, and you can export or erase everything at any time.',
  'home.cta.button': 'Open the tracker',
  'home.banner.notPersistent':
    'This browser is blocking local storage, so nothing you enter will be saved. Private windows cause this.',
  'home.stats.doses': 'Total doses tracked',
  'home.family.title': 'Your family right now',
  'home.family.subtitle': 'Live vaccination progress from your local device records.',
  'home.family.dueToday': '{0} due today',
  'home.family.allCaughtUp': 'All due doses recorded',
  'home.family.nextLabel': 'Next',
  'home.family.openTracker': 'Manage',
};
