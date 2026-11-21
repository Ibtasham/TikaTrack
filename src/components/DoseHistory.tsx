import { useMemo, useState } from 'react';
import { History, Pencil, Trash2, TriangleAlert, X } from 'lucide-react';

import { ConfirmDialog } from './ui/ConfirmDialog';
import { allVaccines } from '../data/vaccines';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import {
  analyzeDoseHistoryAnomalies,
  eventsForVaccine,
  eventsNeedingReview,
  milestoneDoses,
  vaccineIdsInLedger,
} from '../lib/doseLedger';
import { formatDate, isValidISODate, todayISO } from '../lib/format';
import type { Profile, VaccinationEvent } from '../types';

interface Draft {
  date: string;
  doseNumber: string;
  centre: string;
  manufacturer: string;
  batch: string;
  notes: string;
}

function toDraft(event: VaccinationEvent): Draft {
  return {
    date: event.date,
    doseNumber: event.doseNumber === null ? '' : String(event.doseNumber),
    centre: event.centre ?? '',
    manufacturer: event.manufacturer ?? '',
    batch: event.batch ?? '',
    notes: event.notes ?? '',
  };
}

/**
 * The complete dose history of one family member.
 *
 * Every administered dose is listed — one row per dose, not one row per vaccine
 * — with the date it was given, where, which dose of the series it was, and how
 * the record got here. From here a family can:
 *
 * - **correct** a wrong date or a dose number (only that row changes; the rest of
 *   the series is untouched),
 * - **confirm** which dose a migrated 2.x record was, clearing its review flag,
 * - **delete** one dose behind an accessible confirmation dialog that names the
 *   exact dose being removed.
 *
 * Deleting a whole vaccine's history is a separate action with its own
 * confirmation, because in 2.x "remove a dose" *was* that — one click erased a
 * series.
 */
