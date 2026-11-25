import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  CheckSquare,
  Download,
  MapPin,
  Square,
  TriangleAlert,
} from 'lucide-react';

import { useOptionalToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import {
  buildClinicVisitPlan,
  buildVisitBriefText,
  CLINIC_PREP_CHECKLIST,
} from '../lib/clinicVisitPlanner';
import { downloadTextFile } from '../lib/exporters';
import { formatDate, localiseNumber, todayISO } from '../lib/format';
import type { Profile } from '../types';

const PREP_STORAGE_KEY = 'tikatrack.visitPrepChecklist';
const WINDOW_OPTIONS = [14, 30, 60] as const;
type WindowOption = (typeof WINDOW_OPTIONS)[number];

function loadCheckedPrepIds(): string[] {
  try {
    const raw = localStorage.getItem(PREP_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

interface ClinicVisitPlannerProps {
  profiles: Profile[];
}

export function ClinicVisitPlanner({ profiles }: ClinicVisitPlannerProps) {
  const { t, language } = useI18n();
  const toast = useOptionalToast();
  const isBangla = language === 'bn';

  const [windowDays, setWindowDays] = useState<WindowOption>(30);
  const [checkedIds, setCheckedIds] = useState<string[]>(() => loadCheckedPrepIds());
  const [briefNotice, setBriefNotice] = useState(false);

  const plan = useMemo(
    () => buildClinicVisitPlan(profiles, windowDays),
    [profiles, windowDays],
  );

  const checkedSet = useMemo(() => new Set(checkedIds), [checkedIds]);

  const toggleChecklistItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(PREP_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota/private mode failures gracefully
      }
      return next;
    });
  };

  const handleDownloadBrief = () => {
    const text = buildVisitBriefText(plan, checkedIds, language);
    downloadTextFile(
      `tikatrack-clinic-visit-${todayISO()}.txt`,
      text,
      'text/plain;charset=utf-8',
    );
    if (toast) {
      toast.success(t('visitPlan.briefDownloaded'));
    } else {
      setBriefNotice(true);
      setTimeout(() => setBriefNotice(false), 3000);
    }
  };

  if (profiles.length === 0) return null;

  return (
    <section aria-label={t('visitPlan.title')} className="card-padded">
      {/* Header + Window Segmented Control */}
      <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800">
        <div className="min-w-0">
          <p className={`eyebrow ${isBangla ? 'font-bangla' : ''}`}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('visitPlan.eyebrow')}</span>
          </p>
          <h3
            className={`mt-1 text-base font-bold text-neutral-900 dark:text-white ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('visitPlan.title')}
          </h3>
          <p
            className={`mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('visitPlan.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label={t('visitPlan.title')}
            className="segmented-group"
          >
            {WINDOW_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={windowDays === days}
                onClick={() => setWindowDays(days)}
                className={`segmented-tab tabular-nums whitespace-nowrap shrink-0 ${
                  windowDays === days
                    ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300'
                    : ''
                }`}
              >
                {t(`visitPlan.window${days}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HCW Review Notice when overdue or provisional records exist */}
      {plan.requiresHcwReview && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <p className={isBangla ? 'font-bangla' : undefined}>{t('visitPlan.hcwWarning')}</p>
        </div>
      )}

      {/* Main Split: Scheduled Bundle vs. Preparation Checklist */}
      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Bundled Clinic Doses */}
        <div className="lg:col-span-7">
          {plan.totalActionableCount === 0 ? (
            <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
              <p className={isBangla ? 'font-bangla' : undefined}>{t('visitPlan.empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plan.priorityDoses.length > 0 && (
                <div>
                  <p
                    className={`mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-red-700 uppercase dark:text-red-400 ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {t('visitPlan.priorityHeading')} (
                      <span className="tabular-nums">
                        {localiseNumber(plan.priorityDoses.length, language)}
                      </span>
                      )
                    </span>
                  </p>
                  <ul className="divide-y divide-neutral-200/80 border-y border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-800">
                    {plan.priorityDoses.slice(0, 6).map((item) => (
                      <li
                        key={`${item.profileId}-${item.dose.scheduledDoseId}`}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold text-neutral-900 dark:text-white ${
                              isBangla ? 'font-bangla' : ''
                            }`}
                          >
                            {item.doseLabel[language]}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              {item.profileName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums text-red-700 dark:text-red-400">
                              {formatDate(item.dose.scheduledDate, language)}
                            </span>
                            {item.route && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{item.route[language]}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <Link
                          to={`/tracker?member=${encodeURIComponent(item.profileId)}&vaccine=${encodeURIComponent(
                            item.dose.vaccineId,
                          )}&dose=${item.dose.doseNumber}&action=record`}
                          className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                        >
                          {t('visitPlan.recordNow')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.windowDoses.length > 0 && (
                <div>
                  <p
                    className={`mb-2 text-xs font-bold tracking-wide text-neutral-600 uppercase dark:text-neutral-400 ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    {t('visitPlan.upcomingHeading')} (
                    <span className="tabular-nums">
                      {localiseNumber(plan.windowDoses.length, language)}
                    </span>
                    )
                  </p>
                  <ul className="divide-y divide-neutral-200/80 border-y border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-800">
                    {plan.windowDoses.slice(0, 6).map((item) => (
                      <li
                        key={`${item.profileId}-${item.dose.scheduledDoseId}`}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold text-neutral-900 dark:text-white ${
                              isBangla ? 'font-bangla' : ''
                            }`}
                          >
                            {item.doseLabel[language]}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              {item.profileName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {formatDate(item.dose.scheduledDate, language)}
                            </span>
                            {item.route && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{item.route[language]}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <Link
                          to={`/tracker?member=${encodeURIComponent(item.profileId)}&vaccine=${encodeURIComponent(
                            item.dose.vaccineId,
                          )}&dose=${item.dose.doseNumber}&action=record`}
                          className="btn-ghost btn-sm whitespace-nowrap shrink-0"
                        >
                          {t('visitPlan.recordNow')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Export / Find Centre Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadBrief}
              className="btn-secondary btn-sm whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('visitPlan.downloadBrief')}
              </span>
            </button>
            <Link to="/centres" className="btn-ghost btn-sm whitespace-nowrap shrink-0">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('visitPlan.findCentres')}
              </span>
            </Link>
            {briefNotice && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {t('visitPlan.briefDownloaded')}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Clinic Readiness Checklist */}
        <div className="border-t border-neutral-200/80 pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-xs font-bold tracking-wide text-neutral-700 uppercase dark:text-neutral-300 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('visitPlan.checklistHeading')}
            </h4>
            <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {t(
                'visitPlan.checklistProgress',
                localiseNumber(checkedIds.length, language),
                localiseNumber(CLINIC_PREP_CHECKLIST.length, language),
              )}
            </span>
          </div>

          <ul className="mt-3 divide-y divide-neutral-200/70 dark:divide-neutral-800">
            {CLINIC_PREP_CHECKLIST.map((item) => {
              const checked = checkedSet.has(item.id);
              return (
                <li key={item.id} className="py-2.5 first:pt-1 last:pb-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex w-full items-start gap-2.5 text-left transition-colors hover:text-emerald-800 dark:hover:text-emerald-300"
                  >
                    {checked ? (
                      <CheckSquare
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <Square
                        className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          checked
                            ? 'text-neutral-500 line-through dark:text-neutral-500'
                            : 'text-neutral-900 dark:text-white'
                        } ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {item.title[language]}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {item.detail[language]}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ClinicVisitPlanner;
