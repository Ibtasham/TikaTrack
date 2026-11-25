/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'dashboard.title': 'Smart Vaccination Dashboard',
  'dashboard.subtitle': 'Intelligent personalized vaccination scheduling',
  'dashboard.upcomingVaccinations': 'Upcoming Vaccinations',
  'dashboard.overdueVaccinations': 'Overdue Vaccinations',
  'dashboard.timeline': 'Family Timeline',
  'dashboard.progress': 'Vaccination Progress',
  'dashboard.noUpcoming': 'No upcoming vaccinations',
  'dashboard.noOverdue': 'No overdue vaccinations',
  'dashboard.daysUntil': 'days until due',
  'dashboard.daysOverdue': 'days overdue',
  'dashboard.today': 'Today',
  'dashboard.viewDetails': 'View Details',
  'dashboard.month': 'Month',
  'dashboard.year': 'Year',
  'dashboard.all': 'All',
  'dashboard.completed': 'Completed',
  'dashboard.upcoming': 'Upcoming',
  'dashboard.overdue': 'Overdue',
  'dashboard.overview': 'Overview',
  'dashboard.reminders': 'Reminders',
  'dashboard.catchup': 'Catch-up',

  // Antigen Protection Matrix
  'protection.eyebrow': 'Immunity & Disease Shield',
  'protection.title': 'Antigen Protection Breakdown',
  'protection.subtitle':
    'Protection status by vaccine-preventable disease derived from confirmed and provisional ledger doses.',
  'protection.summaryProtected': '{0} up to date',
  'protection.summaryAttention': '{0} need action',
  'protection.status.protected': 'Protected',
  'protection.status.partial': 'In progress',
  'protection.status.attention': 'Dose due / overdue',
  'protection.status.provisional': 'Unconfirmed dose #',
  'protection.status.upcoming': 'Ahead by age',
  'protection.status.optional': 'Optional / targeted',
  'protection.confirmedCount': '{0} confirmed',
  'protection.provisionalCount': '{0} provisional',
  'protection.dueCount': '{0} due',
  'protection.eligibleFraction': '{0}/{1} due doses',
  'protection.nextAction': 'Record',
  'protection.learnMore': 'Monograph',

  // Clinic Visit Planner
  'visitPlan.eyebrow': 'Clinic Trip Organizer',
  'visitPlan.title': 'Upcoming Clinic Visit Bundler',
  'visitPlan.subtitle':
    'Groups doses falling due in one clinic window with pre-visit cold-chain & EPI checks.',
  'visitPlan.window14': '14 days',
  'visitPlan.window30': '30 days',
  'visitPlan.window60': '60 days',
  'visitPlan.priorityHeading': 'Priority / Due Now',
  'visitPlan.upcomingHeading': 'Scheduled in Window',
  'visitPlan.empty': 'No EPI doses fall inside this clinic window.',
  'visitPlan.checklistHeading': 'Pre-visit readiness checklist',
  'visitPlan.checklistProgress': '{0}/{1} checked',
  'visitPlan.downloadBrief': 'Download Visit Brief',
  'visitPlan.briefDownloaded': 'Clinic visit brief downloaded',
  'visitPlan.findCentres': 'Nearby EPI centres',
  'visitPlan.hcwWarning':
    'Overdue or unconfirmed records are present — confirm spacing with a health worker at the session.',
  'visitPlan.recordNow': 'Record',
};
