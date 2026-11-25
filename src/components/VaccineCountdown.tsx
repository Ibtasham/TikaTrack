import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  IdCard,
  MapPin,
  Timer,
} from 'lucide-react';

import { useI18n } from '../i18n';
import { relativeDays } from '../lib/botContext';
import { formatAge, formatDate, localiseNumber } from '../lib/format';
import { milestoneDoseName } from '../lib/smartScheduler';
import { buildVaccineCountdownState } from '../lib/vaccineCountdown';
import type { Profile } from '../types';

interface VaccineCountdownProps {
  profiles: Profile[];
}

function padTwo(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0');
}

export function VaccineCountdown({ profiles }: VaccineCountdownProps) {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const [now, setNow] = useState<Date>(() => new Date());

  const state = useMemo(
    () => buildVaccineCountdownState(profiles, { now }),
    [profiles, now],
  );

  const shouldTick = state?.mode === 'upcoming';

  useEffect(() => {
    if (!shouldTick) return undefined;
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [shouldTick]);

  if (!state) return null;

  const {
    profile,
    isSelfDesignated,
    mode,
    targetDose,
    sameDayDoses,
    followingDose,
    countdown,
    overdueCount,
    completedCount,
    totalScheduledCount,
  } = state;

  const relationshipLabel = profile.relationship
    ? t(`tracker.relationship.${profile.relationship}`)
    : t('home.dashboard.countdownPrimaryFallback');

  const countdownUnits = [
    { key: 'days', value: countdown.days, label: t('home.dashboard.countdownDays') },
    { key: 'hours', value: countdown.hours, label: t('home.dashboard.countdownHours') },
    { key: 'minutes', value: countdown.minutes, label: t('home.dashboard.countdownMinutes') },
    { key: 'seconds', value: countdown.seconds, label: t('home.dashboard.countdownSeconds') },
  ];

  const additionalSameDay = targetDose
    ? sameDayDoses.filter((d) => d.scheduledDoseId !== targetDose.scheduledDoseId)
    : [];

  return (
    <section
      aria-label={t('home.dashboard.countdownTitle')}
      className="card-padded"
      data-testid="vaccine-countdown"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left column: Primary profile + next scheduled dose details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--tt-ink-muted)]">
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-wider text-[var(--tt-accent)] uppercase">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.countdownTitle')}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}>
              {profile.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className={isBangla ? 'font-bangla' : undefined}>
              {isSelfDesignated ? t('tracker.relationship.self') : relationshipLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatAge(profile.dateOfBirth, language)}</span>
          </div>

          {mode === 'complete' ? (
            <div className="mt-3">
              <h3
                className={`flex items-center gap-2 text-lg font-bold text-emerald-700 dark:text-emerald-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{t('home.dashboard.countdownCompleteTitle')}</span>
              </h3>
              <p
                className={`mt-1 text-sm text-[var(--tt-ink-muted)] ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t(
                  'home.dashboard.countdownCompleteBody',
                  localiseNumber(completedCount, language),
                  localiseNumber(totalScheduledCount, language),
                )}
              </p>
            </div>
          ) : mode === 'overdue-only' && targetDose ? (
            <div className="mt-3">
              <h3
                className={`flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{milestoneDoseName(targetDose, language)}</span>
              </h3>
              <p
                className={`mt-1 text-sm text-[var(--tt-ink-muted)] ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t(
                  'home.dashboard.countdownOverdueBody',
                  formatDate(targetDose.scheduledDate, language),
                  localiseNumber(overdueCount, language),
                )}
              </p>
            </div>
          ) : targetDose ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3
                  className={`text-lg font-bold text-[var(--tt-ink)] sm:text-xl ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {milestoneDoseName(targetDose, language)}
                </h3>
                <span
                  className={`text-xs font-semibold ${
                    mode === 'due-today'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-[var(--tt-accent)]'
                  }`}
                >
                  {mode === 'due-today'
                    ? t('home.dashboard.countdownDueTodayLabel')
                    : relativeDays(targetDose.daysUntilDue, language)}
                </span>
              </div>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--tt-ink-muted)]">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{formatDate(targetDose.scheduledDate, language)}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('home.dashboard.countdownSessionWindow')}</span>
                </span>
                {additionalSameDay.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {t(
                        'home.dashboard.countdownSameDay',
                        additionalSameDay.map((d) => milestoneDoseName(d, language)).join(', '),
                      )}
                    </span>
                  </>
                )}
              </p>

              {followingDose && (
                <p
                  className={`mt-1.5 text-xs text-[var(--tt-ink-muted)] ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {t(
                    'home.dashboard.countdownThenNext',
                    milestoneDoseName(followingDose, language),
                    formatDate(followingDose.scheduledDate, language),
                  )}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Right column: Live 4-unit tabular countdown + actions */}
        <div className="flex flex-col gap-3 lg:items-end">
          {(mode === 'upcoming' || mode === 'due-today') && (
            <dl
              aria-label={t('home.dashboard.countdownTimerLabel')}
              className="grid grid-cols-4 divide-x divide-[var(--tt-border)] rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)]/70"
            >
              {countdownUnits.map((unit) => (
                <div
                  key={unit.key}
                  className="min-w-[4.25rem] px-3 py-2.5 text-center sm:min-w-[4.75rem]"
                >
                  <dd
                    data-testid={`countdown-${unit.key}`}
                    className={`font-mono text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${
                      mode === 'due-today'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-[var(--tt-ink)]'
                    }`}
                  >
                    {localiseNumber(padTwo(unit.value), language)}
                  </dd>
                  <dt
                    className={`mt-0.5 text-[11px] font-medium text-[var(--tt-ink-muted)] ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    {unit.label}
                  </dt>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'complete' ? (
              <>
                <Link to="/passport" className="btn-primary btn-sm whitespace-nowrap shrink-0">
                  <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.action.passport')}
                  </span>
                </Link>
                <Link to="/schedule" className="btn-secondary btn-sm whitespace-nowrap shrink-0">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.action.schedule')}
                  </span>
                </Link>
              </>
            ) : mode === 'overdue-only' ? (
              <>
                <Link
                  to={`/tracker?member=${encodeURIComponent(profile.id)}&view=catchup`}
                  className="btn-primary btn-sm whitespace-nowrap shrink-0"
                >
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.reviewButton')}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link to="/centres" className="btn-secondary btn-sm whitespace-nowrap shrink-0">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.action.centres')}
                  </span>
                </Link>
              </>
            ) : targetDose ? (
              <>
                <Link
                  to={`/tracker?member=${encodeURIComponent(profile.id)}&vaccine=${encodeURIComponent(
                    targetDose.vaccineId,
                  )}&dose=${targetDose.doseNumber}&action=record`}
                  className="btn-primary btn-sm whitespace-nowrap shrink-0"
                >
                  <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.countdownRecordAction')}
                  </span>
                </Link>
                <Link to="/centres" className="btn-secondary btn-sm whitespace-nowrap shrink-0">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.action.centres')}
                  </span>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default VaccineCountdown;
