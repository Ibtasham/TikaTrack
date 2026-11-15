/**
 * Smart Vaccination Dashboard
 *
 * Integrated dashboard component providing:
 * - Upcoming & due-today vaccination cards
 * - Overdue vaccination alerts
 * - Family vaccination timeline with dark-mode parity
 */

import { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import {
  generatePersonalizedSchedule,
  generateFamilyTimeline,
  calculateVaccinationStats,
  getOverdueVaccinations,
  milestoneDoseName,
} from '../lib/smartScheduler';
import { useI18n } from '../i18n';
import { formatDate, localiseNumber, parseISODate } from '../lib/format';
import type { Profile } from '../types';

const DASHBOARD_FILTERS = ['all', 'upcoming', 'overdue', 'completed'] as const;
type DashboardFilter = (typeof DASHBOARD_FILTERS)[number];

function isDashboardFilter(value: string): value is DashboardFilter {
  return (DASHBOARD_FILTERS as readonly string[]).includes(value);
}

interface SmartDashboardProps {
  profiles: Profile[];
}

export default function SmartDashboard({ profiles }: SmartDashboardProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.id || '');
  const [timelineView, setTimelineView] = useState<'month' | 'year' | 'all'>('month');
  const [filterStatus, setFilterStatus] = useState<DashboardFilter>('all');

  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  useEffect(() => {
    if (profiles.length === 0) {
      if (selectedProfile !== '') setSelectedProfile('');
      return;
    }
    if (!profiles.some((p) => p.id === selectedProfile)) {
      setSelectedProfile(profiles[0].id);
    }
  }, [profiles, selectedProfile]);

  const currentProfile = profiles.find((p) => p.id === selectedProfile);

  const stats = currentProfile
    ? calculateVaccinationStats(currentProfile.dateOfBirth, currentProfile)
    : {
        totalScheduled: 0,
        completed: 0,
        upcoming: 0,
        overdue: 0,
        dueToday: 0,
        progressPercentage: 0,
        dosesRecorded: 0,
        provisional: 0,
        needsReview: 0,
      };

  const upcomingVaccinations = currentProfile
    ? generatePersonalizedSchedule(currentProfile.dateOfBirth, currentProfile)
        .filter((d) => d.status === 'upcoming' || d.status === 'due-today')
        .slice(0, 5)
    : [];

  const overdueVaccinations = currentProfile
    ? getOverdueVaccinations(currentProfile.dateOfBirth, currentProfile)
    : [];

  const familyTimeline = generateFamilyTimeline(profiles);

  const filteredTimeline = familyTimeline.filter((event) => {
    const eventDate = parseISODate(event.date);
    if (!eventDate) return true;
    const now = new Date();

    if (timelineView === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return eventDate >= monthAgo;
    } else if (timelineView === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return eventDate >= yearAgo;
    }
    return true;
  });

  const statusFilteredTimeline = filteredTimeline.filter((event) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return event.status === 'completed';
    if (filterStatus === 'upcoming')
      return event.status === 'upcoming' || event.status === 'due-today';
    if (filterStatus === 'overdue') return event.status === 'overdue';
    return true;
  });

  if (!currentProfile) {
    return (
      <div className="card-padded p-12 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
        <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
          {language === 'en'
            ? 'No profiles available. Add a family member to get started.'
            : 'কোনো প্রোফাইল নেই। শুরু করতে একটি পরিবারের সদস্য যোগ করুন।'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2
            className={`text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('dashboard.title')}
          </h2>
          <p className={`mt-1 text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('dashboard.subtitle')}
          </p>
        </div>

        <select
          aria-label={t('scheduler.selectProfile')}
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          className="input-field w-auto"
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            <span className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {localiseNumber(stats.completed, language)}
            </span>
          </div>
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('dashboard.completed')}
          </p>
        </div>

        <div className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <Clock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <span className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
              {localiseNumber(stats.upcoming, language)}
            </span>
          </div>
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('dashboard.upcoming')}
          </p>
        </div>

        <div className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            <span className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-300">
              {localiseNumber(stats.overdue, language)}
            </span>
          </div>
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('dashboard.overdue')}
          </p>
        </div>

        <div className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <TrendingUp className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            <span className="text-3xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
              {localiseNumber(stats.progressPercentage, language)}%
            </span>
          </div>
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('dashboard.progress')}
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Vaccinations */}
        <div className="card-padded">
          <h3
            className={`mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            {t('dashboard.upcomingVaccinations')}
          </h3>

          {upcomingVaccinations.length === 0 ? (
            <p
              className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('dashboard.noUpcoming')}
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingVaccinations.map((dose) => (
                <div
                  key={dose.scheduledDoseId}
                  className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 transition-all hover:shadow-sm dark:border-blue-900 dark:bg-blue-950/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4
                        className={`mb-1 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {milestoneDoseName(dose, language)}
                      </h4>
                      <p
                        className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {formatDate(dose.scheduledDate, language)} •{' '}
                        {dose.daysUntilDue === 0
                          ? t('dashboard.today')
                          : `${localiseNumber(dose.daysUntilDue, language)} ${t('dashboard.daysUntil')}`}
                      </p>
                    </div>
                    <span className={dose.status === 'due-today' ? 'badge-due' : 'badge-upcoming'}>
                      {dose.status === 'due-today'
                        ? language === 'en'
                          ? 'Due Today'
                          : 'আজ'
                        : language === 'en'
                          ? 'Upcoming'
                          : 'আসন্ন'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Vaccinations */}
        <div className="card-padded">
          <h3
            className={`mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            {t('dashboard.overdueVaccinations')}
          </h3>

          {overdueVaccinations.length === 0 ? (
            <p
              className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('dashboard.noOverdue')}
            </p>
          ) : (
            <div className="space-y-3">
              {overdueVaccinations.map((dose) => (
                <div
                  key={dose.scheduledDoseId}
                  className="rounded-xl border border-red-200 bg-red-50/70 p-4 transition-all hover:shadow-sm dark:border-red-900 dark:bg-red-950/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4
                        className={`mb-1 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {milestoneDoseName(dose, language)}
                      </h4>
                      <p
                        className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {formatDate(dose.scheduledDate, language)} •{' '}
                        {localiseNumber(Math.abs(dose.daysUntilDue), language)}{' '}
                        {t('dashboard.daysOverdue')}
                      </p>
                    </div>
                    <span className="badge-overdue">
                      {language === 'en' ? 'Overdue' : 'বকেয়া'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Family Timeline */}
      <div className="card-padded">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3
            className={`flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t('dashboard.timeline')}
          </h3>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
              {(['month', 'year', 'all'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setTimelineView(view)}
                  className={`rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all ${
                    timelineView === view
                      ? 'bg-white text-emerald-700 shadow-sm dark:bg-neutral-900 dark:text-emerald-300'
                      : 'text-neutral-600 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-300'
                  }`}
                >
                  {t(`dashboard.${view}`)}
                </button>
              ))}
            </div>

            <select
              aria-label={t('scheduler.filterStatus')}
              value={filterStatus}
              onChange={(event) => {
                const { value } = event.target;
                if (isDashboardFilter(value)) setFilterStatus(value);
              }}
              className="input-field w-auto text-sm"
            >
              <option value="all">{language === 'en' ? 'All Status' : 'সব স্ট্যাটাস'}</option>
              <option value="completed">{t('dashboard.completed')}</option>
              <option value="upcoming">{t('dashboard.upcoming')}</option>
              <option value="overdue">{t('dashboard.overdue')}</option>
            </select>
          </div>
        </div>

        {statusFilteredTimeline.length === 0 ? (
          <p
            className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            {language === 'en' ? 'No events in this time period' : 'এই সময়ে কোনো ইভেন্ট নেই'}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-7 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 sm:left-8" />

            <div className="space-y-4">
              {statusFilteredTimeline.slice(0, 10).map((event, index) => (
                <div
                  key={`${event.profileId}-${event.vaccineId}-${event.date}-${index}`}
                  className="relative flex gap-4 sm:gap-6 animate-slide-in-right"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className="relative z-10 shrink-0">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md sm:h-16 sm:w-16 ${
                        event.status === 'completed'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : event.status === 'overdue'
                            ? 'bg-gradient-to-br from-red-500 to-pink-600'
                            : event.status === 'due-today'
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                              : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                      }`}
                    >
                      {event.status === 'completed' ? (
                        <CheckCircle2 className="h-7 w-7 text-white" />
                      ) : event.status === 'overdue' ? (
                        <AlertCircle className="h-7 w-7 text-white" />
                      ) : (
                        <Clock className="h-7 w-7 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
                    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4
                          className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {event.doseLabel?.[language] ?? event.vaccineName[language]}
                        </h4>
                        <p
                          className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {event.profileName} • {formatDate(event.date, language)}
                        </p>
                      </div>
                      <span
                        className={
                          event.status === 'completed'
                            ? 'badge-done'
                            : event.status === 'overdue'
                              ? 'badge-overdue'
                              : event.status === 'due-today'
                                ? 'badge-due'
                                : 'badge-upcoming'
                        }
                      >
                        {event.status === 'completed'
                          ? language === 'en'
                            ? 'Completed'
                            : 'সম্পন্ন'
                          : event.status === 'overdue'
                            ? language === 'en'
                              ? 'Overdue'
                              : 'বকেয়া'
                            : event.status === 'due-today'
                              ? language === 'en'
                                ? 'Due Today'
                                : 'আজ'
                              : language === 'en'
                                ? 'Upcoming'
                                : 'আসন্ন'}
                      </span>
                    </div>
                    {event.notes && (
                      <p
                        className={`mt-2 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {event.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {statusFilteredTimeline.length > 10 && (
              <p
                className={`mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {language === 'en'
                  ? `Showing 10 of ${statusFilteredTimeline.length} events`
                  : `${localiseNumber(statusFilteredTimeline.length, language)}টি ইভেন্টের মধ্যে ১০টি দেখানো হচ্ছে`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
