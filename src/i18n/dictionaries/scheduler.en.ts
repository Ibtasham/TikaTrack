/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'scheduler.title': 'Smart Vaccination Scheduler',
  'scheduler.subtitle': 'Intelligent personalized vaccination scheduling',
  'scheduler.selectProfile': 'Select Profile',
  'scheduler.currentAge': 'Current Age',
  'scheduler.progress': 'Progress',
  'scheduler.completed': 'Completed',
  'scheduler.upcoming': 'Upcoming',
  'scheduler.overdue': 'Overdue',
  'scheduler.dueToday': 'Due Today',
  'scheduler.daysUntil': 'days until due',
  'scheduler.daysOverdue': 'days overdue',
  'scheduler.filterAge': 'Filter by Age',
  'scheduler.filterStatus': 'Filter by Status',
  'scheduler.search': 'Search vaccines...',
  'scheduler.all': 'All',
  'scheduler.newborn': 'Newborn (0-28 days)',
  'scheduler.infant': 'Infant (29 days - 12 months)',
  'scheduler.toddler': 'Toddler (1-5 years)',
  'scheduler.child': 'Child (5-10 years)',
  'scheduler.adolescent': 'Adolescent (10-18 years)',
  'scheduler.adult': 'Adult (18+ years)',
  'scheduler.print': 'Print Schedule',
  'scheduler.download': 'Download PDF',
  'scheduler.why': 'Why this vaccine?',
  'scheduler.recommended': 'Recommended at',
  'scheduler.dose': 'Dose',
  'scheduler.source': 'Source',
  'scheduler.verified': 'Last verified',
  'scheduler.today': 'Today',
};
