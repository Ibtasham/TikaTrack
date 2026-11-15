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
};
