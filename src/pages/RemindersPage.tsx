import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarClock,
  CalendarPlus,
  Check,
  Clock,
  Mail,
  Printer,
  RefreshCw,
  Settings2,
  TriangleAlert,
  X,
} from 'lucide-react';

import { useOptionalAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { allVaccines } from '../data/vaccines';
import { printElement } from '../lib/exporters';
import {
  daysBetween,
  formatDate,
  localiseNumber,
  parseISODate,
  startOfToday,
  todayISO,
} from '../lib/format';
import { downloadICS, eventUid, type CalendarEvent } from '../lib/ics';
import {
  buildUpcomingPushDoses,
  DEFAULT_REMINDER_PREFERENCES,
  findUpcoming48HourDoses,
  generateReminders,
  getReminderStatistics,
  loadReminderPreferences,
  loadReminders,
  markReminderAsAcknowledged,
  processDueReminders,
  REMINDER_LEAD_DAYS_OPTIONS,
  reminderAlarmOffsets,
  saveReminderPreferences,
  saveReminders,
  sendBrowserNotification,
  type Reminder,
  type ReminderPreferences,
} from '../lib/intelligentReminders';
import {
  getWebPushStatus,
  isWebPushSupported,
  sendTestWebPush,
  subscribeToWebPush,
  syncWebPushSchedule,
  unsubscribeFromWebPush,
  type WebPushStatus,
} from '../lib/pushClient';
import { appUrl } from '../lib/share';

/** Lead times the user can toggle, in days before the due date. */
const DAY_OPTIONS = [...REMINDER_LEAD_DAYS_OPTIONS];

type Group = 'overdue' | 'dueToday' | 'upcoming' | 'done';

/**
 * `/reminders` — the notification layer over the schedule.
 *
 * Reminders are *derived*, never authored: they are rebuilt from each member's
 * date of birth plus recorded doses, so a dose logged in the tracker makes the
 * matching reminder disappear instead of nagging forever. Browser notifications
 * are opt-in and everything stays on-device.
 */
export default function RemindersPage() {
  const { t, language } = useI18n();
  const auth = useOptionalAuth();
  const firebaseUser = auth?.firebaseUser ?? null;
  const { profiles } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [preferences, setPreferences] = useState<ReminderPreferences>(() =>
    loadReminderPreferences(),
  );
  const [draft, setDraft] = useState<ReminderPreferences>(preferences);
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [printRef, setPrintRef] = useState<HTMLDivElement | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  );
  const [pushStatus, setPushStatus] = useState<WebPushStatus>({
    supported: isWebPushSupported(),
    permission: typeof Notification === 'undefined' ? 'denied' : Notification.permission,
    subscribed: false,
    endpoint: null,
  });
  const [pushBusy, setPushBusy] = useState(false);

  const upcomingPushDoses = useMemo(() => buildUpcomingPushDoses(profiles), [profiles]);
  const dueWithin48Hours = useMemo(() => findUpcoming48HourDoses(profiles), [profiles]);

  useEffect(() => {
    let cancelled = false;
    void getWebPushStatus().then((status) => {
      if (!cancelled) {
        setPushStatus(status);
        setNotificationPermission(status.permission);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const vaccineName = useMemo(
    () => new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine.name])),
    [],
  );
  const profileName = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.name])),
    [profiles],
  );

  /** Rebuild every reminder from the current members + preferences. */
  const rebuild = useCallback(
    (prefs: ReminderPreferences) => {
      const next: Reminder[] = [];
      for (const profile of profiles) {
        next.push(
          // The whole profile, not `profile.records`: the 2.x map can only hold
          // one dose per vaccine, so passing it would hide every dose after the
          // first and the reminders would be wrong for multi-dose series.
          ...generateReminders(profile.id, profile.dateOfBirth, profile, prefs),
        );
      }
      saveReminders(next);
      setReminders(next);
      return next;
    },
    [profiles],
  );

  // Fire due notifications once on load when the user has opted in.
  useEffect(() => {
    if (!preferences.browserNotifications || !preferences.enabled || profiles.length === 0) return;
    let cancelled = false;
    void processDueReminders(profiles, preferences, language).then(({ sent }) => {
      if (!cancelled && sent > 0) {
        toast.info(t('reminders.sent', sent));
        setReminders(loadReminders());
      }
    });
    return () => {
      cancelled = true;
    };
    // Deliberately only on mount / member list change — not on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length, preferences.enabled, preferences.browserNotifications]);

  const visibleReminders = useMemo(
    () =>
      memberFilter === 'all'
        ? reminders
        : reminders.filter((reminder) => reminder.profileId === memberFilter),
    [memberFilter, reminders],
  );

  const stats = useMemo(() => getReminderStatistics(visibleReminders), [visibleReminders]);

  const grouped = useMemo(() => {
    const today = startOfToday();
    const buckets: Record<Group, Reminder[]> = {
      overdue: [],
      dueToday: [],
      upcoming: [],
      done: [],
    };

    for (const reminder of visibleReminders) {
      if (reminder.acknowledged) {
        buckets.done.push(reminder);
        continue;
      }
      const due = parseISODate(reminder.scheduledDate);
      const delta = due ? daysBetween(today, due) : 0;
      if (delta < 0) buckets.overdue.push(reminder);
      else if (delta === 0) buckets.dueToday.push(reminder);
      else buckets.upcoming.push(reminder);
    }

    for (const key of ['overdue', 'dueToday', 'upcoming'] as const) {
      buckets[key].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    }
    buckets.done.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    return buckets;
  }, [visibleReminders]);

  const handleSavePreferences = () => {
    const next: ReminderPreferences = {
      ...draft,
      daysBefore: DAY_OPTIONS.filter((day) => draft.daysBefore.includes(day)).sort((a, b) => b - a),
      overdueInterval: Math.min(
        30,
        Math.max(
          1,
          Math.round(draft.overdueInterval) || DEFAULT_REMINDER_PREFERENCES.overdueInterval,
        ),
      ),
    };
    saveReminderPreferences(next);
    setPreferences(next);
    const count = rebuild(next).length;
    if (pushStatus.subscribed) {
      void syncWebPushSchedule({
        profiles,
        preferences: next,
        language,
        firebaseUser,
      });
    }
    toast.success(t('reminders.settings.saved'), t('reminders.refreshed', count));
  };

  const handleRequestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error(t('reminders.permission.unsupported'));
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      toast.success(t('reminders.permission.granted'));
      setDraft((previous) => ({ ...previous, browserNotifications: true }));
      if (isWebPushSupported()) {
        await handleEnableWebPush();
      }
    } else {
      toast.warning(t('reminders.permission.denied'));
    }
  };

  const handleEnableWebPush = async () => {
    setPushBusy(true);
    try {
      const result = await subscribeToWebPush({
        profiles,
        preferences,
        language,
        firebaseUser,
      });
      setNotificationPermission(result.permission);
      if (result.ok) {
        const nextStatus = await getWebPushStatus();
        setPushStatus(nextStatus);
        const nextPrefs = { ...preferences, browserNotifications: true };
        saveReminderPreferences(nextPrefs);
        setPreferences(nextPrefs);
        setDraft(nextPrefs);
        toast.success(
          t('reminders.push.subscribedToast'),
          t('reminders.push.queued', result.queuedDoses),
        );
      } else if (result.permission === 'denied') {
        toast.warning(t('reminders.permission.denied'));
      } else {
        toast.error(t('reminders.push.error'), result.error);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleSyncWebPush = async () => {
    setPushBusy(true);
    try {
      const res = await syncWebPushSchedule({
        profiles,
        preferences,
        language,
        firebaseUser,
      });
      if (res.synced) {
        toast.success(t('reminders.push.syncedToast'), t('reminders.push.queued', res.queuedDoses));
      } else {
        toast.error(t('reminders.push.error'));
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisableWebPush = async () => {
    setPushBusy(true);
    try {
      await unsubscribeFromWebPush();
      const nextStatus = await getWebPushStatus();
      setPushStatus(nextStatus);
      toast.info(t('reminders.push.disabledToast'));
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestWebPush = async () => {
    setPushBusy(true);
    try {
      const sample = dueWithin48Hours[0] ?? upcomingPushDoses[0];
      const res = await sendTestWebPush(language, sample);
      if (res.ok) {
        toast.success(t('reminders.push.testSent'), t('reminders.push.testBody'));
      } else {
        toast.error(t('reminders.push.error'), res.error);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestNotification = async () => {
    const ok = await sendBrowserNotification(
      t('reminders.test.title'),
      t('reminders.permission.body'),
      'tikatrack-test',
    );
    if (ok) toast.success(t('reminders.permission.granted'));
    else toast.error(t('reminders.permission.denied'), t('reminders.permission.hint'));
  };

  const handleAcknowledge = (reminder: Reminder) => {
    markReminderAsAcknowledged(reminder.id);
    setReminders(loadReminders());
    toast.info(t('reminders.item.markDone'), t('reminders.group.done'));
  };

  const handleRefresh = () => {
    const count = rebuild(preferences).length;
    toast.success(t('reminders.refresh'), t('reminders.refreshed', count));
  };

  /**
   * One event per (member, vaccine, due date).
   *
   * The reminder list holds several rows for the same dose — 7 days before, 3
   * days before, on the day, and every overdue nag — so they are collapsed here.
   * Exporting them one-for-one would put four identical entries in the calendar.
   */
  const handleCalendar = () => {
    const alarms = reminderAlarmOffsets(preferences);
    const seen = new Set<string>();
    const events: CalendarEvent[] = [];

    for (const reminder of reminders) {
      const dose = reminder.doseNumber ?? reminder.scheduledDoseId ?? '';
      const key = `${reminder.profileId}|${reminder.vaccineId}|${dose}|${reminder.scheduledDate}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const member = profileName.get(reminder.profileId) ?? '';
      const vaccine = vaccineName.get(reminder.vaccineId);
      const label = reminder.doseLabel
        ? reminder.doseLabel[language]
        : vaccine
          ? vaccine[language]
          : reminder.vaccineId;
      events.push({
        uid: eventUid(reminder.profileId, reminder.vaccineId, dose, reminder.scheduledDate),
        date: reminder.scheduledDate,
        summary: `${label} — ${member}`,
        description: t('tracker.calendar.note', formatDate(reminder.scheduledDate, language)),
        url: appUrl('/reminders'),
        alarmsMinutesBefore: alarms,
      });
    }

    if (events.length === 0) {
      toast.info(t('reminders.calendar.none'));
      return;
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    const written = downloadICS(`tikatrack-reminders-${todayISO()}.ics`, events, {
      name: `TikaTrack — ${t('reminders.title')}`,
      timezone: 'Asia/Dhaka',
    });

    if (!written) {
      toast.error(t('common.status.error'));
      return;
    }
    toast.success(t('reminders.calendar.done'), t('reminders.calendar.body', events.length));
  };

  const handlePrint = () => {
    if (!printRef) return;
    if (!printElement(printRef, t('reminders.title'))) toast.error(t('common.status.error'));
  };

  const sections: Array<{ group: Group; items: Reminder[] }> = [
    { group: 'overdue', items: grouped.overdue },
    { group: 'dueToday', items: grouped.dueToday },
    { group: 'upcoming', items: grouped.upcoming },
    { group: 'done', items: grouped.done },
  ];

  return (
    <div className="page-shell max-w-5xl">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
          <BellRing className="h-4 w-4" aria-hidden="true" />
          {t('nav.reminders')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('reminders.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('reminders.subtitle')}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 no-print">
          <button type="button" className="btn-secondary btn-sm" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('reminders.refresh')}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleCalendar}
            disabled={reminders.length === 0}
            title={t('reminders.calendar.title')}
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('reminders.calendar.button')}
            </span>
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            {t('reminders.print')}
          </button>
          {profiles.length > 1 && (
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="reminders-member-filter" className="sr-only">
                {t('reminders.filter.member')}
              </label>
              <select
                id="reminders-member-filter"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="input-field w-auto py-1.5 text-xs"
              >
                <option value="all">{t('reminders.filter.allMembers')}</option>
                {profiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* --- Stats ------------------------------------------------------- */}
      <div className="stat-grid mt-6">
        <div className="stat-card">
          <span className="stat-label">{t('reminders.stats.total')}</span>
          <strong className="stat-value">{localiseNumber(stats.total, language)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('reminders.stats.today')}</span>
          <strong className="stat-value text-amber-600 dark:text-amber-400">
            {localiseNumber(grouped.dueToday.length, language)}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('reminders.stats.overdue')}</span>
          <strong className="stat-value text-red-600 dark:text-red-400">
            {localiseNumber(grouped.overdue.length, language)}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('reminders.group.done')}</span>
          <strong className="stat-value text-emerald-600 dark:text-emerald-400">
            {localiseNumber(grouped.done.length, language)}
          </strong>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* --- List -------------------------------------------------------- */}
        <div ref={setPrintRef} className="print-area">
          {profiles.length === 0 ? (
            <div className="card-padded text-center">
              <BellOff
                className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600"
                aria-hidden="true"
              />
              <h2
                className={`mt-4 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.empty.title')}
              </h2>
              <p
                className={`mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.empty.body')}
              </p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="card-padded text-center">
              <CalendarClock
                className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600"
                aria-hidden="true"
              />
              <h2
                className={`mt-4 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.none.title')}
              </h2>
              <p
                className={`mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.none.body')}
              </p>
              <button type="button" className="btn-primary mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('reminders.refresh')}
              </button>
            </div>
          ) : (
            sections.map(({ group, items }) =>
              items.length === 0 ? null : (
                <section key={group} className="mb-6">
                  <h2
                    className={`flex items-center gap-2 text-sm font-bold tracking-wide uppercase ${
                      group === 'overdue'
                        ? 'text-red-700 dark:text-red-400'
                        : group === 'dueToday'
                          ? 'text-amber-700 dark:text-amber-400'
                          : group === 'done'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-neutral-600 dark:text-neutral-300'
                    } ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {group === 'overdue' && (
                      <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                    )}
                    {group === 'dueToday' && <Bell className="h-4 w-4" aria-hidden="true" />}
                    {group === 'upcoming' && (
                      <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    )}
                    {group === 'done' && <Check className="h-4 w-4" aria-hidden="true" />}
                    {t(`reminders.group.${group}`)}
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800">
                      {localiseNumber(items.length, language)}
                    </span>
                  </h2>

                  <ul className="mt-3 space-y-2">
                    {items.map((reminder) => {
                      const name = vaccineName.get(reminder.vaccineId);
                      const dueDate = parseISODate(reminder.scheduledDate);
                      const delta = dueDate ? daysBetween(startOfToday(), dueDate) : 0;
                      const tone =
                        group === 'overdue'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                          : group === 'dueToday'
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                            : group === 'done'
                              ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                              : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900';

                      return (
                        <li
                          key={reminder.id}
                          className={`flex flex-wrap items-start gap-3 rounded-xl border p-3.5 ${tone}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                            >
                              {/* The milestone label (`OPV-2`) rather than the
                                  antigen name (`OPV`): a parent needs to know
                                  which visit is due. */}
                              {reminder.doseLabel
                                ? reminder.doseLabel[language]
                                : name
                                  ? name[language]
                                  : reminder.vaccineId}
                            </p>
                            <p
                              className={`mt-0.5 text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                            >
                              {t(
                                'reminders.item.profile',
                                profileName.get(reminder.profileId) ?? '—',
                              )}{' '}
                              · {formatDate(reminder.scheduledDate, language)}
                            </p>
                            <p
                              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                                group === 'overdue'
                                  ? 'text-red-700 dark:text-red-300'
                                  : group === 'dueToday'
                                    ? 'text-amber-700 dark:text-amber-300'
                                    : 'text-neutral-500 dark:text-neutral-400'
                              } ${isBangla ? 'font-bangla' : ''}`}
                            >
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {group === 'done'
                                ? t('reminders.group.done')
                                : group === 'dueToday'
                                  ? t('reminders.item.dueToday')
                                  : group === 'overdue'
                                    ? t('reminders.item.overdueBy', Math.abs(delta))
                                    : t('reminders.item.dueIn', delta)}
                            </p>
                          </div>

                          {group !== 'done' && (
                            <div className="flex shrink-0 gap-1 no-print">
                              <Link
                                to={`/tracker?member=${encodeURIComponent(reminder.profileId)}&vaccine=${encodeURIComponent(reminder.vaccineId)}&dose=${reminder.doseNumber ?? ''}&action=record`}
                                className="btn-ghost btn-sm"
                              >
                                {t('reminders.item.record')}
                              </Link>
                              <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => handleAcknowledge(reminder)}
                                aria-label={t('reminders.item.dismiss')}
                                title={t('reminders.item.dismiss')}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {group === 'done' && (
                    <p
                      className={`mt-2 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('reminders.doneHint')}
                    </p>
                  )}
                </section>
              ),
            )
          )}
        </div>

        {/* --- Sidebar ----------------------------------------------------- */}
        <div className="no-print">
          {/* 48-Hour Web Push Notifications */}
          <section className="card-padded">
            <h2
              className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              <BellRing className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t('reminders.push.title')}
            </h2>
            <p
              className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('reminders.push.body')}
            </p>

            {!pushStatus.supported ? (
              <p
                className={`mt-3 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.push.unsupported')}
              </p>
            ) : pushStatus.subscribed ? (
              <div className="mt-3 space-y-2">
                <p
                  className={`flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('reminders.push.active')}
                </p>
                <p className={`text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                  {t('reminders.push.queued', localiseNumber(upcomingPushDoses.length, language))}
                </p>
                {dueWithin48Hours.length > 0 && (
                  <p className={`text-xs font-semibold text-amber-700 dark:text-amber-300 ${isBangla ? 'font-bangla' : ''}`}>
                    {t('reminders.push.within48h', localiseNumber(dueWithin48Hours.length, language))}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-primary btn-sm whitespace-nowrap shrink-0"
                    disabled={pushBusy}
                    onClick={() => void handleTestWebPush()}
                  >
                    <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reminders.push.test')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                    disabled={pushBusy}
                    onClick={() => void handleSyncWebPush()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reminders.push.sync')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm whitespace-nowrap shrink-0"
                    disabled={pushBusy}
                    onClick={() => void handleDisableWebPush()}
                  >
                    {t('reminders.push.disable')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {notificationPermission === 'denied' && (
                  <p
                    className={`rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t('reminders.permission.denied')}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap shrink-0"
                  disabled={pushBusy}
                  onClick={() => void handleEnableWebPush()}
                >
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  {pushBusy ? t('reminders.push.enabling') : t('reminders.push.enable')}
                </button>
              </div>
            )}
          </section>

          {/* Foreground Browser Notifications */}
          <section className="card-padded mt-5">
            <h2
              className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {t('reminders.permission.title')}
            </h2>
            <p
              className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('reminders.permission.body')}
            </p>

            {typeof Notification === 'undefined' ? (
              <p
                className={`mt-3 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.permission.unsupported')}
              </p>
            ) : notificationPermission === 'granted' ? (
              <p
                className={`mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('reminders.permission.granted')}
              </p>
            ) : (
              <button
                type="button"
                className="btn-secondary mt-3 whitespace-nowrap shrink-0"
                onClick={() => void handleRequestPermission()}
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                {t('reminders.permission.grant')}
              </button>
            )}

            {notificationPermission === 'granted' && (
              <button
                type="button"
                className="btn-ghost btn-sm mt-2 whitespace-nowrap shrink-0"
                onClick={() => void handleTestNotification()}
              >
                {t('reminders.test.title')}
              </button>
            )}
            <p
              className={`mt-3 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('reminders.permission.hint')}
            </p>
          </section>

          {/* Preferences */}
          <section className="card-padded mt-5">
            <h2
              className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              <Settings2
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              {t('reminders.settings.title')}
            </h2>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
              <span className={isBangla ? 'font-bangla' : undefined}>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">
                  {t('reminders.settings.enable')}
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {t('reminders.settings.hint')}
                </span>
              </span>
            </label>

            <fieldset className="mt-4" disabled={!draft.enabled}>
              <legend className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('reminders.settings.daysBefore')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const on = draft.daysBefore.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          daysBefore: on
                            ? draft.daysBefore.filter((value) => value !== day)
                            : [...draft.daysBefore, day],
                        })
                      }
                      aria-pressed={on}
                      className={
                        on
                          ? 'chip bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'chip bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                      }
                    >
                      {day === 2
                        ? t('reminders.lead.hours48')
                        : day === 1
                          ? t('common.units.day', 1)
                          : t('common.units.days', day)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                disabled={!draft.enabled}
                checked={draft.onDueDate}
                onChange={(event) => setDraft({ ...draft, onDueDate: event.target.checked })}
              />
              <span
                className={`text-sm text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.settings.onDueDate')}
              </span>
            </label>

            <label className="mt-2 flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                disabled={!draft.enabled}
                checked={draft.onOverdue}
                onChange={(event) => setDraft({ ...draft, onOverdue: event.target.checked })}
              />
              <span
                className={`text-sm text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('reminders.settings.onOverdue')}
              </span>
            </label>

            <div className="mt-4">
              <label className="label" htmlFor="reminders-quiet-from">
                {t('reminders.settings.quietHours')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="reminders-quiet-from"
                  type="time"
                  className="input-field"
                  disabled={!draft.enabled}
                  value={draft.quietHoursStart}
                  onChange={(event) => setDraft({ ...draft, quietHoursStart: event.target.value })}
                />
                <span aria-hidden="true" className="text-neutral-400">
                  {t('reminders.settings.quietFrom')}
                </span>
                <input
                  type="time"
                  className="input-field"
                  aria-label={t('reminders.settings.quietTo')}
                  disabled={!draft.enabled}
                  value={draft.quietHoursEnd}
                  onChange={(event) => setDraft({ ...draft, quietHoursEnd: event.target.value })}
                />
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                disabled={!draft.enabled}
                checked={draft.browserNotifications}
                onChange={(event) =>
                  setDraft({ ...draft, browserNotifications: event.target.checked })
                }
              />
              <span className={isBangla ? 'font-bangla' : undefined}>
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">
                  {t('reminders.settings.browser')}
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {t('reminders.permission.hint')}
                </span>
              </span>
            </label>

            <label className="mt-3 flex items-start gap-3 opacity-70">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                disabled
                checked={draft.emailNotifications}
              />
              <span className={isBangla ? 'font-bangla' : undefined}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-white">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('reminders.settings.email')}
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {t('reminders.settings.emailHint')}
                </span>
              </span>
            </label>

            <button
              type="button"
              className="btn-primary mt-5"
              disabled={!draft.enabled}
              onClick={handleSavePreferences}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('common.actions.save')}
            </button>
          </section>

          {/* How it works */}
          <section className="card-padded mt-5">
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('reminders.howItWorks.title')}
            </h2>
            <p
              className={`mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('reminders.howItWorks.body')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