export function DoseHistory({ profile, className = '' }: { profile: Profile; className?: string }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const { updateDoseEvent, removeDoseEvent, removeVaccineHistory, resolveDoseReview, historyFor } =
    useProfiles();
  const isBangla = language === 'bn';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VaccinationEvent | null>(null);
  const [confirmVaccine, setConfirmVaccine] = useState<string | null>(null);

  // Memoised: a fresh `[]` on every render would invalidate every memo below.
  const events = useMemo(() => profile.events ?? [], [profile.events]);
  const history = historyFor(profile);
  const reviewCount = eventsNeedingReview(events).length;
  const anomalies = useMemo(
    () => analyzeDoseHistoryAnomalies(events, profile.dateOfBirth),
    [events, profile.dateOfBirth],
  );

  const groups = useMemo(
    () =>
      vaccineIdsInLedger(events).map((vaccineId) => {
        const vaccine = allVaccines.find((candidate) => candidate.id === vaccineId);
        const state = history[vaccineId];
        return {
          vaccineId,
          name: vaccine ? vaccine.name[language] : vaccineId,
          rows: eventsForVaccine(events, vaccineId),
          scheduledDoseCount: state?.scheduledDoseCount ?? 0,
          satisfied: state?.satisfiedDoseNumbers.length ?? 0,
          unscheduled: state?.unscheduled ?? true,
        };
      }),
    [events, history, language],
  );

  const vaccineName = (vaccineId: string) =>
    allVaccines.find((candidate) => candidate.id === vaccineId)?.name[language] ?? vaccineId;

  /** The schedule's own label for a dose (`OPV-2`), when there is one. */
  const doseLabel = (event: VaccinationEvent) => {
    const milestone =
      event.doseNumber === null
        ? undefined
        : milestoneDoses(event.vaccineId).find((row) => row.doseNumber === event.doseNumber);
    if (milestone) return milestone.label[language];
    if (event.doseNumber === null) return vaccineName(event.vaccineId);
    return `${vaccineName(event.vaccineId)} · ${t('tracker.dose.number', event.doseNumber)}`;
  };

  const startEditing = (event: VaccinationEvent) => {
    setEditingId(event.id);
    setDraft(toDraft(event));
    setDraftError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
    setDraftError(null);
  };

  const saveEdit = (event: VaccinationEvent) => {
    if (!draft) return;
    updateDoseEvent(profile.id, event.id, {
      date: draft.date,
      doseNumber: draft.doseNumber === '' ? null : Number(draft.doseNumber),
      centre: draft.centre.trim() || null,
      manufacturer: draft.manufacturer.trim() || null,
      batch: draft.batch.trim() || null,
      notes: draft.notes.trim() || null,
    });
    cancelEditing();
    toast.success(t('tracker.dose.updated'), doseLabel(event));
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const label = doseLabel(confirmDelete);
    removeDoseEvent(profile.id, confirmDelete.id);
    if (editingId === confirmDelete.id) cancelEditing();
    setConfirmDelete(null);
    toast.success(t('tracker.dose.deleted', label));
  };

  const handleDeleteVaccine = () => {
    if (!confirmVaccine) return;
    const count = eventsForVaccine(events, confirmVaccine).length;
    const name = vaccineName(confirmVaccine);
    removeVaccineHistory(profile.id, confirmVaccine);
    if (editingId && !events.find((event) => event.id === editingId)) cancelEditing();
    setConfirmVaccine(null);
    toast.success(t('tracker.dose.deleteVaccine.done', name, count));
  };

  if (events.length === 0) {
    return (
      <div className={`card-padded ${className}`}>
        <h3 className={`section-title flex items-center gap-2 ${isBangla ? 'font-bangla' : ''}`}>
          <History className="h-4 w-4" aria-hidden="true" />
          {t('tracker.dose.history.title')}
        </h3>
        <p
          className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('tracker.dose.history.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className={`card-padded ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`section-title flex items-center gap-2 ${isBangla ? 'font-bangla' : ''}`}>
          <History className="h-4 w-4" aria-hidden="true" />
          {t('tracker.dose.history.title')}
        </h3>
        <p
          className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('tracker.dose.history.count', events.length)}
        </p>
      </div>

      {reviewCount > 0 && (
        <p
          className={`mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('tracker.dose.history.review', reviewCount)}
        </p>
      )}

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <section key={group.vaccineId}>
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
              <h4
                className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {group.name}
              </h4>
              <div className="flex items-center gap-3">
                {group.scheduledDoseCount > 0 && (
                  <span
                    className={`text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t('tracker.dose.history.series', group.satisfied, group.scheduledDoseCount)}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-700 dark:text-red-300"
                  onClick={() => setConfirmVaccine(group.vaccineId)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('tracker.dose.deleteVaccine.button', group.rows.length)}
                  </span>
                </button>
              </div>
            </header>

            <ul className="mt-2 space-y-2">
              {group.rows.map((event) => {
                const isEditing = editingId === event.id;
                const milestoneOptions = milestoneDoses(event.vaccineId);
                const claimed = new Set(
                  group.rows
                    .filter((row) => row.id !== event.id && row.doseNumber !== null)
                    .map((row) => row.doseNumber as number),
                );

                return (
                  <li
                    key={event.id}
                    className={`rounded-xl border p-3 ${
                      event.needsReview
                        ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
                        : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    }`}
                  >
                    {isEditing && draft ? (
                      <div className="space-y-3">
                        <p
                          className={`text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {t('tracker.dose.edit.title', doseLabel(event))}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              className={`label ${isBangla ? 'font-bangla' : ''}`}
                              htmlFor={`edit-date-${event.id}`}
                            >
                              {t('tracker.dose.date')}
                            </label>
                            <input
                              id={`edit-date-${event.id}`}
                              type="date"
                              className="input-field"
                              value={draft.date}
                              max={todayISO()}
                              onChange={(change) =>
                                setDraft({ ...draft, date: change.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label
                              className={`label ${isBangla ? 'font-bangla' : ''}`}
                              htmlFor={`edit-dose-${event.id}`}
                            >
                              {t('tracker.dose.doseNumber')}
                            </label>
                            <select
                              id={`edit-dose-${event.id}`}
                              className="input-field"
                              value={draft.doseNumber}
                              onChange={(change) =>
                                setDraft({ ...draft, doseNumber: change.target.value })
                              }
                            >
                              <option value="">{t('tracker.dose.doseUnknown')}</option>
                              {milestoneOptions.map((milestone) => (
                                <option
                                  key={milestone.scheduledDoseId}
                                  value={String(milestone.doseNumber)}
                                >
                                  {milestone.label[language]}
                                  {claimed.has(milestone.doseNumber)
                                    ? ` — ${t('tracker.dose.claimed')}`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              className={`label ${isBangla ? 'font-bangla' : ''}`}
                              htmlFor={`edit-centre-${event.id}`}
                            >
                              {t('tracker.dose.centre')}
                            </label>
                            <input
                              id={`edit-centre-${event.id}`}
                              type="text"
                              className="input-field"
                              value={draft.centre}
                              maxLength={200}
                              onChange={(change) =>
                                setDraft({ ...draft, centre: change.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label
                              className={`label ${isBangla ? 'font-bangla' : ''}`}
                              htmlFor={`edit-batch-${event.id}`}
                            >
                              {t('tracker.dose.batch')}
                            </label>
                            <input
                              id={`edit-batch-${event.id}`}
                              type="text"
                              className="input-field"
                              value={draft.batch}
                              maxLength={60}
                              onChange={(change) =>
                                setDraft({ ...draft, batch: change.target.value })
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label
                              className={`label ${isBangla ? 'font-bangla' : ''}`}
                              htmlFor={`edit-notes-${event.id}`}
                            >
                              {t('tracker.dose.notes')}
                            </label>
                            <textarea
                              id={`edit-notes-${event.id}`}
                              className="input-field"
                              rows={2}
                              value={draft.notes}
                              maxLength={500}
                              onChange={(change) =>
                                setDraft({ ...draft, notes: change.target.value })
                              }
                            />
                          </div>
                        </div>

                        {draftError && (
                          <p
                            role="alert"
                            className={`rounded-xl bg-red-50 p-2.5 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {draftError}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => {
                              if (!isValidISODate(draft.date)) {
                                setDraftError(t('tracker.dose.error.invalid-date'));
                                return;
                              }
                              if (draft.date > todayISO()) {
                                setDraftError(t('tracker.dose.error.future-date'));
                                return;
                              }
                              saveEdit(event);
                            }}
                          >
                            <span className={isBangla ? 'font-bangla' : undefined}>
                              {t('tracker.dose.edit.save')}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                            <span className={isBangla ? 'font-bangla' : undefined}>
                              {t('tracker.cancel')}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {doseLabel(event)}
                            {event.doseNumber === null && (
                              <span className="badge badge-neutral ml-2 align-middle">
                                {t('tracker.dose.unnumbered')}
                              </span>
                            )}
                          </p>
                          <p
                            className={`mt-0.5 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {formatDate(event.date, language)}
                            {event.centre ? ` · ${event.centre}` : ''}
                            {event.batch ? ` · ${t('tracker.dose.batch')}: ${event.batch}` : ''}
                            {event.manufacturer ? ` · ${event.manufacturer}` : ''}
                          </p>
                          {event.notes && (
                            <p
                              className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                            >
                              {event.notes}
                            </p>
                          )}
                          <p
                            className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                          >
                            <span className="badge badge-neutral">
                              {t(`tracker.dose.provenance.${event.provenance}`)}
                            </span>
                            {event.updatedAt && <span>{t('tracker.dose.corrected')}</span>}
                          </p>

                          {event.needsReview && (
                            <div className="mt-2 space-y-2">
                              <p
                                className={`flex items-start gap-2 text-xs font-medium text-amber-900 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
                              >
                                <TriangleAlert
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {t(
                                  `tracker.dose.review.${event.reviewReason ?? 'legacy-dose-number-unknown'}`,
                                  event.doseNumber ?? '',
                                )}
                              </p>

                              {event.doseNumber === null && milestoneOptions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <label
                                    className={`label mb-0 ${isBangla ? 'font-bangla' : ''}`}
                                    htmlFor={`review-${event.id}`}
                                  >
                                    {t('tracker.dose.review.confirm')}
                                  </label>
                                  <select
                                    id={`review-${event.id}`}
                                    className="input-field h-9 w-auto py-1 text-sm"
                                    defaultValue=""
                                    onChange={(change) => {
                                      const value = change.target.value;
                                      if (!value) return;
                                      resolveDoseReview(profile.id, event.id, Number(value));
                                      change.target.value = '';
                                      toast.success(
                                        t('tracker.dose.review.saved'),
                                        doseLabel({ ...event, doseNumber: Number(value) }),
                                      );
                                    }}
                                  >
                                    <option value="">{t('tracker.dose.review.choose')}</option>
                                    {milestoneOptions.map((milestone) => (
                                      <option
                                        key={milestone.scheduledDoseId}
                                        value={String(milestone.doseNumber)}
                                      >
                                        {milestone.label[language]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {anomalies
                            .filter(
                              (item) =>
                                item.eventId === event.id &&
                                (item.type === 'before-dob' ||
                                  item.type === 'chronological-inversion'),
                            )
                            .map((item) => (
                              <p
                                key={item.id}
                                className={`mt-1.5 flex items-start gap-2 text-xs font-medium text-red-700 dark:text-red-300 ${isBangla ? 'font-bangla' : ''}`}
                              >
                                <TriangleAlert
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {t(
                                  item.type === 'before-dob'
                                    ? 'tracker.dose.anomaly.beforeDob'
                                    : 'tracker.dose.anomaly.chronology',
                                )}
                              </p>
                            ))}
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => startEditing(event)}
                            title={t('tracker.dose.edit.title', doseLabel(event))}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className={isBangla ? 'font-bangla' : undefined}>
                              {t('tracker.dose.edit.button')}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm text-red-700 dark:text-red-300"
                            onClick={() => setConfirmDelete(event)}
                            title={t('tracker.dose.remove')}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">
                              {t('tracker.dose.remove')} {doseLabel(event)}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Deleting one dose: the dialog names the dose and says the rest stays. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('tracker.dose.delete.title')}
        description={
          confirmDelete
            ? t(
                'tracker.dose.delete.body',
                doseLabel(confirmDelete),
                formatDate(confirmDelete.date, language),
                profile.name,
              )
            : ''
        }
        confirmLabel={t('tracker.dose.delete.confirm')}
        cancelLabel={t('tracker.cancel')}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Deleting a whole vaccine history is its own, louder decision. */}
      <ConfirmDialog
        open={confirmVaccine !== null}
        title={t(
          'tracker.dose.deleteVaccine.title',
          confirmVaccine ? vaccineName(confirmVaccine) : '',
        )}
        description={
          confirmVaccine
            ? t(
                'tracker.dose.deleteVaccine.body',
                eventsForVaccine(events, confirmVaccine).length,
                vaccineName(confirmVaccine),
              )
            : ''
        }
        confirmLabel={t('tracker.dose.deleteVaccine.confirm')}
        cancelLabel={t('tracker.cancel')}
        tone="danger"
        onConfirm={handleDeleteVaccine}
        onCancel={() => setConfirmVaccine(null)}
      />
    </div>
  );
}

export default DoseHistory;
