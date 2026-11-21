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
    'Source-backed schedules for Bangladesh, catch-up planning, dose tracking and 175 verified centres across all 64 districts — in English and বাংলা, and it all works offline.',
  'home.hero.primary': 'Browse all-ages schedule',
  'home.hero.secondary': 'Add a family member',
  'home.hero.tertiary': 'Ask TikaBot',
  'home.hero.readiness': 'Readiness Advisor',
  'home.features.schedule.title': 'All-ages lifespan schedule',
  'home.features.schedule.body':
    'Full immunization from newborn to 65+ seniors: Bangladesh EPI, school boosters, HPV, pregnancy (TT/Tdap/RSV), Hajj & catch-up timing.',
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
  'home.hero.eyebrowMeta': 'Offline-first & Cloud-synced',
  'home.command.eyebrow': 'Family command telemetry',
  'home.command.readyTitle': 'Clinical reference ready',
  'home.command.synced': 'Cloud synced',
  'home.command.localMode': 'Local vault',
  'home.command.members': 'Members',
  'home.command.completed': 'Doses given',
  'home.command.attention': 'Due / overdue',
  'home.command.instantHint': 'Instant local tracking — zero signup barrier.',
  'home.quick.subtitle': 'Every module shares one verified schedule and family dose ledger.',
  'home.features.schedule.meta': 'Birth – 65+ yrs · 16 stages',
  'home.features.tracker.meta': 'Dose & WHO growth',
  'home.features.coldchain.title': '3D Cold-Chain Lab',
  'home.features.coldchain.body':
    'Inspect a WHO PQS vaccine carrier in interactive 3D, check +2°C–+8°C probe telemetry, and simulate VVM heat excursion checks.',
  'home.features.coldchain.meta': 'Interactive 3D',
  'home.features.readiness.title': 'Readiness Advisor',
  'home.features.readiness.body':
    'Tailored Hajj, study abroad, pregnancy, chronic illness & 65+ senior vaccine checklists synced against your family ledger.',
  'home.features.readiness.meta': 'Travel & life events',
  'home.features.bot.meta': 'AI + Voice + Studio',
  'home.features.centres.meta': 'All 64 districts',
  'home.features.passport.meta': 'Signed QR',
  'home.features.analytics.meta': 'Family coverage',
  'home.command.searchHint': 'Jump anywhere with Quick Search',
};
