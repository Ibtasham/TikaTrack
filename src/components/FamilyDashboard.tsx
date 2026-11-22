import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  IdCard,
  MapPin,
  Phone,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { useI18n } from '../i18n';
import { relativeDays } from '../lib/botContext';
import { formatAge, formatDate, localiseNumber } from '../lib/format';
import { analyzeSchedule, milestoneDoseName, type ScheduledDose } from '../lib/smartScheduler';
import { computeGrowthProgress } from '../lib/whoGrowth';
import type { Profile } from '../types';

interface FamilyDashboardProps {
  profiles: Profile[];
}

interface TimelineItem {
  profile: Profile;
  dose: ScheduledDose;
}

interface ReviewItem {
  profile: Profile;
  overdueDoses: ScheduledDose[];
  needsReviewCount: number;
  anomalyCount: number;
}

export function FamilyDashboard({ profiles }: FamilyDashboardProps) {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const memberSummaries = useMemo(() => {
    return profiles.map((member) => {
      const analysis = analyzeSchedule(member.dateOfBirth, member);
      const growth = computeGrowthProgress(member.growth ?? []);
      return { member, analysis, growth };
    });
  }, [profiles]);

  const aggregate = useMemo(() => {
    let completedDue = 0;
    let totalDue = 0;
    let totalCompleted = 0;
    let totalScheduled = 0;
    let confirmed = 0;
    let provisional = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let needsReviewTotal = 0;

    for (const { analysis } of memberSummaries) {
      completedDue += analysis.stats.completedDueToDate;
      totalDue += analysis.stats.dueToDateTotal;
      totalCompleted += analysis.stats.completed;
      totalScheduled += analysis.stats.totalScheduled;
      confirmed += analysis.stats.confirmedCompleted;
      provisional += analysis.stats.provisionalCompleted;
      overdueCount += analysis.potentiallyOverdue.length;
      dueTodayCount += analysis.dueToday.length;
      needsReviewTotal += analysis.stats.needsReview + analysis.anomalies.length;
    }

    const eligibleRate = totalDue > 0 ? Math.round((completedDue / totalDue) * 100) : 100;
    const confirmedShare =
      totalDue > 0 ? Math.min(100, Math.round((confirmed / Math.max(totalDue, totalCompleted)) * 100)) : 100;

    return {
      completedDue,
      totalDue,
      totalCompleted,
      totalScheduled,
      confirmed,
      provisional,
      overdueCount,
      dueTodayCount,
      needsReviewTotal,
      eligibleRate,
      confirmedShare,
    };
  }, [memberSummaries]);

  const upcomingTimeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const { member, analysis } of memberSummaries) {
      for (const dose of analysis.dueToday) {
        items.push({ profile: member, dose });
      }
      for (const dose of analysis.upcoming.slice(0, 4)) {
        items.push({ profile: member, dose });
      }
    }
    items.sort((a, b) => a.dose.daysUntilDue - b.dose.daysUntilDue);
    return items.slice(0, 6);
  }, [memberSummaries]);

  const reviewQueue = useMemo<ReviewItem[]>(() => {
    return memberSummaries
      .map(({ member, analysis }) => ({
        profile: member,
        overdueDoses: analysis.potentiallyOverdue,
        needsReviewCount: analysis.stats.needsReview,
        anomalyCount: analysis.anomalies.length,
      }))
      .filter(
        (item) =>
          item.overdueDoses.length > 0 || item.needsReviewCount > 0 || item.anomalyCount > 0,
      );
  }, [memberSummaries]);

  if (profiles.length === 0) return null;

  return (
    <section
      aria-label={t('home.dashboard.eyebrow')}
      className="border-b border-neutral-200/80 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/30"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Header & Quick Actions Strip */}
        <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between dark:border-neutral-800">
          <div>
            <p className={`eyebrow ${isBangla ? 'font-bangla' : ''}`}>
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('home.dashboard.eyebrow')}</span>
            </p>
            <h2
              className={`mt-1.5 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.family.title')}
            </h2>
            <p
              className={`mt-1 text-sm text-neutral-600 dark:text-neutral-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.family.subtitle')}
            </p>
          </div>

          <nav aria-label={t('home.dashboard.quickActions')} className="flex flex-wrap gap-2">
            <Link to="/tracker" className="btn-primary btn-sm">
              <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.action.record')}
              </span>
            </Link>
            <Link to="/schedule" className="btn-secondary btn-sm">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.action.schedule')}
              </span>
            </Link>
            <Link to="/passport" className="btn-secondary btn-sm">
              <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.action.passport')}
              </span>
            </Link>
            <Link to="/centres" className="btn-ghost btn-sm">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.action.centres')}
              </span>
            </Link>
            <Link to="/reminders" className="btn-ghost btn-sm">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('home.dashboard.action.reminders')}
              </span>
            </Link>
          </nav>
        </div>

        {/* Row 1: Vaccination Completion Overview + Overdue & Record Review */}
        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          {/* Completion Overview */}
          <div className="card-padded lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`stat-label ${isBangla ? 'font-bangla' : ''}`}>
                  {t('home.dashboard.completionTitle')}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-700 tabular-nums sm:text-4xl dark:text-emerald-400">
                    {localiseNumber(aggregate.eligibleRate, language)}%
                  </span>
                  <span
                    className={`text-xs font-medium text-neutral-600 dark:text-neutral-400 ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    {t('home.dashboard.eligibleLabel')} (
                    <span className="tabular-nums">
                      {localiseNumber(aggregate.completedDue, language)}/
                      {localiseNumber(aggregate.totalDue, language)}
                    </span>
                    )
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="tabular-nums">
                    {t('home.dashboard.confirmedDoses', localiseNumber(aggregate.confirmed, language))}
                  </span>
                </span>
                {aggregate.provisional > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {t('home.dashboard.provisionalDoses', localiseNumber(aggregate.provisional, language))}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div
              className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={aggregate.eligibleRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('home.dashboard.completionTitle')}
            >
              <div
                className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
                style={{ width: `${aggregate.eligibleRate}%` }}
              />
            </div>

            <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200/80 border-t border-neutral-200/80 pt-4 dark:divide-neutral-800 dark:border-neutral-800">
              <div className="pr-3">
                <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t('home.command.members')}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                  {localiseNumber(profiles.length, language)}
                </dd>
              </div>
              <div className="px-3">
                <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t('home.command.completed')}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {localiseNumber(aggregate.totalCompleted, language)}
                  <span className="text-xs font-normal text-neutral-400">
                    /{localiseNumber(aggregate.totalScheduled, language)}
                  </span>
                </dd>
              </div>
              <div className="pl-3">
                <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {t('home.command.attention')}
                </dt>
                <dd
                  className={`mt-0.5 text-lg font-bold tabular-nums ${
                    aggregate.overdueCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : aggregate.dueTodayCount > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-neutral-900 dark:text-white'
                  }`}
                >
                  {localiseNumber(aggregate.overdueCount + aggregate.dueTodayCount, language)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Overdue & Record Review */}
          <div className="card-padded flex flex-col justify-between lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={`flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  <ShieldAlert
                    className={`h-4 w-4 ${
                      reviewQueue.length > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{t('home.dashboard.reviewTitle')}</span>
                </h3>
                {reviewQueue.length > 0 && (
                  <span className="text-xs font-semibold tabular-nums text-red-700 dark:text-red-400">
                    {localiseNumber(aggregate.overdueCount + aggregate.needsReviewTotal, language)}
                  </span>
                )}
              </div>

              {reviewQueue.length === 0 ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <p className={isBangla ? 'font-bangla' : undefined}>
                    {t('home.dashboard.reviewClear')}
                  </p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-neutral-200/80 dark:divide-neutral-800">
                  {reviewQueue.slice(0, 3).map((item) => {
                    const topOverdue = item.overdueDoses[0];
                    const reviewTotal = item.needsReviewCount + item.anomalyCount;
                    return (
                      <li
                        key={item.profile.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold text-neutral-900 dark:text-white ${
                              isBangla ? 'font-bangla' : ''
                            }`}
                          >
                            {item.profile.name}
                          </p>
                          {topOverdue ? (
                            <p className="mt-0.5 truncate text-xs text-red-700 dark:text-red-400">
                              {milestoneDoseName(topOverdue, language)} ·{' '}
                              {t(
                                'home.dashboard.overdueItem',
                                formatDate(topOverdue.scheduledDate, language),
                              )}
                              {item.overdueDoses.length > 1
                                ? ` (+${localiseNumber(item.overdueDoses.length - 1, language)})`
                                : ''}
                            </p>
                          ) : (
                            <p className="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-300">
                              {t(
                                'home.dashboard.reviewRecordsHint',
                                localiseNumber(reviewTotal, language),
                              )}
                            </p>
                          )}
                        </div>
                        <Link
                          to={`/tracker?member=${encodeURIComponent(item.profile.id)}${
                            topOverdue ? '&view=catchup' : ''
                          }`}
                          className="btn-secondary btn-sm shrink-0"
                        >
                          <span className={isBangla ? 'font-bangla' : undefined}>
                            {t('home.dashboard.reviewButton')}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4 border-t border-neutral-200/80 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <Link to="/analytics" className="btn-link inline-flex items-center gap-1">
                <span>{t('nav.analytics')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Row 2: Upcoming Timeline + Family Health Record Summaries */}
        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          {/* Upcoming Vaccination Timeline */}
          <div className="card-padded lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>{t('home.dashboard.timelineTitle')}</span>
              </h3>
              <Link to="/schedule" className="btn-link text-xs">
                {t('nav.schedule')}
              </Link>
            </div>

            {upcomingTimeline.length === 0 ? (
              <p
                className={`mt-4 rounded-lg border border-neutral-200/80 bg-neutral-50 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.timelineEmpty')}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200/80 dark:divide-neutral-800">
                {upcomingTimeline.map(({ profile, dose }) => (
                  <li
                    key={`${profile.id}-${dose.scheduledDoseId}`}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-semibold text-neutral-900 dark:text-white ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {milestoneDoseName(dose, language)}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {profile.name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(dose.scheduledDate, language)}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            dose.status === 'due-today'
                              ? 'font-semibold text-amber-700 dark:text-amber-300'
                              : ''
                          }
                        >
                          {relativeDays(dose.daysUntilDue, language)}
                        </span>
                      </p>
                    </div>
                    <Link
                      to={`/tracker?member=${encodeURIComponent(profile.id)}&vaccine=${encodeURIComponent(
                        dose.vaccineId,
                      )}&dose=${dose.doseNumber}&action=record`}
                      className="btn-secondary btn-sm shrink-0"
                    >
                      {t('home.dashboard.recordDose')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Family Health Record Summaries */}
          <div className="card-padded lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                <Activity className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>{t('home.dashboard.recordsTitle')}</span>
              </h3>
              <Link to="/tracker" className="btn-link text-xs">
                {t('home.family.openTracker')}
              </Link>
            </div>

            <div className="mt-3 divide-y divide-neutral-200/80 dark:divide-neutral-800">
              {memberSummaries.map(({ member, analysis, growth }) => {
                const nextDose = analysis.dueToday[0] ?? analysis.upcoming[0];
                return (
                  <Link
                    key={member.id}
                    to={`/tracker?member=${encodeURIComponent(member.id)}`}
                    className="group flex flex-col gap-2.5 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                        aria-hidden="true"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <p
                            className={`truncate text-sm font-bold text-neutral-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400 ${
                              isBangla ? 'font-bangla' : ''
                            }`}
                          >
                            {member.name}
                          </p>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {formatAge(member.dateOfBirth, language)}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="tabular-nums">
                            {growth.checkupCount > 0
                              ? `${
                                  growth.latestWeightKg !== undefined
                                    ? `${localiseNumber(growth.latestWeightKg, language)} kg`
                                    : ''
                                }${
                                  growth.latestWeightKg !== undefined &&
                                  growth.latestHeightCm !== undefined
                                    ? ' · '
                                    : ''
                                }${
                                  growth.latestHeightCm !== undefined
                                    ? `${localiseNumber(growth.latestHeightCm, language)} cm`
                                    : ''
                                }`
                              : t('home.dashboard.noGrowthYet')}
                          </span>
                          {nextDose && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">
                                {t('home.family.nextLabel')}: {milestoneDoseName(nextDose, language)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pl-12 sm:justify-end sm:pl-0">
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {localiseNumber(analysis.stats.ageEligibleProgressPercentage, language)}%
                        </p>
                        <p className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {t(
                            'home.dashboard.dosesSummary',
                            localiseNumber(analysis.stats.completedDueToDate, language),
                            localiseNumber(analysis.stats.dueToDateTotal, language),
                          )}
                        </p>
                      </div>
                      {analysis.potentiallyOverdue.length > 0 ? (
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-label={t('tracker.status.overdue')} />
                      ) : analysis.dueToday.length > 0 ? (
                        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label={t('tracker.status.dueToday')} />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Contextual Educational Information & DGHS Helpline */}
        <div className="mt-5 rounded-xl border border-neutral-200/90 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
            <h3
              className={`flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>{t('home.dashboard.educationTitle')}</span>
            </h3>
            <a
              href="tel:16263"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('about.hotline')}: 16263</span>
            </a>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p
                className={`text-xs font-bold text-neutral-900 dark:text-white ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education1Title')}
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education1Body')}
              </p>
            </div>
            <div>
              <p
                className={`text-xs font-bold text-neutral-900 dark:text-white ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education2Title')}
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education2Body')}
              </p>
            </div>
            <div>
              <p
                className={`text-xs font-bold text-neutral-900 dark:text-white ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education3Title')}
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('home.dashboard.education3Body')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export default FamilyDashboard;
