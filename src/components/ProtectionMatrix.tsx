import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { useI18n } from '../i18n';
import { localiseNumber } from '../lib/format';
import {
  computeAntigenProtection,
  computeFamilyProtectionSummary,
  type AntigenProtectionRow,
  type ProtectionStatus,
} from '../lib/protectionMatrix';
import type { Profile } from '../types';

interface ProtectionMatrixProps {
  profiles: Profile[];
  /** When provided and matching a profile, shows that individual's breakdown instead of household summary. */
  selectedProfileId?: string;
  /** Compact mode tightens padding & omits optional descriptive subtitles when embedded inside SmartTracker. */
  compact?: boolean;
}

function statusDisplay(status: ProtectionStatus) {
  switch (status) {
    case 'protected':
      return {
        textClass: 'text-emerald-700 dark:text-emerald-400',
        barClass: 'bg-emerald-600 dark:bg-emerald-500',
        Icon: ShieldCheck,
      };
    case 'attention':
      return {
        textClass: 'text-red-700 dark:text-red-400',
        barClass: 'bg-red-600 dark:bg-red-500',
        Icon: AlertCircle,
      };
    case 'provisional':
      return {
        textClass: 'text-amber-700 dark:text-amber-300',
        barClass: 'bg-amber-500 dark:bg-amber-400',
        Icon: Clock,
      };
    case 'partial':
      return {
        textClass: 'text-sky-700 dark:text-sky-400',
        barClass: 'bg-emerald-600 dark:bg-emerald-500',
        Icon: CheckCircle2,
      };
    case 'optional':
      return {
        textClass: 'text-teal-700 dark:text-teal-300',
        barClass: 'bg-teal-600 dark:bg-teal-500',
        Icon: Sparkles,
      };
    default:
      return {
        textClass: 'text-neutral-500 dark:text-neutral-400',
        barClass: 'bg-neutral-400 dark:bg-neutral-600',
        Icon: Clock,
      };
  }
}

function buildRecordUrl(
  row: AntigenProtectionRow,
  singleProfileId?: string,
  profiles?: Profile[],
): string | null {
  if (!row.nextDueDose) return null;
  const targetProfileId =
    singleProfileId ??
    row.nextDueProfileId ??
    profiles?.[0]?.id;
  if (!targetProfileId) return null;
  return `/tracker?member=${encodeURIComponent(targetProfileId)}&vaccine=${encodeURIComponent(
    row.nextDueDose.vaccineId,
  )}&dose=${row.nextDueDose.doseNumber}&action=record`;
}

export function ProtectionMatrix({
  profiles,
  selectedProfileId,
  compact = false,
}: ProtectionMatrixProps) {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const singleProfile = useMemo(() => {
    if (selectedProfileId) {
      return profiles.find((p) => p.id === selectedProfileId) ?? null;
    }
    return profiles.length === 1 ? profiles[0] : null;
  }, [profiles, selectedProfileId]);

  const summary = useMemo(() => {
    if (profiles.length === 0) return null;
    if (singleProfile) {
      const rows = computeAntigenProtection(singleProfile);
      const mandatory = rows.filter((r) => r.id !== 'hpv_adult');
      const protectedGroupsCount = mandatory.filter((r) => r.status === 'protected').length;
      const attentionGroupsCount = mandatory.filter(
        (r) => r.dueOrOverdueCount > 0 || r.status === 'provisional',
      ).length;
      return {
        rows,
        protectedGroupsCount,
        attentionGroupsCount,
      };
    }
    const family = computeFamilyProtectionSummary(profiles);
    return {
      rows: family.rows,
      protectedGroupsCount: family.protectedGroupsCount,
      attentionGroupsCount: family.attentionGroupsCount,
    };
  }, [profiles, singleProfile]);

  if (!summary || summary.rows.length === 0) return null;

  return (
    <section
      aria-label={t('protection.title')}
      className={compact ? '' : 'card-padded'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
        <div className="min-w-0">
          <p className={`eyebrow ${isBangla ? 'font-bangla' : ''}`}>
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('protection.eyebrow')}</span>
          </p>
          <h3
            className={`mt-1 text-base font-bold text-neutral-900 dark:text-white ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('protection.title')}
          </h3>
          {!compact && (
            <p
              className={`mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('protection.subtitle')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tabular-nums">
          <span className="status-inline text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('protection.summaryProtected', localiseNumber(summary.protectedGroupsCount, language))}
          </span>
          {summary.attentionGroupsCount > 0 && (
            <>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                ·
              </span>
              <span className="status-inline text-red-700 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {t(
                  'protection.summaryAttention',
                  localiseNumber(summary.attentionGroupsCount, language),
                )}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="mt-1 divide-y divide-neutral-200/80 dark:divide-neutral-800">
        {summary.rows.map((row) => {
          const visual = statusDisplay(row.status);
          const StatusIcon = visual.Icon;
          const totalRecorded = row.confirmedCount + row.provisionalCount;
          const recordUrl =
            row.dueOrOverdueCount > 0
              ? buildRecordUrl(row, singleProfile?.id, profiles)
              : null;

          return (
            <li
              key={row.id}
              className="grid gap-2.5 py-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
            >
              {/* Antigen & Sub-title */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span
                    className={`text-sm font-semibold text-neutral-900 dark:text-white ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    {row.title[language]}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {row.subtitle[language]}
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span>
                    {t('protection.confirmedCount', localiseNumber(row.confirmedCount, language))}
                  </span>
                  {row.provisionalCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 dark:text-amber-300">
                        {t(
                          'protection.provisionalCount',
                          localiseNumber(row.provisionalCount, language),
                        )}
                      </span>
                    </>
                  )}
                  {row.dueOrOverdueCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {t('protection.dueCount', localiseNumber(row.dueOrOverdueCount, language))}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Proportional Coverage Bar + Eligible Fraction */}
              <div className="flex items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                  role="progressbar"
                  aria-valuenow={row.coveragePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={row.title[language]}
                >
                  <div
                    className={`h-full rounded-full transition-all ${visual.barClass}`}
                    style={{ width: `${row.coveragePercent}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                  {row.id === 'hpv_adult'
                    ? `${localiseNumber(totalRecorded, language)}`
                    : `${localiseNumber(row.coveragePercent, language)}%`}
                </span>
              </div>

              {/* Status Label + Direct Action */}
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className={`status-inline whitespace-nowrap ${visual.textClass}`}>
                  <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t(`protection.status.${row.status}`)}
                  </span>
                </span>

                {recordUrl ? (
                  <Link
                    to={recordUrl}
                    className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                  >
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {t('protection.nextAction')}
                    </span>
                  </Link>
                ) : (
                  <Link
                    to={`/vaccines/${row.primaryVaccineId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap shrink-0 dark:text-emerald-400"
                  >
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {t('protection.learnMore')}
                    </span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ProtectionMatrix;
