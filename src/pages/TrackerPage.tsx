import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  Database,
  Download,
  Printer,
  Stethoscope,
  TriangleAlert,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';

import SmartTracker from '../components/SmartTracker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageSkeleton } from '../components/Skeleton';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { downloadCSV, downloadJSON, printElement } from '../lib/exporters';
import { buildExport } from '../lib/profileStore';
import { doseCsvCount, doseCsvRows } from '../lib/doseExport';
import { formatDate, todayISO } from '../lib/format';
import { downloadICS, eventUid, type CalendarEvent } from '../lib/ics';
import { reminderAlarmOffsets } from '../lib/intelligentReminders';
import { appUrl } from '../lib/share';
import { generatePersonalizedSchedule, milestoneDoseName } from '../lib/smartScheduler';
import type { Profile } from '../types';

/**
 * `/tracker` — family member management and dose recording.
 *
 * The interactive part (add member, record dose, catch-up plan, timeline) lives
 * in `SmartTracker`; this page owns everything around it: persistence status,
 * backup/restore, printing and the destructive "erase everything" action.
 *
 * Profiles are read from and written through `ProfilesContext`, which persists
 * on every change. The original app loaded profiles once and never wrote them
 * back, so every dose recorded was lost on reload — the single worst bug in the
 * codebase.
 */
export default function TrackerPage() {
  const { t, language } = useI18n();
  const { profiles, ready, persistent, replaceAll, importJSON, needsReview } = useProfiles();
  const toast = useToast();

  const isBangla = language === 'bn';
  const printableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmErase, setConfirmErase] = useState(false);

  const handleProfilesChange = useCallback(
    (next: Profile[]) => {
      replaceAll(next);
    },
    [replaceAll],
  );

  const handleExportJSON = () => {
    const stamp = todayISO();
    downloadJSON(`tikatrack-backup-${stamp}.json`, buildExport(profiles));
    toast.success(t('common.actions.download'), t('tracker.export.json'));
  };

  /**
   * One row per **administered dose**, straight from the ledger.
   *
   * The rows are built in `lib/doseExport` so the CSV, the tests and any future
   * reader agree on one column order.
   */
  const handleExportCSV = () => {
    const rows = doseCsvRows(profiles, language);
    downloadCSV(`tikatrack-doses-${doseCsvCount(profiles)}.csv`, rows);
    toast.success(t('common.actions.download'), t('tracker.export.csv'));
  };

  /**
   * Every outstanding dose for every member, as one calendar file. Alarms come
   * from the reminder settings, so the phone and the calendar agree.
   */
  const handleFamilyCalendar = () => {
    const alarms = reminderAlarmOffsets();
    const events: CalendarEvent[] = [];

    for (const member of profiles) {
      for (const dose of generatePersonalizedSchedule(member.dateOfBirth, member)) {
        if (dose.status === 'completed') continue;
        events.push({
          uid: eventUid(member.id, dose.vaccineId, dose.doseNumber, dose.scheduledDate),
          date: dose.scheduledDate,
          summary: `${milestoneDoseName(dose, language)} — ${member.name}`,
          description: [
            dose.explanation[language],
            t('tracker.calendar.note', formatDate(dose.scheduledDate, language)),
          ].join('\n'),
          url: appUrl('/tracker'),
          alarmsMinutesBefore: alarms,
        });
      }
    }

    if (events.length === 0) {
      toast.info(t('tracker.calendar.familyNone'));
      return;
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    const written = downloadICS(`tikatrack-family-${todayISO()}.ics`, events, {
      name: `TikaTrack — ${t('tracker.title')}`,
      description: t('tracker.calendar.calendarDescription'),
      timezone: 'Asia/Dhaka',
    });

    if (!written) {
      toast.error(t('common.status.error'));
      return;
    }
    toast.success(t('tracker.calendar.done'), t('tracker.calendar.body', events.length));
  };

  const handlePrint = () => {
    if (!printableRef.current) return;
    const opened = printElement(printableRef.current, t('tracker.title'));
    if (!opened) toast.error(t('common.status.error'));
  };

  const handleImportFile = async (file: File) => {
    const raw = await file.text();
    const result = importJSON(raw);
    if (result.ok) {
      toast.success(
        t('tracker.import.merged', result.added, result.added + result.merged),
        t('tracker.import.doses', result.dosesAdded, result.dosesUpdated, result.dosesSkipped),
      );
      if (result.needsReview > 0) {
        toast.info(t('tracker.dose.review.badge'), t('tracker.import.review', result.needsReview));
      }
      return;
    }
    toast.error(t('tracker.import.invalid'), t(`tracker.import.error.${result.reason}`));
  };

  if (!ready) return <PageSkeleton />;

  return (
    <div className="page-shell">
      <header className="no-print">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <Users className="h-4 w-4" aria-hidden="true" />
          {t('nav.tracker')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('tracker.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('tracker.subtitle')}
        </p>

        {needsReview.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t(
                'tracker.review.banner',
                needsReview.reduce((total, entry) => total + entry.count, 0),
                needsReview.map((entry) => entry.profile.name).join(', '),
              )}
            </span>
          </p>
        )}

        {!persistent && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('home.banner.notPersistent')}
            </span>
          </p>
        )}
      </header>

      {/* --- Tools --------------------------------------------------------- */}
      <div className="card-padded mt-6 no-print">
        <h2
          className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('tracker.export.title')}
        </h2>
        <p
          className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('tracker.export.body')}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={handleExportJSON}
            disabled={profiles.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('tracker.export.json')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCSV}
            disabled={profiles.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('tracker.export.csv')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t('common.actions.import')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleFamilyCalendar}
            disabled={profiles.length === 0}
            title={t('tracker.calendar.title')}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('tracker.calendar.family')}
            </span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handlePrint}
            disabled={profiles.length === 0}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t('common.actions.print')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              // Reset so picking the same file twice still fires onChange.
              event.target.value = '';
            }}
          />
        </div>
      </div>

      {/* --- The tracker itself -------------------------------------------- */}
      <div ref={printableRef} className="print-area mt-6">
        <SmartTracker profiles={profiles} setProfiles={handleProfilesChange} />
      </div>

      {profiles.length === 0 && (
        <div className="card-padded mt-6 text-center no-print">
          <p
            className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.empty.title')}
          </p>
          <p
            className={`mx-auto mt-2 max-w-lg text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.empty.body')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/schedule" className="btn-secondary">
              {t('nav.schedule')}
            </Link>
            <Link to="/vaccines" className="btn-ghost">
              {t('nav.vaccines')}
            </Link>
          </div>
        </div>
      )}

      {/* --- Disclaimer ---------------------------------------------------- */}
      <p className="mt-6 flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 no-print dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('tracker.medicalAdvice')}</span>
      </p>

      {/* --- Danger zone --------------------------------------------------- */}
      {profiles.length > 0 && (
        <div className="card-padded mt-6 border-red-200 no-print dark:border-red-900">
          <h2
            className={`flex items-center gap-2 font-bold text-red-700 dark:text-red-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            {t('tracker.danger.title')}
          </h2>
          <p
            className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.danger.body')}
          </p>
          <button type="button" className="btn-danger mt-4" onClick={() => setConfirmErase(true)}>
            {t('tracker.danger.button')}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmErase}
        title={t('tracker.danger.title')}
        description={t('tracker.danger.body')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={() => {
          setConfirmErase(false);
          replaceAll([]);
          toast.success(t('tracker.danger.done'));
        }}
        onCancel={() => setConfirmErase(false)}
      />
    </div>
  );
}
