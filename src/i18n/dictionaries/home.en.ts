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
  'home.quick.coreGroup': 'Core family & clinical workflows',
  'home.quick.toolsGroup': 'Reference, readiness & diagnostics',
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

  // Intelligent Family Dashboard
  'home.dashboard.eyebrow': 'Family Health Hub',
  'home.dashboard.completionTitle': 'Vaccination completion overview',
  'home.dashboard.eligibleLabel': 'Age-eligible to date',
  'home.dashboard.confirmedDoses': '{0} confirmed',
  'home.dashboard.provisionalDoses': '{0} provisional',
  'home.dashboard.timelineTitle': 'Upcoming vaccination timeline',
  'home.dashboard.timelineEmpty': 'No upcoming vaccinations scheduled in the active window.',
  'home.dashboard.recordDose': 'Record',
  'home.dashboard.reviewTitle': 'Overdue & record review',
  'home.dashboard.reviewClear': 'All age-eligible records look clear and chronologically consistent.',
  'home.dashboard.overdueItem': 'Potentially overdue since {0}',
  'home.dashboard.reviewRecordsHint': '{0} unconfirmed / flagged record(s) require verification',
  'home.dashboard.reviewButton': 'Review in tracker',
  'home.dashboard.recordsTitle': 'Family health record summaries',
  'home.dashboard.dosesSummary': '{0} of {1} due doses',
  'home.dashboard.noGrowthYet': 'No WHO growth checkup recorded yet',
  'home.dashboard.quickActions': 'Quick actions',
  'home.dashboard.action.record': 'Record dose',
  'home.dashboard.action.schedule': 'Full schedule',
  'home.dashboard.action.passport': 'Digital passport',
  'home.dashboard.action.centres': 'Find EPI centre',
  'home.dashboard.action.reminders': 'Reminders',
  'home.dashboard.educationTitle': 'Bangladesh EPI clinical guidance',
  'home.dashboard.education1Title': 'Bring your EPI vaccination card',
  'home.dashboard.education1Body':
    'Government EPI outreach centres run morning sessions; carry the physical card and check the VVM sticker before administration.',
  'home.dashboard.education2Title': 'Observe for 15–30 minutes after vaccination',
  'home.dashboard.education2Body':
    'Mild fever or injection-site tenderness within 24–48 hours is common. Call DGHS helpline 16263 immediately for high fever or severe distress.',
  'home.dashboard.education3Title': 'Missing history requires clinician review',
  'home.dashboard.education3Body':
    'TikaTrack highlights overdue windows without guessing minimum catch-up intervals when official series rules need health-worker confirmation.',
  'home.dashboard.progressChartTitle': 'Vaccination progress over time',
  'home.dashboard.progressChartSubtitle':
    'Cumulative completion tracked against each member’s scheduled EPI milestones.',
  'home.dashboard.progressMetricCoverage': 'Coverage %',
  'home.dashboard.progressMetricDoses': 'Doses',
  'home.dashboard.progressHorizonActive': 'Active window',
  'home.dashboard.progressHorizonFull': 'Full timeline',
  'home.dashboard.progressAllMembers': 'All members',
  'home.dashboard.progressScheduledTarget': 'Scheduled target',
  'home.dashboard.progressCompletedDoses': 'Completed doses',
  'home.dashboard.progressTodayMarker': 'Today',
  'home.dashboard.progressUpcomingNote': 'Upcoming scheduled',
  'home.dashboard.progressNoSchedule':
    'Add a valid date of birth to plot scheduled milestones over time.',
  'home.dashboard.progressDosesOfScheduled': '{0} / {1} doses',
  'home.dashboard.countdownTitle': 'Next vaccine countdown',
  'home.dashboard.countdownTimerLabel': 'Time remaining until next scheduled vaccine dose',
  'home.dashboard.countdownPrimaryFallback': 'Primary profile',
  'home.dashboard.countdownDays': 'Days',
  'home.dashboard.countdownHours': 'Hours',
  'home.dashboard.countdownMinutes': 'Minutes',
  'home.dashboard.countdownSeconds': 'Seconds',
  'home.dashboard.countdownDueTodayLabel': 'Due today',
  'home.dashboard.countdownSessionWindow': '09:00 AM EPI session',
  'home.dashboard.countdownSameDay': 'Same day: {0}',
  'home.dashboard.countdownThenNext': 'Following dose: {0} on {1}',
  'home.dashboard.countdownRecordAction': 'Log this dose',
  'home.dashboard.countdownOverdueBody':
    'Overdue since {0} ({1} dose(s) require catch-up review in the tracker).',
  'home.dashboard.countdownCompleteTitle': 'All scheduled EPI doses complete',
  'home.dashboard.countdownCompleteBody':
    '{0} of {1} scheduled doses recorded for the primary profile.',
  'home.explorer.eyebrow': 'EPI Milestone Preview',
  'home.explorer.title': 'Inspect doses by child age',
  'home.explorer.openSchedule': 'Full lifespan schedule',
  'home.explorer.trackThisAge': 'Start tracking',
  'home.explorer.vaccinesDueCount': '{0} doses at this visit',
};
