import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  TriangleAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChildGrowthChart } from '../components/ChildGrowthChart';
import { PageSkeleton } from '../components/Skeleton';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { allVaccines } from '../data/vaccines';
import { downloadCSV, printElement } from '../lib/exporters';
import { formatDate, formatMonth, localiseNumber, monthKey, parseISODate } from '../lib/format';
import {
  calculateVaccinationStats,
  generatePersonalizedSchedule,
  getNextUpcomingVaccination,
} from '../lib/smartScheduler';

const STATUS_COLOURS = {
  completed: '#059669',
  'due-today': '#d97706',
  upcoming: '#2563eb',
  overdue: '#dc2626',
} as const;

type StatusKey = keyof typeof STATUS_COLOURS;

/** How far back the activity chart looks, in months. */
const ACTIVITY_MONTHS = 12;

/**
 * `/analytics` — progress reporting.
 *
 * Every number on this page is derived from the same scheduler the tracker uses,
 * so the two can never disagree. Charts are lazy-loaded with the route because
 * recharts is by far the heaviest dependency in the bundle and most sessions
 * never open this page.
 */
export default function AnalyticsPage() {
  const { t, language } = useI18n();
  const { profiles, ready } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [memberFilter, setMemberFilter] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const vaccineById = useMemo(
    () => new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine])),
    [],
  );

  const scoped = useMemo(
    () =>
      memberFilter === 'all' ? profiles : profiles.filter((profile) => profile.id === memberFilter),
    [memberFilter, profiles],
  );

  const perMember = useMemo(
    () =>
      scoped.map((profile) => ({
        profile,
        stats: calculateVaccinationStats(profile.dateOfBirth, profile),
        next: getNextUpcomingVaccination(profile.dateOfBirth, profile),
      })),
    [scoped],
  );

  const totals = useMemo(() => {
    const sum = perMember.reduce(
      (accumulator, { stats }) => ({
        totalScheduled: accumulator.totalScheduled + stats.totalScheduled,
        completed: accumulator.completed + stats.completed,
        upcoming: accumulator.upcoming + stats.upcoming,
        overdue: accumulator.overdue + stats.overdue,
        dueToday: accumulator.dueToday + stats.dueToday,
      }),
      { totalScheduled: 0, completed: 0, upcoming: 0, overdue: 0, dueToday: 0 },
    );
    const progress =
      sum.totalScheduled > 0 ? Math.round((sum.completed / sum.totalScheduled) * 100) : 0;
    return { ...sum, progress };
  }, [perMember]);

  const statusData = useMemo(
    () =>
      (['completed', 'due-today', 'upcoming', 'overdue'] as StatusKey[])
        .map((status) => ({
          name: t(`analytics.legend.${status === 'due-today' ? 'dueToday' : status}`),
          value: totals[status === 'due-today' ? 'dueToday' : status],
          fill: STATUS_COLOURS[status],
        }))
        .filter((entry) => entry.value > 0),
    [t, totals],
  );

  const memberData = useMemo(
    () =>
      perMember.map(({ profile, stats }) => ({
        name: profile.name,
        completed: stats.completed,
        remaining: Math.max(stats.totalScheduled - stats.completed, 0),
        progress: stats.progressPercentage,
      })),
    [perMember],
  );

  /** Doses recorded per month over the trailing window, for the activity chart. */
  const activityData = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; doses: number }> = [];
    for (let offset = ACTIVITY_MONTHS - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({ key: monthKey(date), label: formatMonth(monthKey(date), language), doses: 0 });
    }
    const index = new Map(buckets.map((bucket, position) => [bucket.key, position]));

    for (const profile of scoped) {
      // Every administered dose is its own ledger event, so a three-dose series
      // recorded in one month now counts three — it used to count one.
      for (const event of profile.events ?? []) {
        const parsed = parseISODate(event.date);
        if (!parsed) continue;
        const position = index.get(monthKey(parsed));
        if (position !== undefined) buckets[position].doses += 1;
      }
    }
    return buckets;
  }, [language, scoped]);

  /** Completion rate grouped by vaccine category. */
  const categoryData = useMemo(() => {
    const byCategory = new Map<string, { scheduled: number; completed: number }>();
    for (const profile of scoped) {
      for (const dose of generatePersonalizedSchedule(profile.dateOfBirth, profile)) {
        const category = vaccineById.get(dose.vaccineId)?.category ?? 'non_routine';
        const entry = byCategory.get(category) ?? { scheduled: 0, completed: 0 };
        entry.scheduled += 1;
        if (dose.status === 'completed') entry.completed += 1;
        byCategory.set(category, entry);
      }
    }
    return [...byCategory.entries()]
      .map(([category, { scheduled, completed }]) => ({
        name: t(`vaccines.category.${category}`),
        percent: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
        scheduled,
        completed,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [scoped, t, vaccineById]);

  const handleExport = () => {
    const rows: unknown[][] = [
      [
        'Member',
        'Date of birth',
        'Scheduled',
        'Completed',
        'Due today',
        'Upcoming',
        'Overdue',
        'Progress %',
        'Next dose',
        'Next date',
      ],
      ...perMember.map(({ profile, stats, next }) => [
        profile.name,
        profile.dateOfBirth,
        stats.totalScheduled,
        stats.completed,
        stats.dueToday,
        stats.upcoming,
        stats.overdue,
        stats.progressPercentage,
        next ? next.vaccineName.en : '',
        next ? next.scheduledDate : '',
      ]),
    ];
    downloadCSV(`tikatrack-analytics-${rows.length - 1}.csv`, rows);
    toast.success(t('common.actions.download'), t('analytics.export.csv'));
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    if (!printElement(printRef.current, t('analytics.title')))
      toast.error(t('common.status.error'));
  };

  if (!ready) return <PageSkeleton />;

  if (profiles.length === 0) {
    return (
      <div className="page-shell text-center">
        <h1 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>{t('analytics.title')}</h1>
        <div className="card-padded mx-auto mt-8 max-w-lg">
          <BarChart3
            className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600"
            aria-hidden="true"
          />
          <h2
            className={`mt-4 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('analytics.empty.title')}
          </h2>
          <p
            className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('analytics.empty.body')}
          </p>
          <Link to="/tracker" className="btn-primary mt-5">
            {t('analytics.empty.cta')}
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      key: 'analytics.stats.completed',
      value: totals.completed,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'analytics.stats.due',
      value: totals.dueToday + totals.upcoming,
      icon: Clock,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'analytics.stats.overdue',
      value: totals.overdue,
      icon: TriangleAlert,
      tone: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'analytics.stats.profiles',
      value: scoped.length,
      icon: Users,
      tone: 'text-neutral-600 dark:text-neutral-300',
    },
  ];

  return (
    <div className="page-shell">
      <header className="no-print">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          {t('nav.analytics')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('analytics.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('analytics.subtitle')}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-3 no-print">
        <div>
          <label className="label" htmlFor="analytics-member">
            {t('analytics.table.member')}
          </label>
          <select
            id="analytics-member"
            className="input-field min-w-52"
            value={memberFilter}
            onChange={(event) => setMemberFilter(event.target.value)}
          >
            <option value="all">{t('analytics.member.all')}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-secondary" onClick={handleExport}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('analytics.export.csv')}
        </button>
        <button type="button" className="btn-ghost" onClick={handlePrint}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          {t('common.actions.print')}
        </button>
      </div>

      <div ref={printRef} className="print-area">
        {/* --- Stat cards -------------------------------------------------- */}
        <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ key, value, icon: Icon, tone }) => (
            <div key={key} className="card-padded">
              <dt
                className={`flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
                {t(key)}
              </dt>
              <dd className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">
                {localiseNumber(value, language)}
              </dd>
            </div>
          ))}
        </dl>

        {/* --- Overall progress ------------------------------------------- */}
        <div className="card-padded mt-5">
          <h2
            className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <TrendingUp
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            {t('analytics.stats.overall')}
          </h2>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={totals.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('analytics.stats.overall')}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                style={{ width: `${totals.progress}%` }}
              />
            </div>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {localiseNumber(totals.progress, language)}%
            </span>
          </div>
          <p
            className={`mt-3 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {totals.overdue > 0
              ? t('analytics.insight.overdue', totals.overdue)
              : t('analytics.insight.onTrack')}
          </p>
        </div>

        {/* --- Charts ----------------------------------------------------- */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="card-padded">
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('analytics.chart.statusTitle')}
            </h2>
            {statusData.length === 0 ? (
              <p
                className={`mt-6 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('analytics.noChartData')}
              </p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-padded">
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('analytics.chart.completionTitle')}
            </h2>
            {memberData.length === 0 ? (
              <p
                className={`mt-6 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('analytics.noChartData')}
              </p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="completed"
                      name={t('analytics.legend.completed')}
                      stackId="a"
                      fill={STATUS_COLOURS.completed}
                    />
                    <Bar
                      dataKey="remaining"
                      name={t('analytics.legend.upcoming')}
                      stackId="a"
                      fill="#a7f3d0"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-padded">
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('analytics.chart.timelineTitle')}
            </h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="doses"
                    name={t('analytics.stats.completed')}
                    stroke={STATUS_COLOURS.completed}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-padded">
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('analytics.coverage')}
            </h2>
            {categoryData.length === 0 ? (
              <p
                className={`mt-6 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('analytics.noChartData')}
              </p>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar
                      dataKey="percent"
                      name={t('analytics.legend.completed')}
                      fill={STATUS_COLOURS.completed}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* --- Child Growth & WHO Standards ------------------------------- */}
        <div className="mt-5">
          <ChildGrowthChart
            preferredProfileId={memberFilter !== 'all' ? memberFilter : undefined}
          />
        </div>

        {/* --- Per-member table ------------------------------------------- */}
        <div className="card mt-5 overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">{t('analytics.chart.completionTitle')}</caption>
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  {[
                    'analytics.table.member',
                    'analytics.table.progress',
                    'analytics.table.next',
                    'analytics.table.status',
                  ].map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className={`px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perMember.map(({ profile, stats, next }) => (
                  <tr
                    key={profile.id}
                    className="border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <th
                      scope="row"
                      className={`px-4 py-3 text-left font-medium text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {profile.name}
                      <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                        {formatDate(profile.dateOfBirth, language)}
                      </span>
                    </th>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${stats.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                          {localiseNumber(stats.progressPercentage, language)}%
                        </span>
                      </div>
                      <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                        {localiseNumber(stats.completed, language)} /{' '}
                        {localiseNumber(stats.totalScheduled, language)}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {next ? (
                        <>
                          {next.vaccineName[language]}
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                            {formatDate(next.scheduledDate, language)}
                          </span>
                        </>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {stats.overdue > 0 ? (
                        <span className="badge-overdue">
                          {t('tracker.status.overdue')} · {localiseNumber(stats.overdue, language)}
                        </span>
                      ) : stats.dueToday > 0 ? (
                        <span className="badge-due">{t('tracker.status.dueToday')}</span>
                      ) : next ? (
                        <span className="badge-upcoming">{t('tracker.status.upcoming')}</span>
                      ) : (
                        <span className="badge-done">{t('tracker.status.noneDue')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
