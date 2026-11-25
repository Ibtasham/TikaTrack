import { useEffect } from 'react';

import { useProfiles } from '../contexts/ProfilesContext';
import { useI18n } from '../i18n';
import { loadReminderPreferences } from '../lib/intelligentReminders';
import {
  localNotificationService,
  REMINDER_PREFS_CHANGED_EVENT,
  syncLocalNotificationSchedule,
} from '../lib/localNotifications';

/**
 * Global background scheduler bridge mounted inside `<Layout />`.
 *
 * Keeps browser local notifications armed and synced across every route
 * (including offline visits to the Dashboard) whenever family profiles,
 * language, reminder preferences, or tab visibility change.
 */
export function LocalNotificationAgent() {
  const { profiles, ready } = useProfiles();
  const { language } = useI18n();

  useEffect(() => {
    if (!ready || import.meta.env.MODE === 'test') return;

    const runSync = () => {
      const prefs = loadReminderPreferences();
      void syncLocalNotificationSchedule(profiles, prefs, language);
    };

    runSync();

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };

    const onPrefsChanged = () => {
      runSync();
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onPrefsChanged);
    window.addEventListener(REMINDER_PREFS_CHANGED_EVENT, onPrefsChanged);
    window.addEventListener('storage', onPrefsChanged);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onPrefsChanged);
      window.removeEventListener(REMINDER_PREFS_CHANGED_EVENT, onPrefsChanged);
      window.removeEventListener('storage', onPrefsChanged);
      localNotificationService.clearAllTimers();
    };
  }, [profiles, ready, language]);

  return null;
}

export default LocalNotificationAgent;
