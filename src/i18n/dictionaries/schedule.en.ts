/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'schedule.title': 'Vaccination Schedule',
  'schedule.subtitle': 'Interactive age-based vaccination timeline',
  'schedule.enterBirthDate': 'Enter Birth Date',
  'schedule.calculateAge': 'Calculate Schedule',
  'schedule.currentAge': 'Current Age',
  'schedule.completed': 'Completed',
  'schedule.upcoming': 'Upcoming',
  'schedule.overdue': 'Overdue',
  'schedule.notDue': 'Not Due Yet',
  'schedule.progress': 'Progress',
  'schedule.filter': 'Filter by Age',
  'schedule.all': 'All',
  'schedule.newborn': 'Newborn',
  'schedule.infant': 'Infant',
  'schedule.toddler': 'Toddler',
  'schedule.print': 'Print Schedule',
  'schedule.download': 'Download Schedule',
  'schedule.selectMember': 'Check for a saved member',
  'schedule.customDob': 'Custom birth date',
  'schedule.milestonesReached': '{0} of {1} EPI milestones reached by age',
  'schedule.recordNotice':
    'Showing age milestones only. Open Family Tracker to record which doses were actually given.',
  'schedule.memberDosesRecorded': '{0} of {1} scheduled doses recorded',
  'schedule.dueToday': 'Due Today',
  'schedule.recordDose': 'Record',
};
