import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  Calendar,
  Download,
  Plus,
  Ruler,
  Scale,
  Stethoscope,
  Syringe,
  Trash2,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { GrowthMetric } from '../data/whoGrowthStandards';
import { useProfiles } from '../contexts/ProfilesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { downloadCSV } from '../lib/exporters';
import { formatAge, formatDate, localiseNumber, todayISO } from '../lib/format';
import {
  ageInMonths,
  assessMeasurement,
  buildGrowthChartSeries,
  nearbyVaccinesForDate,
  recommendedAgeWindow,
  sortGrowthMeasurements,
  type GrowthChartPoint,
  type PercentileBand,
} from '../lib/whoGrowth';
import type { GrowthMeasurement, Profile } from '../types';
import { ConfirmDialog } from './ui/ConfirmDialog';

type AgeWindow = 'auto' | 12 | 24 | 36 | 60;

interface ChildGrowthChartProps {
  /** Optional explicit profile to display (locks selector when provided). */
  profile?: Profile;
  /** Optional pre-selected profile id when showing the family selector. */
  preferredProfileId?: string;
}

function bandTextTone(band: PercentileBand): string {
  switch (band) {
    case 'p15-p85':
      return 'text-emerald-700 dark:text-emerald-300';
    case 'p3-p15':
    case 'p85-p97':
      return 'text-amber-700 dark:text-amber-300';
    case 'below-p3':
    case 'above-p97':
      return 'text-red-700 dark:text-red-300';
  }
}

