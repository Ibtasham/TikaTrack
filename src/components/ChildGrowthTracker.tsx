import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  Calendar,
  Download,
  Pencil,
  Plus,
  Ruler,
  Scale,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
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
  assessBmiForAge5to19,
  assessMeasurement,
  buildCombinedGrowthSeries,
  buildGrowthChartSeries,
  computeGrowthProgress,
  nearbyVaccinesForDate,
  recommendedAgeWindow,
  sortGrowthMeasurements,
  type AdolescentBmiBand,
  type CombinedGrowthPoint,
  type GrowthChartPoint,
  type PercentileBand,
} from '../lib/whoGrowth';
import type { GrowthMeasurement, Profile } from '../types';
import { ConfirmDialog } from './ui/ConfirmDialog';

type AgeWindow = 'auto' | 12 | 24 | 36 | 60;
type ChartViewMode = GrowthMetric | 'both';

export interface ChildGrowthTrackerProps {
  /** Optional explicit profile to display (locks selector when provided). */
  profile?: Profile;
  /** Optional pre-selected profile id when showing the family selector. */
  preferredProfileId?: string;
}

function bmiBandTone(band: AdolescentBmiBand): string {
  switch (band) {
    case 'normal':
      return 'text-emerald-700 dark:text-emerald-300';
    case 'overweight':
      return 'text-amber-700 dark:text-amber-300';
    case 'thinness':
    case 'obesity':
      return 'text-red-700 dark:text-red-300';
  }
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

function formatSignedDelta(delta: number, unit: string, language: 'en' | 'bn'): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${localiseNumber(delta, language)} ${unit}`;
}

export function ChildGrowthTracker({ profile, preferredProfileId }: ChildGrowthTrackerProps) {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const {
    profiles,
    addGrowthMeasurement,
    updateGrowthMeasurement,
    removeGrowthMeasurement,
  } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';
  const isDark = theme === 'dark';

  const [selectedId, setSelectedId] = useState<string>(
    () => profile?.id ?? preferredProfileId ?? profiles[0]?.id ?? '',
  );
  const [metric, setMetric] = useState<ChartViewMode>('weight');
  const [ageWindow, setAgeWindow] = useState<AgeWindow>('auto');
  const [showVaccines, setShowVaccines] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const singleMetric: GrowthMetric = metric === 'height' ? 'height' : 'weight';

  const chartData = useMemo(() => {
    if (!activeProfile || metric === 'both') return [];
    return buildGrowthChartSeries(activeProfile, singleMetric, maxMonths, showVaccines);
  }, [activeProfile, maxMonths, metric, showVaccines, singleMetric]);

  const combinedData = useMemo(() => {
    if (!activeProfile || metric !== 'both') return [];
    return buildCombinedGrowthSeries(activeProfile, maxMonths, showVaccines);
  }, [activeProfile, maxMonths, metric, showVaccines]);

  const sortedMeasurements = useMemo(
    () => sortGrowthMeasurements(activeProfile?.growth ?? []),
    [activeProfile?.growth],
  );

  const progress = useMemo(
    () => computeGrowthProgress(sortedMeasurements),
    [sortedMeasurements],
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

  const latestBmi5to19 = useMemo(() => {
    if (!activeProfile) return null;
    const paired = [...sortedMeasurements]
      .reverse()
      .find((m) => typeof m.weightKg === 'number' && typeof m.heightCm === 'number');
    if (!paired || paired.weightKg === undefined || paired.heightCm === undefined) return null;
    const month = ageInMonths(activeProfile.dateOfBirth, paired.date);
    if (month === null || month <= 60 || month > 228) return null;
    return assessBmiForAge5to19(activeProfile.gender, month, paired.weightKg, paired.heightCm);
  }, [activeProfile, sortedMeasurements]);

  const vaccineReferenceMonths = useMemo(() => {
    if (!showVaccines || metric === 'both') return [];
    return chartData
      .filter((point) => (point.vaccines?.length ?? 0) > 0)
      .map((point) => ({
        month: point.month,
        label: point.vaccines!.map((v) => v.label[language]).join(', '),
      }));
  }, [chartData, language, metric, showVaccines]);

  if (!activeProfile) return null;

  const kgUnit = isBangla ? 'কেজি' : 'kg';
  const cmUnit = isBangla ? 'সেমি' : 'cm';
  const activeUnit = singleMetric === 'weight' ? kgUnit : cmUnit;
  const gridStroke = isDark ? '#262626' : '#e5e5e5';
  const axisTickColor = isDark ? '#a3a3a3' : '#525252';
  const weightStroke = isDark ? '#34d399' : '#0f766e';
  const heightStroke = isDark ? '#60a5fa' : '#2563eb';
  const medianStroke = isDark ? '#94a3b8' : '#64748b';
  const pinColor = isDark ? '#fbbf24' : '#d97706';

  const resetForm = () => {
    setDate(todayISO());
    setWeightInput('');
    setHeightInput('');
    setNotesInput('');
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  const openEditForm = (entry: GrowthMeasurement) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setWeightInput(entry.weightKg !== undefined ? String(entry.weightKg) : '');
    setHeightInput(entry.heightCm !== undefined ? String(entry.heightCm) : '');
    setNotesInput(entry.notes ?? '');
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (editingId) {
      const result = updateGrowthMeasurement(activeProfile.id, editingId, {
        date,
        weightKg: weightInput,
        heightCm: heightInput,
        notes: notesInput,
      });
      if (result.error) {
        setFormError(t(`growth.error.${result.error}`));
        return;
      }
      resetForm();
      toast.success(t('growth.log.updated'));
      return;
    }

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
    resetForm();
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

  const renderSingleTooltip = ({
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
              {t('growth.legend.child')}: {localiseNumber(point.childValue, language)} {activeUnit}
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
            {t('growth.legend.p50')}: {localiseNumber(point.p50, language)} {activeUnit}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t('growth.legend.outer')}: {localiseNumber(point.p3, language)}–
            {localiseNumber(point.p97, language)} {activeUnit}
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

  const renderCombinedTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: CombinedGrowthPoint }>;
    label?: string | number;
  }) => {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;
    return (
      <div className="max-w-xs rounded-xl border border-neutral-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
        <p className="font-bold text-neutral-900 tabular-nums dark:text-white">
          {t('growth.tooltip.age', localiseNumber(Number(label ?? point.month).toFixed(1), language))}
        </p>
        <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
          {formatDate(point.date, language)}
        </p>

        <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 tabular-nums dark:border-neutral-800">
          {point.weightKg !== undefined && (
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              {t('growth.history.weight')}: {localiseNumber(point.weightKg, language)} {kgUnit}
              {point.whoWeightP50 !== undefined && (
                <span className="ml-1.5 font-normal text-neutral-500 dark:text-neutral-400">
                  (WHO p50: {localiseNumber(point.whoWeightP50, language)})
                </span>
              )}
            </p>
          )}
          {point.heightCm !== undefined && (
            <p className="font-semibold text-blue-700 dark:text-blue-300">
              {t('growth.history.height')}: {localiseNumber(point.heightCm, language)} {cmUnit}
              {point.whoHeightP50 !== undefined && (
                <span className="ml-1.5 font-normal text-neutral-500 dark:text-neutral-400">
                  (WHO p50: {localiseNumber(point.whoHeightP50, language)})
                </span>
              )}
            </p>
          )}
          {point.notes && (
            <p className="pt-0.5 font-normal text-neutral-500 dark:text-neutral-400">{point.notes}</p>
          )}
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
              onChange={(event) => {
                setSelectedId(event.target.value);
                resetForm();
              }}
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
              if (showForm) {
                resetForm();
              } else {
                setEditingId(null);
                setDate(todayISO());
                setWeightInput('');
                setHeightInput('');
                setNotesInput('');
                setFormError(null);
                setShowForm(true);
              }
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
        <div
          className={`mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <p>{currentAgeMonths <= 228 ? t('growth.bmi5to19.notice') : t('growth.summary.beyondWho')}</p>
          {latestBmi5to19 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 font-medium tabular-nums">
              <span>{t('growth.bmi5to19.label')}:</span>
              <span className={bmiBandTone(latestBmi5to19.band)}>
                {localiseNumber(latestBmi5to19.bmi, language)} —{' '}
                {t(`growth.bmi5to19.band.${latestBmi5to19.band}`)}
              </span>
              <span className="text-neutral-600 dark:text-neutral-300">
                ({t('growth.bmi5to19.median', localiseNumber(latestBmi5to19.medianBmi, language))})
              </span>
            </p>
          )}
        </div>
      )}

      {/* Collapsible Log / Edit Measurement Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 no-print"
        >
          {editingId && (
            <p className={`mb-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}>
              {t('growth.log.edit')}
            </p>
          )}
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
              {editingId ? t('growth.log.editSave') : t('growth.log.save')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn-ghost btn-sm"
            >
              {t('tracker.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Summary Metrics Strip */}
      {(latestWeightSummary || latestHeightSummary) && (
        <div className="mt-5">
          <dl className="grid gap-4 sm:grid-cols-2">
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
                      {kgUnit}
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
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {latestWeightSummary.assessment && (
                    <span>
                      {t(
                        'growth.summary.whoMedian',
                        `${localiseNumber(latestWeightSummary.assessment.whoMedian, language)} ${kgUnit}`,
                      )}
                    </span>
                  )}
                  {progress.weightDeltaKg !== undefined && (
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {t(
                        'growth.summary.changeSincePrev',
                        formatSignedDelta(progress.weightDeltaKg, kgUnit, language),
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}

            {latestHeightSummary && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                <dt
                  className={`flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Ruler className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  {t('growth.summary.latestHeight')} · {formatDate(latestHeightSummary.entry.date, language)}
                </dt>
                <dd className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold text-neutral-900 tabular-nums dark:text-white">
                    {localiseNumber(latestHeightSummary.entry.heightCm ?? 0, language)}{' '}
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      {cmUnit}
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
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  {latestHeightSummary.assessment && (
                    <span>
                      {t(
                        'growth.summary.whoMedian',
                        `${localiseNumber(latestHeightSummary.assessment.whoMedian, language)} ${cmUnit}`,
                      )}
                    </span>
                  )}
                  {progress.heightDeltaCm !== undefined && (
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      {t(
                        'growth.summary.changeSincePrev',
                        formatSignedDelta(progress.heightDeltaCm, cmUnit, language),
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
          </dl>

          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
            <span>{t('growth.summary.checkups', localiseNumber(progress.checkupCount, language))}</span>
            {progress.bmi !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t('growth.summary.bmi', localiseNumber(progress.bmi, language))}</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Chart Controls Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800 no-print">
        <div
          className="segmented-group"
          role="group"
          aria-label={t('growth.title')}
        >
          {(['weight', 'height', 'both'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={`segmented-tab ${
                metric === key ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300' : ''
              }`}
            >
              {key === 'weight' ? (
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              ) : key === 'height' ? (
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className={isBangla ? 'font-bangla' : undefined}>{t(`growth.metric.${key}`)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented-group">
            {(['auto', 12, 24, 36, 60] as const).map((win) => {
              const labelKey =
                win === 'auto' ? 'growth.window.auto' : `growth.window.${win}m`;
              return (
                <button
                  key={String(win)}
                  type="button"
                  onClick={() => setAgeWindow(win)}
                  aria-pressed={ageWindow === win}
                  className={`segmented-tab ${
                    ageWindow === win ? 'segmented-tab-active' : ''
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
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
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

      {/* Recharts Growth Visualization */}
      {metric === 'both' ? (
        combinedData.length === 0 ? (
          <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 text-center dark:border-neutral-800 dark:bg-neutral-800/40">
            <p className={`max-w-md text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
              {t('growth.combined.empty')}
            </p>
          </div>
        ) : (
          <div className="mt-4 h-80 w-full min-w-0 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData} margin={{ top: 14, right: 16, bottom: 18, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  type="number"
                  domain={['auto', 'auto']}
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
                  yAxisId="weight"
                  orientation="left"
                  tick={{ fontSize: 11, fill: weightStroke }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => localiseNumber(value, language)}
                  label={{
                    value: t('growth.axis.weightKg'),
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    fontSize: 11,
                    fill: weightStroke,
                  }}
                />
                <YAxis
                  yAxisId="height"
                  orientation="right"
                  tick={{ fontSize: 11, fill: heightStroke }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => localiseNumber(value, language)}
                  label={{
                    value: t('growth.axis.heightCm'),
                    angle: 90,
                    position: 'insideRight',
                    offset: 12,
                    fontSize: 11,
                    fill: heightStroke,
                  }}
                />
                <Tooltip content={renderCombinedTooltip} />

                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="whoWeightP50"
                  stroke={medianStroke}
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weightKg"
                  stroke={weightStroke}
                  strokeWidth={2.75}
                  connectNulls
                  dot={{ r: 4.5, fill: weightStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6.5, fill: weightStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="height"
                  type="monotone"
                  dataKey="heightCm"
                  stroke={heightStroke}
                  strokeWidth={2.75}
                  connectNulls
                  dot={{ r: 4.5, fill: heightStroke, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6.5, fill: heightStroke, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
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
                  value: singleMetric === 'weight' ? t('growth.axis.weightKg') : t('growth.axis.heightCm'),
                  angle: -90,
                  position: 'insideLeft',
                  offset: 18,
                  fontSize: 11,
                  fill: axisTickColor,
                }}
              />
              <Tooltip content={renderSingleTooltip} />

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
                stroke={weightStroke}
                strokeWidth={2.75}
                connectNulls
                dot={{ r: 4.5, fill: weightStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6.5, fill: weightStroke, stroke: isDark ? '#0b1f1a' : '#ffffff', strokeWidth: 2 }}
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
      )}

      {/* Clean Legend Strip (zero-pill metadata discipline) */}
      {metric === 'both' ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: weightStroke }}
              aria-hidden="true"
            />
            {t('growth.metric.weight')}
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: heightStroke }}
              aria-hidden="true"
            />
            {t('growth.metric.height')}
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-4 border-t-2 border-dashed"
              style={{ borderColor: medianStroke }}
              aria-hidden="true"
            />
            {t('growth.legend.p50')} ({kgUnit})
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: weightStroke }}
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
      )}

      {/* Empty State Prompt */}
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
            <table className="w-full min-w-[42rem] text-sm">
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
                  const bandMetric: GrowthMetric =
                    metric === 'height' && entry.heightCm !== undefined
                      ? 'height'
                      : entry.weightKg !== undefined
                        ? 'weight'
                        : 'height';
                  const activeValue = bandMetric === 'weight' ? entry.weightKg : entry.heightCm;
                      const assessment =
                        m !== null && activeValue !== undefined
                          ? assessMeasurement(activeProfile.gender, bandMetric, m, activeValue)
                          : null;
                      const bmi5to19 =
                        !assessment &&
                        m !== null &&
                        m > 60 &&
                        m <= 228 &&
                        entry.weightKg !== undefined &&
                        entry.heightCm !== undefined
                          ? assessBmiForAge5to19(
                              activeProfile.gender,
                              m,
                              entry.weightKg,
                              entry.heightCm,
                            )
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
                              ? `${localiseNumber(entry.weightKg, language)} ${kgUnit}`
                              : '—'}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums text-neutral-800 dark:text-neutral-200">
                            {entry.heightCm !== undefined
                              ? `${localiseNumber(entry.heightCm, language)} ${cmUnit}`
                              : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-xs">
                            {assessment ? (
                              <span className={`font-medium ${bandTextTone(assessment.band)}`}>
                                {t(`growth.band.${assessment.band}`)}
                              </span>
                            ) : bmi5to19 ? (
                              <span className={`font-medium ${bmiBandTone(bmi5to19.band)}`}>
                                BMI {localiseNumber(bmi5to19.bmi, language)} ·{' '}
                                {t(`growth.bmi5to19.band.${bmi5to19.band}`)}
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
                      <td className="py-2.5 text-right whitespace-nowrap no-print">
                        <button
                          type="button"
                          onClick={() => openEditForm(entry)}
                          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          aria-label={`${t('growth.log.edit')} ${formatDate(entry.date, language)}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(entry)}
                          className="ml-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
            if (editingId === confirmRemove.id) resetForm();
            toast.info(t('growth.log.removed'));
          }
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </section>
  );
}

export default ChildGrowthTracker;
