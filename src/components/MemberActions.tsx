import { useMemo } from 'react';
import { CalendarPlus, Printer, Share2 } from 'lucide-react';

import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { loadPassports } from '../lib/digitalPassport';
import { printEpiCard, type EpiCardRow } from '../lib/epiCard';
import { formatAge, formatDate, todayISO } from '../lib/format';
import { downloadICS, eventUid, type CalendarEvent } from '../lib/ics';
import { reminderAlarmOffsets } from '../lib/intelligentReminders';
import { relativeDays } from '../lib/botContext';
import { appUrl, buildRecordShareText, safeFilename, share, shareOutcomeKey } from '../lib/share';
import { generatePersonalizedSchedule, milestoneDoseName } from '../lib/smartScheduler';
import type { Profile } from '../types';

/**
 * What a family can *do* with one member's record: put the remaining doses in
 * their phone calendar, send a summary to whoever is taking the child to the
 * centre, and print the paper card a health worker can read.
 *
 * All three are derived from the same schedule the rest of the app shows, so
 * they cannot disagree with the tracker.
 */
export function MemberActions({
  profile,
  className = '',
}: {
  profile: Profile;
  className?: string;
}) {
  const { t, language } = useI18n();
  const toast = useToast();
  const isBangla = language === 'bn';

  const rows = useMemo(
    // The whole profile: `records` is the legacy one-slot projection and would
    // hide every dose after the first of a multi-dose series.
    () => generatePersonalizedSchedule(profile.dateOfBirth, profile),
    [profile],
  );

  /** Ledger events by id, so a printed row can quote what was recorded. */
  const eventById = useMemo(
    () => new Map((profile.events ?? []).map((event) => [event.id, event])),
    [profile.events],
  );

  const labelled = useMemo(
    () =>
      rows.map((dose) => ({
        dose,
        label: milestoneDoseName(dose, language),
      })),
    [rows, language],
  );

  const completed = labelled.filter(({ dose }) => dose.status === 'completed');
  const overdue = labelled
    .filter(({ dose }) => dose.status === 'overdue')
    .sort((a, b) => a.dose.daysUntilDue - b.dose.daysUntilDue);
  const pending = labelled
    .filter(({ dose }) => dose.status !== 'completed')
    .sort((a, b) => a.dose.daysUntilDue - b.dose.daysUntilDue);

  const alarmOffsets = useMemo(() => reminderAlarmOffsets(), []);

  const handleCalendar = () => {
    if (pending.length === 0) {
      toast.info(t('tracker.calendar.none'));
      return;
    }

    const events: CalendarEvent[] = pending.map(({ dose, label }) => ({
      // The dose number is part of the identity: one vaccine recurs at several
      // milestones, and two of them can share a date in a catch-up scenario.
      uid: eventUid(profile.id, dose.vaccineId, dose.doseNumber, dose.scheduledDate),
      date: dose.scheduledDate,
      summary: `${label} — ${profile.name}`,
      description: [
        dose.explanation[language],
        t('tracker.calendar.note', formatDate(dose.scheduledDate, language)),
        t('tracker.medicalAdvice'),
      ]
        .filter(Boolean)
        .join('\n'),
      url: appUrl('/tracker'),
      alarmsMinutesBefore: alarmOffsets,
    }));

    const written = downloadICS(
      `tikatrack-${safeFilename(profile.name, 'member')}-${todayISO()}.ics`,
      events,
      {
        name: `TikaTrack — ${profile.name}`,
        description: t('tracker.calendar.calendarDescription'),
        timezone: 'Asia/Dhaka',
      },
    );

    if (!written) {
      toast.error(t('common.status.error'));
      return;
    }
    toast.success(t('tracker.calendar.done'), t('tracker.calendar.body', pending.length));
  };

  const handleShare = async () => {
    const next = pending[0];
    const text = buildRecordShareText({
      name: profile.name,
      ageText: formatAge(profile.dateOfBirth, language),
      completed: completed.map(({ label }) => label),
      nextDue: next
        ? {
            vaccine: next.label,
            dateText: formatDate(next.dose.scheduledDate, language),
            inText: relativeDays(next.dose.daysUntilDue, language),
          }
        : undefined,
      overdue: overdue.map(({ label }) => label),
      language,
      url: appUrl('/tracker'),
    });

    const outcome = await share({
      title: `${t('tracker.title')} — ${profile.name}`,
      text,
      url: appUrl('/tracker'),
    });

    const key = shareOutcomeKey(outcome);
    if (key === 'common.share.unavailable') toast.error(t(key));
    else if (key) toast.info(t(key));
  };

  const handlePrintCard = () => {
    // A passport QR, when one has been issued for this member, travels with the
    // paper card so it can be verified by phone.
    const passport = loadPassports().find((entry) => entry.profileId === profile.id);

    const cardRows: EpiCardRow[] = labelled.map(({ dose, label }) => {
      const event = dose.recordId ? eventById.get(dose.recordId) : undefined;
      return {
        vaccine: label,
        doseNumber: dose.doseNumber,
        // A dose number TikaTrack inferred (migrated 2.x record) is printed with
        // an asterisk and a footnote: the card must not present a guess as fact.
        doseUnconfirmed: dose.attribution === 'provisional',
        dateText: dose.actualDate ? formatDate(dose.actualDate, language) : undefined,
        centre: event?.centre ?? dose.centre,
        batch: event?.batch ?? dose.batch,
        status: dose.status,
      };
    });

    const printed = printEpiCard({
      name: profile.name,
      dobText: formatDate(profile.dateOfBirth, language),
      ageText: formatAge(profile.dateOfBirth, language),
      genderText: profile.gender ? t(`tracker.gender.${profile.gender}`) : undefined,
      relationshipText: profile.relationship
        ? t(`tracker.relationship.${profile.relationship}`)
        : undefined,
      rows: cardRows,
      generatedAtText: formatDate(todayISO(), language),
      language,
      qrSvg: passport?.svg,
    });

    if (!printed) toast.error(t('tracker.card.failed'));
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={handleCalendar}
        title={t('tracker.calendar.title')}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('common.actions.calendar')}</span>
      </button>

      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => void handleShare()}
        title={t('tracker.share.title')}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('common.actions.share')}</span>
      </button>

      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={handlePrintCard}
        title={t('tracker.card.title')}
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('tracker.card.button')}</span>
      </button>
    </div>
  );
}
export default MemberActions;
