import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClipboardPlus, TriangleAlert } from 'lucide-react';

import { allVaccinationCentres } from '../data/vaccinationCentres';
import { allVaccines } from '../data/vaccines';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import {
  checkDuplicateDose,
  milestoneDoses,
  MILESTONE_DOSES,
  type MilestoneDose,
} from '../lib/doseLedger';
import { formatDate, isValidISODate, todayISO } from '../lib/format';
import type { Profile, VaccinationEvent } from '../types';

/**
 * Record one administered dose.
 *
 * This is the write half of the dose ledger and the piece TikaTrack 2.x did not
 * have at all: `ProfilesContext.recordDose` existed but nothing in the UI called
 * it, so a family could not tell the app that a dose had been given except by
 * editing a backup file.
 *
 * The form asks *which dose of the series* this was, offers the doses the
 * national schedule defines for the chosen vaccine (marking the ones already
 * recorded), and allows "not sure" — an unknown dose number is stored as `null`
 * and flagged for review rather than guessed. Recording is always an **append**:
 * a second dose of the same vaccine never overwrites the first.
 */
export function DoseRecorder({
  profile,
  className = '',
  defaultOpen = false,
  initialVaccineId,
  initialDoseNumber,
  autoOpenKey,
}: {
  profile: Profile;
  className?: string;
  defaultOpen?: boolean;
  initialVaccineId?: string;
  initialDoseNumber?: string;
  autoOpenKey?: string | number;
}) {
  const { t, language } = useI18n();
  const toast = useToast();
  const { recordDoseEvent, historyFor } = useProfiles();
  const isBangla = language === 'bn';

  const [open, setOpen] = useState(defaultOpen || Boolean(initialVaccineId));
  const [vaccineId, setVaccineId] = useState(initialVaccineId ?? '');
  const [doseNumber, setDoseNumber] = useState(initialDoseNumber ?? '');
  const [date, setDate] = useState(todayISO());
  const [centre, setCentre] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [batch, setBatch] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoOpenKey && !initialVaccineId) return;
    if (initialVaccineId) setVaccineId(initialVaccineId);
    if (initialDoseNumber !== undefined) setDoseNumber(initialDoseNumber);
    if (autoOpenKey || initialVaccineId) setOpen(true);
    setError(null);
  }, [autoOpenKey, initialVaccineId, initialDoseNumber]);

  // Memoised: a fresh `[]` on every render would invalidate every memo below.
  const events = useMemo<readonly VaccinationEvent[]>(() => profile.events ?? [], [profile.events]);
  const history = historyFor(profile);

  /** Vaccines the milestone schedule defines, with their doses, in age order. */
  const scheduledVaccines = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ vaccineId: string; name: string; doses: readonly MilestoneDose[] }> = [];
    for (const milestone of MILESTONE_DOSES) {
      if (seen.has(milestone.vaccineId)) continue;
      seen.add(milestone.vaccineId);
      const vaccine = allVaccines.find((candidate) => candidate.id === milestone.vaccineId);
      rows.push({
        vaccineId: milestone.vaccineId,
        name: vaccine ? vaccine.name[language] : milestone.vaccineId,
        doses: milestoneDoses(milestone.vaccineId),
      });
    }
    return rows;
  }, [language]);

  /** Everything else the app knows about (private, travel, campaign, planned). */
  const otherVaccines = useMemo(() => {
    const scheduled = new Set(scheduledVaccines.map((row) => row.vaccineId));
    return allVaccines
      .filter((vaccine) => !scheduled.has(vaccine.id))
      .map((vaccine) => ({ vaccineId: vaccine.id, name: vaccine.name[language] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [language, scheduledVaccines]);

  const selected = scheduledVaccines.find((row) => row.vaccineId === vaccineId);
  const state = vaccineId ? history[vaccineId] : undefined;

  /** Which of this vaccine's scheduled doses are already in the ledger. */
  const doseChoices = useMemo(() => {
    if (!selected) return [];
    return selected.doses.map((milestone) => {
      const given = state?.administered.find((dose) => dose.doseNumber === milestone.doseNumber);
      return { milestone, given };
    });
  }, [selected, state]);

  const alreadyGiven = doseChoices.find(
    (choice) => String(choice.milestone.doseNumber) === doseNumber && choice.given,
  );

  const numericDoseNumber = doseNumber === '' ? null : Number(doseNumber);
  const duplicateCheck = useMemo(() => {
    if (!vaccineId || !date) return null;
    return checkDuplicateDose(events, {
      vaccineId,
      date,
      doseNumber: numericDoseNumber,
    });
  }, [events, vaccineId, date, numericDoseNumber]);

  const beforeDobWarning = Boolean(
    isValidISODate(date) && isValidISODate(profile.dateOfBirth) && date < profile.dateOfBirth,
  );

  const chronologyWarning = useMemo(() => {
    if (!vaccineId || !isValidISODate(date) || !numericDoseNumber) return null;
    const sameVaccine = events.filter((ev) => ev.vaccineId === vaccineId && ev.doseNumber !== null);
    const earlierDoseLaterDate = sameVaccine.find(
      (ev) =>
        (ev.doseNumber as number) < numericDoseNumber &&
        isValidISODate(ev.date) &&
        date < ev.date,
    );
    if (earlierDoseLaterDate) return earlierDoseLaterDate;
    return null;
  }, [events, vaccineId, date, numericDoseNumber]);

  /** Centres this family has already used, then a bounded slice of the dataset. */
  const centreSuggestions = useMemo(() => {
    const used = events
      .map((event) => event.centre)
      .filter((value): value is string => Boolean(value));
    const known = allVaccinationCentres
      .slice(0, 60)
      .map((entry) => entry.name[language])
      .filter(Boolean);
    return [...new Set([...used, ...known])];
  }, [events, language]);

  const reset = () => {
    setDoseNumber('');
    setDate(todayISO());
    setCentre('');
    setManufacturer('');
    setBatch('');
    setNotes('');
    setError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isValidISODate(date)) {
      setError(t('tracker.dose.error.invalid-date'));
      return;
    }

    const result = recordDoseEvent(profile.id, {
      vaccineId,
      date,
      doseNumber: doseNumber === '' ? null : Number(doseNumber),
      centre: centre.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      batch: batch.trim() || undefined,
      notes: notes.trim() || undefined,
      provenance: 'manual',
    });

    if (result.error || !result.event) {
      setError(t(`tracker.dose.error.${result.error ?? 'missing-vaccine'}`));
      return;
    }

    const recorded = result.event;
    const vaccine = allVaccines.find((candidate) => candidate.id === recorded.vaccineId);
    const milestone =
      recorded.doseNumber === null
        ? undefined
        : milestoneDoses(recorded.vaccineId).find((row) => row.doseNumber === recorded.doseNumber);
    const label = milestone
      ? milestone.label[language]
      : `${vaccine ? vaccine.name[language] : recorded.vaccineId}${
          recorded.doseNumber === null ? '' : ` · ${t('tracker.dose.number', recorded.doseNumber)}`
        }`;

    toast.success(t('tracker.dose.recorded', label), formatDate(recorded.date, language));
    if (recorded.needsReview) {
      toast.info(t('tracker.dose.review.badge'), t('tracker.dose.review.unknownNumber'));
    }
    reset();
  };

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="dose-recorder-form"
        >
          <ClipboardPlus className="h-4 w-4" aria-hidden="true" />
          <span className={isBangla ? 'font-bangla' : undefined}>
            {t('tracker.member.recordDose')}
          </span>
        </button>
      </div>
    );
  }

  return (
    <form
      id="dose-recorder-form"
      className={`card-padded space-y-4 ${className}`}
      onSubmit={handleSubmit}
      aria-label={t('tracker.dose.title', profile.name)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
          {t('tracker.dose.title', profile.name)}
        </h3>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-expanded
        >
          <span className={isBangla ? 'font-bangla' : undefined}>{t('tracker.cancel')}</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-vaccine">
            {t('tracker.dose.vaccine')}
          </label>
          <select
            id="dose-vaccine"
            className="input-field"
            value={vaccineId}
            onChange={(event) => {
              setVaccineId(event.target.value);
              setDoseNumber('');
            }}
            required
          >
            <option value="">{t('tracker.dose.vaccinePlaceholder')}</option>
            <optgroup label={t('tracker.dose.groupScheduled')}>
              {scheduledVaccines.map((row) => (
                <option key={row.vaccineId} value={row.vaccineId}>
                  {row.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('tracker.dose.groupOther')}>
              {otherVaccines.map((row) => (
                <option key={row.vaccineId} value={row.vaccineId}>
                  {row.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-number">
            {t('tracker.dose.doseNumber')}
          </label>
          <select
            id="dose-number"
            className="input-field"
            value={doseNumber}
            onChange={(event) => setDoseNumber(event.target.value)}
            aria-describedby="dose-number-help"
          >
            {/* "Not sure" is a real answer: it is stored as an unknown dose
                number and flagged for review, never silently turned into 1. */}
            <option value="">{t('tracker.dose.doseUnknown')}</option>
            {doseChoices.map(({ milestone, given }) => (
              <option key={milestone.scheduledDoseId} value={String(milestone.doseNumber)}>
                {milestone.label[language]}
                {given
                  ? ` — ${t('tracker.dose.alreadyOn', formatDate(given.date, language))}`
                  : ` — ${t('tracker.dose.notRecorded')}`}
              </option>
            ))}
            {selected && selected.doses.length > 0 && (
              <option value={String(selected.doses.length + 1)}>{t('tracker.dose.booster')}</option>
            )}
          </select>
          <p
            id="dose-number-help"
            className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.dose.doseNumberHelp')}
          </p>
        </div>

        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-date">
            {t('tracker.dose.date')}
          </label>
          <input
            id="dose-date"
            type="date"
            className="input-field"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          <p
            className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.dose.dateHelp')}
          </p>
        </div>

        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-centre">
            {t('tracker.dose.centre')}
          </label>
          <input
            id="dose-centre"
            type="text"
            className="input-field"
            list="dose-centre-suggestions"
            value={centre}
            maxLength={200}
            onChange={(event) => setCentre(event.target.value)}
            placeholder={t('tracker.dose.centrePlaceholder')}
          />
          <datalist id="dose-centre-suggestions">
            {centreSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-manufacturer">
            {t('tracker.dose.manufacturer')}
          </label>
          <input
            id="dose-manufacturer"
            type="text"
            className="input-field"
            value={manufacturer}
            maxLength={120}
            onChange={(event) => setManufacturer(event.target.value)}
            placeholder={t('tracker.dose.optional')}
          />
        </div>

        <div>
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-batch">
            {t('tracker.dose.batch')}
          </label>
          <input
            id="dose-batch"
            type="text"
            className="input-field"
            value={batch}
            maxLength={60}
            onChange={(event) => setBatch(event.target.value)}
            placeholder={t('tracker.dose.optional')}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={`label ${isBangla ? 'font-bangla' : ''}`} htmlFor="dose-notes">
            {t('tracker.dose.notes')}
          </label>
          <textarea
            id="dose-notes"
            className="input-field"
            rows={2}
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('tracker.dose.notesPlaceholder')}
          />
        </div>
      </div>

      {alreadyGiven?.given && (
        <p
          className={`flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            'tracker.dose.alreadyGiven',
            alreadyGiven.milestone.label[language],
            formatDate(alreadyGiven.given.date, language),
          )}
        </p>
      )}

      {!alreadyGiven?.given && duplicateCheck?.hasExactSameVisitDuplicate && (
        <p
          className={`flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            'tracker.dose.warn.exactDuplicate',
            selected?.name ?? vaccineId,
            formatDate(date, language),
          )}
        </p>
      )}

      {beforeDobWarning && (
        <p
          className={`flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            'tracker.dose.warn.beforeDob',
            formatDate(date, language),
            formatDate(profile.dateOfBirth, language),
          )}
        </p>
      )}

      {chronologyWarning && (
        <p
          className={`flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            'tracker.dose.warn.chronology',
            formatDate(date, language),
            formatDate(chronologyWarning.date, language),
          )}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className={`rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={!vaccineId || !date}>
          <span className={isBangla ? 'font-bangla' : undefined}>{t('tracker.dose.submit')}</span>
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          <span className={isBangla ? 'font-bangla' : undefined}>{t('tracker.cancel')}</span>
        </button>
      </div>

      <p
        className={`text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
      >
        {t('tracker.dose.localOnly')}
      </p>
    </form>
  );
}

export default DoseRecorder;