export function ChildGrowthChart({ profile, preferredProfileId }: ChildGrowthChartProps) {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const { profiles, addGrowthMeasurement, removeGrowthMeasurement } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';
  const isDark = theme === 'dark';

  const [selectedId, setSelectedId] = useState<string>(
    () => profile?.id ?? preferredProfileId ?? profiles[0]?.id ?? '',
  );
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const [ageWindow, setAgeWindow] = useState<AgeWindow>('auto');
  const [showVaccines, setShowVaccines] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<GrowthMeasurement | null>(null);

  useEffect(() => {
    if (profile) {
      setSelectedId(profile.id);
      return;
    }
    if (preferredProfileId && profiles.some((p) => p.id === preferredProfileId)) {
      setSelectedId(preferredProfileId);
      return;
    }
    if (profiles.length > 0 && !profiles.some((p) => p.id === selectedId)) {
      setSelectedId(profiles[0].id);
    }
  }, [preferredProfileId, profile, profiles, selectedId]);

  const activeProfile = useMemo(
    () => profile ?? profiles.find((p) => p.id === selectedId) ?? profiles[0],
    [profile, profiles, selectedId],
  );

  const maxMonths = useMemo(() => {
    if (!activeProfile) return 24;
    if (ageWindow === 'auto') return recommendedAgeWindow(activeProfile);
    return ageWindow;
  }, [activeProfile, ageWindow]);

  const chartData = useMemo(() => {
    if (!activeProfile) return [];
    return buildGrowthChartSeries(activeProfile, metric, maxMonths, showVaccines);
  }, [activeProfile, maxMonths, metric, showVaccines]);

  const sortedMeasurements = useMemo(
    () => sortGrowthMeasurements(activeProfile?.growth ?? []),
    [activeProfile?.growth],
  );

  const currentAgeMonths = useMemo(
    () => (activeProfile ? ageInMonths(activeProfile.dateOfBirth, todayISO()) : null),
    [activeProfile],
  );

  const latestWeightSummary = useMemo(() => {
    if (!activeProfile) return null;
    const latest = [...sortedMeasurements].reverse().find((m) => typeof m.weightKg === 'number');
    if (!latest || latest.weightKg === undefined) return null;
    const month = ageInMonths(activeProfile.dateOfBirth, latest.date) ?? 0;
    return {
      entry: latest,
      month,
      assessment: assessMeasurement(activeProfile.gender, 'weight', month, latest.weightKg),
    };
  }, [activeProfile, sortedMeasurements]);

  const latestHeightSummary = useMemo(() => {
    if (!activeProfile) return null;
    const latest = [...sortedMeasurements].reverse().find((m) => typeof m.heightCm === 'number');
    if (!latest || latest.heightCm === undefined) return null;
    const month = ageInMonths(activeProfile.dateOfBirth, latest.date) ?? 0;
    return {
      entry: latest,
      month,
      assessment: assessMeasurement(activeProfile.gender, 'height', month, latest.heightCm),
    };
  }, [activeProfile, sortedMeasurements]);

  const vaccineReferenceMonths = useMemo(() => {
    if (!showVaccines) return [];
    return chartData
      .filter((point) => (point.vaccines?.length ?? 0) > 0)
      .map((point) => ({
        month: point.month,
        label: point.vaccines!.map((v) => v.label[language]).join(', '),
      }));
  }, [chartData, language, showVaccines]);

  if (!activeProfile) return null;

  const unit = metric === 'weight' ? (isBangla ? 'কেজি' : 'kg') : isBangla ? 'সেমি' : 'cm';
  const gridStroke = isDark ? '#262626' : '#e5e5e5';
  const axisTickColor = isDark ? '#a3a3a3' : '#525252';
  const childStroke = isDark ? '#34d399' : '#0f766e';
  const medianStroke = isDark ? '#94a3b8' : '#64748b';
  const pinColor = isDark ? '#fbbf24' : '#d97706';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const result = addGrowthMeasurement(activeProfile.id, {
      date,
      weightKg: weightInput,
      heightCm: heightInput,
      notes: notesInput,
    });
    if (result.error) {
      setFormError(t(`growth.error.${result.error}`));
      return;
    }
    setWeightInput('');
    setHeightInput('');
    setNotesInput('');
    setShowForm(false);
    toast.success(t('growth.log.saved', activeProfile.name));
  };

  const handleExportCSV = () => {
    const rows: unknown[][] = [
      ['Member', 'Date', 'Age (months)', 'Weight (kg)', 'Height (cm)', 'Nearby vaccines', 'Notes'],
      ...sortedMeasurements.map((entry) => {
        const m = ageInMonths(activeProfile.dateOfBirth, entry.date);
        const nearby = nearbyVaccinesForDate(activeProfile, entry.date)
          .map((v) => v.label.en)
          .join('; ');
        return [
          activeProfile.name,
          entry.date,
          m !== null ? m.toFixed(1) : '',
          entry.weightKg ?? '',
          entry.heightCm ?? '',
          nearby,
          entry.notes ?? '',
        ];
      }),
    ];
    downloadCSV(`tikatrack-growth-${activeProfile.name.replace(/\s+/g, '-')}.csv`, rows);
    toast.success(t('common.actions.download'), t('growth.export.csv'));
  };

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: GrowthChartPoint }>;
    label?: string | number;
  }) => {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;
    return (
      <div className="max-w-xs rounded-xl border border-neutral-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
        <p className="font-bold text-neutral-900 tabular-nums dark:text-white">
          {t('growth.tooltip.age', localiseNumber(Number(label ?? point.month).toFixed(1), language))}
        </p>
        {point.measurementDate && (
          <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
            {formatDate(point.measurementDate, language)}
          </p>
        )}

        {point.childValue !== undefined && (
          <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <p className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
              {t('growth.legend.child')}: {localiseNumber(point.childValue, language)} {unit}
            </p>
            {point.percentileBand && (
              <p className={`mt-0.5 font-medium ${bandTextTone(point.percentileBand)}`}>
                {t(`growth.band.${point.percentileBand}`)}
                {point.approxPercentile !== undefined &&
                  ` (${t('growth.summary.percentileEst', localiseNumber(point.approxPercentile, language))})`}
              </p>
            )}
            {point.measurementNotes && (
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                {point.measurementNotes}
              </p>
            )}
          </div>
        )}

        <div className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2 text-neutral-600 tabular-nums dark:border-neutral-800 dark:text-neutral-300">
          <p>
            {t('growth.legend.p50')}: {localiseNumber(point.p50, language)} {unit}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t('growth.legend.outer')}: {localiseNumber(point.p3, language)}–
            {localiseNumber(point.p97, language)} {unit}
          </p>
        </div>

        {point.vaccines && point.vaccines.length > 0 && (
          <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              {t('growth.tooltip.vaccinesGiven')}
            </p>
            <ul className="mt-1 space-y-0.5">
              {point.vaccines.map((v) => (
                <li key={v.eventId} className="text-neutral-700 dark:text-neutral-200">
                  {v.label[language]} · {formatDate(v.date, language)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="card-padded" aria-labelledby="growth-chart-heading">
      {/* Header row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2
            id="growth-chart-heading"
            className={`flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t('growth.title')}
          </h2>
          <p
            className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('growth.subtitle')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{activeProfile.name}</span>
            <span aria-hidden="true"> · </span>
            <span>{formatAge(activeProfile.dateOfBirth, language)}</span>
            {activeProfile.gender && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{t(`tracker.gender.${activeProfile.gender}`)}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {!profile && profiles.length > 1 && (
            <select
              aria-label={t('analytics.table.member')}
              value={activeProfile.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="input-field min-h-[40px] w-auto py-1.5 text-sm"
            >
              {profiles.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowForm((open) => !open);
            }}
            className="btn-primary btn-sm whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {showForm
                ? t('growth.log.cancel')
                : sortedMeasurements.length === 0
                  ? t('growth.log.firstButton')
                  : t('growth.log.button')}
            </span>
          </button>
          {sortedMeasurements.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary btn-sm whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>{t('growth.export.csv')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notices for > 60m or neutral sex */}
      {(!activeProfile.gender || activeProfile.gender === 'other') && (
        <p
          className={`mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('growth.summary.neutralCurveNote')}
        </p>
      )}
      {currentAgeMonths !== null && currentAgeMonths > 60 && (
        <p
          className={`mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('growth.summary.beyondWho')}
        </p>
      )}

      {/* Collapsible Log Measurement Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 no-print"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="growth-date" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('growth.log.date')}
              </label>
              <input
                id="growth-date"
                type="date"
                className="input-field"
                value={date}
                min={activeProfile.dateOfBirth}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="growth-weight" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('growth.log.weight')}
              </label>
              <input
                id="growth-weight"
                type="number"
                step="0.01"
                min="0.5"
                max="120"
                className="input-field tabular-nums"
                placeholder="e.g. 6.8"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="growth-height" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('growth.log.height')}
              </label>
              <input
                id="growth-height"
                type="number"
                step="0.1"
                min="25"
                max="220"
                className="input-field tabular-nums"
                placeholder="e.g. 64.5"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="growth-notes" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('growth.log.notes')}
              </label>
              <input
                id="growth-notes"
                type="text"
                className="input-field"
                placeholder={t('growth.log.notesPlaceholder')}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-3 text-xs font-medium text-red-700 dark:text-red-300">
              {formError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary btn-sm">
              {t('growth.log.save')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost btn-sm"
            >
              {t('tracker.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Summary Metrics Strip */}
      {(latestWeightSummary || latestHeightSummary) && (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {latestWeightSummary && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
              <dt
                className={`flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t('growth.summary.latestWeight')} · {formatDate(latestWeightSummary.entry.date, language)}
              </dt>
              <dd className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-neutral-900 tabular-nums dark:text-white">
                  {localiseNumber(latestWeightSummary.entry.weightKg ?? 0, language)}{' '}
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {isBangla ? 'কেজি' : 'kg'}
                  </span>
                </span>
                {latestWeightSummary.assessment && (
                  <span
                    className={`text-xs font-semibold ${bandTextTone(latestWeightSummary.assessment.band)}`}
                  >
                    {t(`growth.band.${latestWeightSummary.assessment.band}`)}
                  </span>
                )}
              </dd>
              {latestWeightSummary.assessment && (
                <p className="mt-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {t(
                    'growth.summary.whoMedian',
                    `${localiseNumber(latestWeightSummary.assessment.whoMedian, language)} ${isBangla ? 'কেজি' : 'kg'}`,
                  )}
                </p>
              )}
            </div>
          )}

          {latestHeightSummary && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
              <dt
                className={`flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Ruler className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t('growth.summary.latestHeight')} · {formatDate(latestHeightSummary.entry.date, language)}
              </dt>
              <dd className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-neutral-900 tabular-nums dark:text-white">
                  {localiseNumber(latestHeightSummary.entry.heightCm ?? 0, language)}{' '}
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {isBangla ? 'সেমি' : 'cm'}
                  </span>
                </span>
                {latestHeightSummary.assessment && (
                  <span
                    className={`text-xs font-semibold ${bandTextTone(latestHeightSummary.assessment.band)}`}
                  >
                    {t(`growth.band.${latestHeightSummary.assessment.band}`)}
                  </span>
                )}
              </dd>
              {latestHeightSummary.assessment && (
                <p className="mt-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {t(
                    'growth.summary.whoMedian',
                    `${localiseNumber(latestHeightSummary.assessment.whoMedian, language)} ${isBangla ? 'সেমি' : 'cm'}`,
                  )}
                </p>
              )}
            </div>
          )}
        </dl>
      )}

      {/* Chart Controls Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800 no-print">
        <div
          className="inline-flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
          role="group"
          aria-label={t('growth.title')}
        >
          {(['weight', 'height'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                metric === key
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-neutral-900 dark:text-emerald-300'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            >
              {key === 'weight' ? (
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className={isBangla ? 'font-bangla' : undefined}>{t(`growth.metric.${key}`)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(['auto', 12, 24, 36, 60] as const).map((win) => {
              const labelKey =
                win === 'auto' ? 'growth.window.auto' : `growth.window.${win}m`;
              return (
                <button
                  key={String(win)}
                  type="button"
                  onClick={() => setAgeWindow(win)}
                  aria-pressed={ageWindow === win}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    ageWindow === win
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowVaccines((v) => !v)}
            aria-pressed={showVaccines}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              showVaccines
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>{t('growth.showVaccines')}</span>
          </button>
        </div>
      </div>

      {/* Recharts WHO Growth Chart */}
      <div className="mt-4 h-80 w-full min-w-0 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 14, right: 16, bottom: 18, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, maxMonths]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: axisTickColor }}
              tickFormatter={(value) => localiseNumber(value, language)}
              label={{
                value: t('growth.axis.ageMonths'),
                position: 'insideBottom',
                offset: -10,
                fontSize: 11,
                fill: axisTickColor,
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisTickColor }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => localiseNumber(value, language)}
              label={{
                value: metric === 'weight' ? t('growth.axis.weightKg') : t('growth.axis.heightCm'),
                angle: -90,
                position: 'insideLeft',
                offset: 18,
                fontSize: 11,
                fill: axisTickColor,
              }}
            />
            <Tooltip content={renderTooltip} />

            {/* Outer 3rd-97th WHO percentile band */}
            <Area
              type="monotone"
              dataKey="rangeOuter"
              stroke="none"
              fill={isDark ? '#10b981' : '#059669'}
              fillOpacity={isDark ? 0.14 : 0.09}
              isAnimationActive={false}
            />

            {/* Inner 15th-85th WHO percentile band */}
            <Area
              type="monotone"
              dataKey="rangeInner"
              stroke="none"
              fill={isDark ? '#10b981' : '#059669'}
              fillOpacity={isDark ? 0.22 : 0.16}
              isAnimationActive={false}
            />

            {/* Vertical guide lines for administered vaccine doses */}
            {vaccineReferenceMonths.map((marker) => (
              <ReferenceLine
                key={`vax-${marker.month}-${marker.label}`}
                x={marker.month}
                stroke={pinColor}
                strokeDasharray="2 3"
                strokeOpacity={0.55}
              />
            ))}

            {/* WHO 50th percentile median curve */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke={medianStroke}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Child's actual growth measurements */}
            <Line
              type="monotone"
              dataKey="childValue"
              stroke={childStroke}
              strokeWidth={2.75}
              connectNulls
              dot={{ r: 4.5, fill: childStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6.5, fill: childStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Vaccine administration pins along timeline */}
            {showVaccines && (
              <Line
                type="monotone"
                dataKey="vaccinePinValue"
                stroke="none"
                connectNulls={false}
                isAnimationActive={false}
                dot={{
                  r: 4,
                  fill: pinColor,
                  stroke: isDark ? '#0b1f1a' : '#ffffff',
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 6,
                  fill: pinColor,
                  stroke: isDark ? '#0b1f1a' : '#ffffff',
                  strokeWidth: 2,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Clean Legend Strip (zero-pill metadata discipline) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-600 dark:text-neutral-300">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: childStroke }}
            aria-hidden="true"
          />
          {t('growth.legend.child')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-4 border-t-2 border-dashed"
            style={{ borderColor: medianStroke }}
            aria-hidden="true"
          />
          {t('growth.legend.p50')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-4 rounded-sm bg-emerald-600/25 dark:bg-emerald-400/30"
            aria-hidden="true"
          />
          {t('growth.legend.core')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-4 rounded-sm bg-emerald-600/12 dark:bg-emerald-400/15"
            aria-hidden="true"
          />
          {t('growth.legend.outer')}
        </span>
        {showVaccines && (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: pinColor }}
              aria-hidden="true"
            />
            {t('growth.legend.vaccines')}
          </span>
        )}
      </div>

      {/* Empty State Prompt (below reference chart so WHO bands stay visible) */}
      {sortedMeasurements.length === 0 ? (
        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
          <p className={`text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
            {t('growth.empty.title')}
          </p>
          <p className={`mx-auto mt-1 max-w-xl text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('growth.empty.body', activeProfile.name)}
          </p>
        </div>
      ) : (
        /* Measurement & Checkup Log Table */
        <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <h3
            className={`mb-3 flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t('growth.history.title')}
          </h3>
          <div className="table-scroll">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="py-2 pr-4">{t('growth.history.date')}</th>
                  <th className="py-2 pr-4">{t('growth.history.weight')}</th>
                  <th className="py-2 pr-4">{t('growth.history.height')}</th>
                  <th className="py-2 pr-4">{t('growth.history.whoBand')}</th>
                  <th className="py-2 pr-4">{t('growth.history.vaccines')}</th>
                  <th className="py-2 text-right no-print">
                    <span className="sr-only">{t('growth.history.remove')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {[...sortedMeasurements].reverse().map((entry) => {
                  const m = ageInMonths(activeProfile.dateOfBirth, entry.date);
                  const activeValue = metric === 'weight' ? entry.weightKg : entry.heightCm;
                  const assessment =
                    m !== null && activeValue !== undefined
                      ? assessMeasurement(activeProfile.gender, metric, m, activeValue)
                      : null;
                  const nearby = nearbyVaccinesForDate(activeProfile, entry.date);

                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-neutral-900 tabular-nums dark:text-white">
                          {formatDate(entry.date, language)}
                        </p>
                        {m !== null && (
                          <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                            {localiseNumber(m.toFixed(1), language)} {isBangla ? 'মাস' : 'mo'}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-neutral-800 dark:text-neutral-200">
                        {entry.weightKg !== undefined
                          ? `${localiseNumber(entry.weightKg, language)} ${isBangla ? 'কেজি' : 'kg'}`
                          : '—'}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-neutral-800 dark:text-neutral-200">
                        {entry.heightCm !== undefined
                          ? `${localiseNumber(entry.heightCm, language)} ${isBangla ? 'সেমি' : 'cm'}`
                          : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {assessment ? (
                          <span className={`font-medium ${bandTextTone(assessment.band)}`}>
                            {t(`growth.band.${assessment.band}`)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-neutral-600 dark:text-neutral-300">
                        {nearby.length > 0 ? (
                          <span>{nearby.map((v) => v.label[language]).join(', ')}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                        {entry.notes && (
                          <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                            {entry.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(entry)}
                          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label={`${t('growth.history.remove')} ${formatDate(entry.date, language)}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clinical & WHO methodology disclaimer */}
      <p className="mt-5 flex items-start gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('growth.disclaimer')}</span>
      </p>

      <ConfirmDialog
        open={confirmRemove !== null}
        title={t('growth.history.confirmTitle')}
        description={t(
          'growth.history.confirmBody',
          confirmRemove ? formatDate(confirmRemove.date, language) : '',
        )}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={() => {
          if (confirmRemove) {
            removeGrowthMeasurement(activeProfile.id, confirmRemove.id);
            toast.info(t('growth.log.removed'));
          }
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </section>
  );
}
