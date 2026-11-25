import { useMemo, useState } from 'react';
import { CalendarRange, TrendingUp } from 'lucide-react';
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

import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import {
  buildFamilyProgressSeries,
  type FamilyProgressPoint,
  type MemberProgressMeta,
  type ProgressHorizon,
} from '../lib/familyProgress';
import { localiseNumber } from '../lib/format';
import type { Profile } from '../types';

type ChartMetric = 'coverage' | 'doses';

interface FamilyProgressChartProps {
  profiles: Profile[];
}

function getMemberColor(member: MemberProgressMeta, isDark: boolean): string {
  return isDark ? member.darkColor : member.lightColor;
}

export function FamilyProgressChart({ profiles }: FamilyProgressChartProps) {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const isBangla = language === 'bn';
  const isDark = theme === 'dark';

  const [metric, setMetric] = useState<ChartMetric>('coverage');
  const [horizon, setHorizon] = useState<ProgressHorizon>('active');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const dataset = useMemo(
    () => buildFamilyProgressSeries(profiles, { language, horizon }),
    [profiles, language, horizon],
  );

  // If the previously focused member was removed, safely fall back to 'all'.
  const activeMemberId =
    selectedMemberId !== 'all' && dataset.members.some((m) => m.id === selectedMemberId)
      ? selectedMemberId
      : 'all';

  const focusedMember =
    activeMemberId === 'all'
      ? null
      : (dataset.members.find((m) => m.id === activeMemberId) ?? null);

  const visibleMembers = focusedMember ? [focusedMember] : dataset.members;

  const currentPointLabel = useMemo(
    () => dataset.points.find((pt) => pt.isCurrentMonth)?.label,
    [dataset.points],
  );

  const axisTickColor = isDark ? '#cbb6a0' : '#5c4634';
  const gridStroke = isDark ? 'rgba(203, 182, 160, 0.14)' : 'rgba(92, 70, 52, 0.14)';
  const targetLineColor = isDark ? '#94a3b8' : '#64748b';
  const accentColor = isDark ? '#34d399' : '#047857';

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: FamilyProgressPoint }>;
  }) => {
    const point = payload?.[0]?.payload;
    if (!active || !point) return null;

    return (
      <div className="min-w-52 max-w-xs rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-3 text-xs text-[var(--tt-ink)] shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--tt-border)] pb-1.5">
          <p className={`font-bold ${isBangla ? 'font-bangla' : ''}`}>{point.fullLabel}</p>
          {point.isCurrentMonth ? (
            <span className="text-[10px] font-bold tracking-wide text-[var(--tt-accent)] uppercase">
              {t('home.dashboard.progressTodayMarker')}
            </span>
          ) : point.isFuture ? (
            <span className="text-[10px] font-medium text-[var(--tt-ink-muted)]">
              {t('home.dashboard.progressUpcomingNote')}
            </span>
          ) : null}
        </div>

        <ul className="mt-2 space-y-1.5">
          {visibleMembers.map((member) => {
            const color = getMemberColor(member, isDark);
            const sched = point[`scheduled_${member.id}`];
            const done = point[`completed_${member.id}`];
            const pct = point[`pct_${member.id}`];

            if (sched === null || sched === undefined) return null;

            return (
              <li key={member.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className={`truncate font-medium ${isBangla ? 'font-bangla' : ''}`}>
                    {member.name}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {point.isFuture || done === null || done === undefined
                    ? `${localiseNumber(Number(sched), language)} ${
                        isBangla ? 'নির্ধারিত' : 'sched.'
                      }`
                    : metric === 'coverage'
                      ? `${localiseNumber(Number(pct ?? 0), language)}% (${localiseNumber(
                          Number(done),
                          language,
                        )}/${localiseNumber(Number(sched), language)})`
                      : t(
                          'home.dashboard.progressDosesOfScheduled',
                          localiseNumber(Number(done), language),
                          localiseNumber(Number(sched), language),
                        )}
                </span>
              </li>
            );
          })}
        </ul>

        {activeMemberId === 'all' && dataset.members.length > 1 && (
          <div className="mt-2 flex items-center justify-between border-t border-[var(--tt-border)] pt-1.5 text-[11px] font-semibold text-[var(--tt-ink-muted)] tabular-nums">
            <span>{t('home.dashboard.progressAllMembers')}</span>
            <span>
              {point.isFuture || point.familyCompleted === null
                ? `${localiseNumber(point.familyScheduled, language)} ${
                    isBangla ? 'নির্ধারিত' : 'sched.'
                  }`
                : `${localiseNumber(point.familyPct ?? 0, language)}% (${localiseNumber(
                    point.familyCompleted,
                    language,
                  )}/${localiseNumber(point.familyScheduled, language)})`}
            </span>
          </div>
        )}
      </div>
    );
  };

  const singleDoseTargetKey = focusedMember
    ? `scheduled_${focusedMember.id}`
    : dataset.members.length === 1
      ? `scheduled_${dataset.members[0].id}`
      : 'familyScheduled';

  const singleDoseCompletedKey = focusedMember
    ? `completed_${focusedMember.id}`
    : dataset.members.length === 1
      ? `completed_${dataset.members[0].id}`
      : 'familyCompleted';

  const singleDoseColor = focusedMember
    ? getMemberColor(focusedMember, isDark)
    : dataset.members.length === 1
      ? getMemberColor(dataset.members[0], isDark)
      : accentColor;

  return (
    <section
      aria-label={t('home.dashboard.progressChartTitle')}
      className="card-padded"
    >
      {/* Header + View Controls */}
      <div className="flex flex-col gap-3 border-b border-[var(--tt-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3
            className={`flex items-center gap-2 text-sm font-bold text-[var(--tt-ink)] ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            <TrendingUp className="h-4 w-4 shrink-0 text-[var(--tt-accent)]" aria-hidden="true" />
            <span>{t('home.dashboard.progressChartTitle')}</span>
          </h3>
          <p
            className={`mt-1 text-xs text-[var(--tt-ink-muted)] ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('home.dashboard.progressChartSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Segmented Switch */}
          <div
            role="group"
            aria-label={t('home.dashboard.progressChartTitle')}
            className="inline-flex rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-0.5"
          >
            <button
              type="button"
              onClick={() => setMetric('coverage')}
              aria-pressed={metric === 'coverage'}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                metric === 'coverage'
                  ? 'bg-[var(--tt-card)] text-[var(--tt-ink)] shadow-xs'
                  : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('home.dashboard.progressMetricCoverage')}
            </button>
            <button
              type="button"
              onClick={() => setMetric('doses')}
              aria-pressed={metric === 'doses'}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                metric === 'doses'
                  ? 'bg-[var(--tt-card)] text-[var(--tt-ink)] shadow-xs'
                  : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('home.dashboard.progressMetricDoses')}
            </button>
          </div>

          {/* Horizon Switch */}
          <div
            role="group"
            aria-label={t('home.dashboard.progressHorizonActive')}
            className="inline-flex rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-0.5"
          >
            <button
              type="button"
              onClick={() => setHorizon('active')}
              aria-pressed={horizon === 'active'}
              className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                horizon === 'active'
                  ? 'bg-[var(--tt-card)] text-[var(--tt-ink)] shadow-xs'
                  : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              <CalendarRange className="h-3 w-3" aria-hidden="true" />
              <span>{t('home.dashboard.progressHorizonActive')}</span>
            </button>
            <button
              type="button"
              onClick={() => setHorizon('full')}
              aria-pressed={horizon === 'full'}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                horizon === 'full'
                  ? 'bg-[var(--tt-card)] text-[var(--tt-ink)] shadow-xs'
                  : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('home.dashboard.progressHorizonFull')}
            </button>
          </div>
        </div>
      </div>

      {/* Member Filter / Legend Strip */}
      {dataset.members.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {dataset.members.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedMemberId('all')}
              aria-pressed={activeMemberId === 'all'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeMemberId === 'all'
                  ? 'border-[var(--tt-accent)] bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]'
                  : 'border-[var(--tt-border)] bg-[var(--tt-card)] text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              <span>{t('home.dashboard.progressAllMembers')}</span>
            </button>
          )}
          {dataset.members.map((member) => {
            const color = getMemberColor(member, isDark);
            const selected = activeMemberId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() =>
                  setSelectedMemberId((prev) =>
                    prev === member.id && dataset.members.length > 1 ? 'all' : member.id,
                  )
                }
                aria-pressed={selected}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selected
                    ? 'border-[var(--tt-accent)] bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]'
                    : 'border-[var(--tt-border)] bg-[var(--tt-card)] text-[var(--tt-ink)] hover:border-[var(--tt-border-strong)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className={isBangla ? 'font-bangla' : undefined}>{member.name}</span>
                <span className="text-[11px] font-bold tabular-nums text-[var(--tt-ink-muted)]">
                  {localiseNumber(member.currentPct, language)}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Recharts Visualization */}
      {!dataset.hasScheduledDoses || dataset.points.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-6 text-center text-xs text-[var(--tt-ink-muted)]">
          <p className={isBangla ? 'font-bangla' : undefined}>
            {t('home.dashboard.progressNoSchedule')}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dataset.points}
                margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
              >
                <defs>
                  {visibleMembers.map((member) => {
                    const color = getMemberColor(member, isDark);
                    return (
                      <linearGradient
                        key={`grad-${member.id}`}
                        id={`family-progress-fill-${member.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })}
                  <linearGradient id="family-progress-fill-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={singleDoseColor} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={singleDoseColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  minTickGap={18}
                />

                <YAxis
                  domain={metric === 'coverage' ? [0, 100] : [0, 'auto']}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) =>
                    metric === 'coverage'
                      ? `${localiseNumber(val, language)}%`
                      : localiseNumber(val, language)
                  }
                />

                <Tooltip content={renderTooltip} />

                {currentPointLabel && (
                  <ReferenceLine
                    x={currentPointLabel}
                    stroke={accentColor}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: t('home.dashboard.progressTodayMarker'),
                      position: 'top',
                      fill: accentColor,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {metric === 'coverage' && (
                  <ReferenceLine
                    y={100}
                    stroke={targetLineColor}
                    strokeDasharray="4 4"
                    strokeOpacity={0.65}
                  />
                )}

                {metric === 'coverage' ? (
                  visibleMembers.length === 1 ? (
                    <Area
                      type="monotone"
                      dataKey={`pct_${visibleMembers[0].id}`}
                      name={visibleMembers[0].name}
                      stroke={getMemberColor(visibleMembers[0], isDark)}
                      strokeWidth={2.5}
                      fill={`url(#family-progress-fill-${visibleMembers[0].id})`}
                      connectNulls={false}
                      dot={{ r: 3, strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  ) : (
                    visibleMembers.map((member) => (
                      <Line
                        key={member.id}
                        type="monotone"
                        dataKey={`pct_${member.id}`}
                        name={member.name}
                        stroke={getMemberColor(member, isDark)}
                        strokeWidth={2.4}
                        connectNulls={false}
                        dot={{ r: 2.5, strokeWidth: 1.5 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    ))
                  )
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey={singleDoseCompletedKey}
                      name={t('home.dashboard.progressCompletedDoses')}
                      stroke={singleDoseColor}
                      strokeWidth={2.5}
                      fill="url(#family-progress-fill-total)"
                      connectNulls={false}
                      dot={{ r: 3, strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="stepAfter"
                      dataKey={singleDoseTargetKey}
                      name={t('home.dashboard.progressScheduledTarget')}
                      stroke={targetLineColor}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      connectNulls={false}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Concise Footer Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--tt-border)] pt-3 text-[11px] text-[var(--tt-ink-muted)]">
            <div className="flex flex-wrap items-center gap-4">
              {metric === 'doses' ? (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span
                      className="h-0.5 w-4 rounded-full"
                      style={{ backgroundColor: singleDoseColor }}
                      aria-hidden="true"
                    />
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {t('home.dashboard.progressCompletedDoses')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span
                      className="w-4 border-t-2 border-dashed"
                      style={{ borderColor: targetLineColor }}
                      aria-hidden="true"
                    />
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {t('home.dashboard.progressScheduledTarget')}
                    </span>
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    className="w-4 border-t-2 border-dashed"
                    style={{ borderColor: targetLineColor }}
                    aria-hidden="true"
                  />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.progressScheduledTarget')} ({localiseNumber(100, language)}%)
                  </span>
                </span>
              )}
            </div>
            <span className="tabular-nums">
              {currentPointLabel
                ? `${t('home.dashboard.progressTodayMarker')}: ${currentPointLabel}`
                : null}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default FamilyProgressChart;
