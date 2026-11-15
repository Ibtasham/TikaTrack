/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'reminders.title': 'Reminders',
  'reminders.subtitle': 'Browser notifications and a printable checklist for every upcoming dose',
  'reminders.empty.title': 'No reminders yet',
  'reminders.empty.body':
    'Reminders are generated from each profile’s date of birth. Add a profile first.',
  'reminders.permission.title': 'Enable browser notifications',
  'reminders.permission.body':
    'TikaTrack asks your browser for permission — notifications never leave this device.',
  'reminders.permission.grant': 'Allow notifications',
  'reminders.permission.granted': 'Notifications are on',
  'reminders.permission.denied': 'Notifications are blocked in your browser settings',
  'reminders.permission.unsupported': 'This browser does not support notifications',
  'reminders.settings.title': 'Reminder settings',
  'reminders.settings.daysBefore': 'Days before due date',
  'reminders.settings.onDueDate': 'Notify on the due date',
  'reminders.settings.onOverdue': 'Notify when overdue',
  'reminders.settings.quietHours': 'Quiet hours',
  'reminders.settings.quietFrom': 'From',
  'reminders.settings.quietTo': 'Until',
  'reminders.settings.saved': 'Reminder settings saved',
  'reminders.group.overdue': 'Overdue',
  'reminders.group.dueToday': 'Due today',
  'reminders.group.upcoming': 'Upcoming',
  'reminders.group.done': 'Completed',
  'reminders.item.dueIn': 'due in {0}',
  'reminders.item.overdueBy': 'overdue by {0}',
  'reminders.item.dueToday': 'due today',
  'reminders.item.markDone': 'Mark as done',
  'reminders.item.dismiss': 'Dismiss',
  'reminders.test.title': 'Send a test notification',
  'reminders.stats.total': 'Active reminders',
  'reminders.stats.today': 'Due today',
  'reminders.stats.overdue': 'Overdue',
  'reminders.print': 'Print checklist',
  'reminders.howItWorks.title': 'How reminders work',
  'reminders.howItWorks.body':
    'TikaTrack builds reminders from each member’s schedule and stores them in this browser. If you allow notifications, due reminders are shown while the app is open — nothing is scheduled while it is closed.',
  'reminders.permission.hint':
    'Notifications are optional. TikaTrack still lists due reminders on this page without them.',
  'reminders.refresh': 'Recalculate reminders',
  'reminders.refreshed': 'Reminders recalculated for {0} members.',
  'reminders.none.title': 'Nothing scheduled',
  'reminders.none.body': 'Add a family member with a date of birth and reminders appear here.',
  'reminders.settings.hint': 'Changes are saved to this browser automatically.',
  'reminders.item.profile': 'For {0}',
  'reminders.settings.enable': 'Reminders enabled',
  'reminders.settings.browser': 'Browser notifications',
  'reminders.settings.email': 'Email notifications',
  'reminders.settings.emailHint':
    'Email reminders need a server and are not available in this build.',
  'reminders.item.record': 'Record dose',
  'reminders.doneHint':
    "Reminders are rebuilt from each member's schedule — recording a dose in the tracker clears the matching reminder.",
  'reminders.sent': '{0} reminder notifications sent',
  'reminders.calendar.title': 'Add these reminders to any calendar app',
  'reminders.calendar.button': 'Add to calendar',
  'reminders.calendar.none': 'No reminders to add yet',
  'reminders.calendar.done': 'Calendar file downloaded',
  'reminders.calendar.body': '{0} reminders added with alarms',
  'reminders.filter.member': 'Filter by member',
  'reminders.filter.allMembers': 'All family members',
};
