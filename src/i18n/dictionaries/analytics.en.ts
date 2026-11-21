/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'analytics.title': 'Analytics',
  'analytics.subtitle': 'How your family is doing against the national schedule',
  'analytics.empty.title': 'No data to analyse yet',
  'analytics.empty.body':
    'Add a family member and record a few doses — charts appear here automatically.',
  'analytics.empty.cta': 'Open the tracker',
  'analytics.stats.overall': 'Overall completion',
  'analytics.stats.completed': 'Doses recorded',
  'analytics.stats.due': 'Due in 30 days',
  'analytics.stats.overdue': 'Overdue',
  'analytics.stats.profiles': 'Family members',
  'analytics.chart.statusTitle': 'Doses by status',
  'analytics.chart.completionTitle': 'Completion by member',
  'analytics.chart.timelineTitle': 'Doses recorded per month',
  'analytics.chart.categoryTitle': 'Coverage by vaccine category',
  'analytics.legend.completed': 'Completed',
  'analytics.legend.upcoming': 'Upcoming',
  'analytics.legend.overdue': 'Overdue',
  'analytics.legend.dueToday': 'Due today',
  'analytics.table.member': 'Member',
  'analytics.table.progress': 'Progress',
  'analytics.table.next': 'Next dose',
  'analytics.table.status': 'Status',
  'analytics.range.6m': 'Last 6 months',
  'analytics.range.12m': 'Last 12 months',
  'analytics.range.all': 'All time',
  'analytics.insight.onTrack': '{0} is fully on track with the national schedule.',
  'analytics.insight.overdue': '{0} has {1} overdue dose(s). Book a catch-up visit.',
  'analytics.insight.upcoming': '{0} has a dose due on {1}.',
  'analytics.print.title': 'Print this report',
  'analytics.export.title': 'Take these numbers with you',
  'analytics.export.csv': 'Download CSV',
  'analytics.member.all': 'All members',
  'analytics.coverage': 'Coverage by vaccine category',
  'analytics.noChartData': 'Not enough recorded doses to chart yet.',
  'analytics.ageGroup': 'By age group',
  'analytics.recentActivity': 'Recent activity',
  'analytics.lastDose': 'Last recorded dose',
  'analytics.nextMilestone': 'Next milestone',
  'analytics.days': '{0} days',
  'analytics.scope.member': 'Showing data for {0}',
  'analytics.scope.family': 'Showing family-wide summary across {0} members',
};
