/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'privacy.title': 'Privacy & Security',
  'privacy.subtitle': 'Manage your account, data, and privacy settings',
  'privacy.account': 'Account Information',
  'privacy.email': 'Email',
  'privacy.name': 'Full Name',
  'privacy.family': 'Family',
  'privacy.role': 'Role',
  'privacy.members': 'Members',
  'privacy.data': 'Your Data',
  'privacy.export': 'Export All Data',
  'privacy.exportDesc': 'Download a copy of all your vaccination records and family data',
  'privacy.exporting': 'Exporting...',
  'privacy.delete': 'Delete Account',
  'privacy.deleteDesc': 'Permanently delete your account and all associated data',
  'privacy.deleteWarning':
    'This action cannot be undone. All your data will be permanently deleted.',
  'privacy.deleting': 'Deleting...',
  'privacy.password': 'Change Password',
  'privacy.newPassword': 'New Password',
  'privacy.confirmPassword': 'Confirm Password',
  'privacy.security': 'Security Settings',
  'privacy.sessions': 'Active Sessions',
  'privacy.logoutAll': 'Log Out All Devices',
  'privacy.activity': 'Recent Activity',
  'privacy.sharing': 'Data Sharing',
  'privacy.sharingDesc': "Control who can access your family's vaccination records",
  'privacy.confirm': 'Confirm',
  'privacy.cancel': 'Cancel',
  'privacy.save': 'Save',
  'privacy.offline.title': 'Offline copy of the app',
  'privacy.offline.body':
    "A service worker caches TikaTrack's own files — code, styles and icons — so the app opens without a connection. It never caches your records: those stay in localStorage, which the worker does not read.",
  'privacy.offline.usage': 'Browser storage in use: {0}',
  'privacy.offline.usageUnknown': 'This browser will not report storage usage.',
  'privacy.offline.clear': 'Delete the offline copy',
  'privacy.offline.cleared': 'Offline copy deleted. The app still works while you are online.',
  'privacy.offline.unavailable': 'This browser has no offline copy of the app.',
};
