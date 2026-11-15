/**
 * Smart Vaccination Scheduler
 *
 * Intelligent scheduling component that provides:
 * - Automatic age-based vaccination schedules
 * - Date-of-birth-based schedule generation
 * - Dose-by-dose tracking
 * - Upcoming/overdue/completed identification
 * - Personalized schedules for each family member
 */

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Printer,
  Search,
  Info,
  Users,
  X,
  ClipboardPlus,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { downloadTextFile } from '../lib/exporters';
import { formatAge, formatDate, localiseNumber, todayISO } from '../lib/format';
import {
  generatePersonalizedSchedule,
  calculateAge,
  milestoneDoseName,
  type ScheduledDose,
} from '../lib/smartScheduler';
import type { Profile } from '../types';

interface SmartSchedulerProps {
  profiles: Profile[];
}

export default function SmartScheduler({ profiles }: SmartSchedulerProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.id || '');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);

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

  // Generate personalized schedule
  const personalizedSchedule = useMemo(() => {
    if (!currentProfile) return [];
    return generatePersonalizedSchedule(currentProfile.dateOfBirth, currentProfile);
  }, [currentProfile]);

  const age = currentProfile ? calculateAge(currentProfile.dateOfBirth) : null;

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = personalizedSchedule.filter((d) => d.status === 'completed').length;
    const upcoming = personalizedSchedule.filter((d) => d.status === 'upcoming').length;
    const overdue = personalizedSchedule.filter((d) => d.status === 'overdue').length;
    const dueToday = personalizedSchedule.filter((d) => d.status === 'due-today').length;
    const total = personalizedSchedule.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, upcoming, overdue, dueToday, total, progress };
  }, [personalizedSchedule]);

  // Filter schedule
  const filteredSchedule = useMemo(() => {
    let filtered = personalizedSchedule;

    if (ageFilter !== 'all' && age) {
      filtered = filtered.filter((dose) => {
        const ageDays = dose.scheduledAge.days;
        switch (ageFilter) {
          case 'newborn':
            return ageDays >= 0 && ageDays <= 28;
          case 'infant':
            return ageDays > 28 && ageDays <= 365;
          case 'toddler':
            return ageDays > 365 && ageDays <= 1825;
          case 'child':
            return ageDays > 1825 && ageDays <= 3650;
          case 'adolescent':
            return ageDays > 3650 && ageDays <= 6570;
          case 'adult':
            return ageDays > 6570;
          default:
            return true;
        }
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((dose) => dose.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dose) =>
          dose.vaccineName.en.toLowerCase().includes(query) ||
          dose.vaccineName.bn.includes(searchQuery),
      );
    }

    return filtered;
  }, [personalizedSchedule, ageFilter, statusFilter, searchQuery, age]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const content = personalizedSchedule
      .map(
        (dose) =>
          `${dose.scheduledDate} - ${milestoneDoseName(dose, language)} (${dose.status})`,
      )
      .join('\n');

    downloadTextFile(
      `vaccination-schedule-${currentProfile?.name || 'profile'}-${todayISO()}.txt`,
      content,
      'text/plain;charset=utf-8',
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-done';
      case 'due-today':
        return 'badge-due';
      case 'overdue':
        return 'badge-overdue';
      case 'upcoming':
        return 'badge-upcoming';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-white" />;
      case 'due-today':
        return <Clock className="h-6 w-6 text-white" />;
      case 'overdue':
        return <AlertCircle className="h-6 w-6 text-white" />;
      case 'upcoming':
        return <TrendingUp className="h-6 w-6 text-white" />;
      default:
        return <Clock className="h-6 w-6 text-white" />;
    }
  };

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
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
              <Calendar className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('scheduler.title')}
            </h2>
          </div>
          <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('scheduler.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : ''}>{t('scheduler.print')}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : ''}>{t('scheduler.download')}</span>
          </button>
        </div>
      </div>

      {/* Profile Selector and Age Display */}
      <div className="card-padded">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="scheduler-profile-select"
              className={`label ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('scheduler.selectProfile')}
            </label>
            <select
              id="scheduler-profile-select"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="input-field"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          {age && (
            <div className="flex items-end gap-6">
              <div>
                <p
                  className={`mb-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('scheduler.currentAge')}
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAge(currentProfile.dateOfBirth, language)}
                </p>
              </div>
              <div>
                <p
                  className={`mb-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('scheduler.progress')}
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {localiseNumber(stats.progress, language)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-neutral-600 dark:text-neutral-300">
            <span className="tabular-nums">
              {localiseNumber(stats.completed, language)} {t('scheduler.completed')}
            </span>
            <span className="tabular-nums">
              {localiseNumber(stats.total, language)} {language === 'en' ? 'total' : 'মোট'}
            </span>
          </div>
        </div>
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
            {t('scheduler.completed')}
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
            {t('scheduler.upcoming')}
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
            {t('scheduler.overdue')}
          </p>
        </div>

        <div className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <TrendingUp className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            <span className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {localiseNumber(stats.dueToday, language)}
            </span>
          </div>
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('scheduler.dueToday')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-padded no-print">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="scheduler-age-filter" className={`label ${isBangla ? 'font-bangla' : ''}`}>
              {t('scheduler.filterAge')}
            </label>
            <select
              id="scheduler-age-filter"
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t('scheduler.all')}</option>
              <option value="newborn">{t('scheduler.newborn')}</option>
              <option value="infant">{t('scheduler.infant')}</option>
              <option value="toddler">{t('scheduler.toddler')}</option>
              <option value="child">{t('scheduler.child')}</option>
              <option value="adolescent">{t('scheduler.adolescent')}</option>
              <option value="adult">{t('scheduler.adult')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="scheduler-status-filter"
              className={`label ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('scheduler.filterStatus')}
            </label>
            <select
              id="scheduler-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">{t('scheduler.all')}</option>
              <option value="completed">{t('scheduler.completed')}</option>
              <option value="upcoming">{t('scheduler.upcoming')}</option>
              <option value="overdue">{t('scheduler.overdue')}</option>
              <option value="due-today">{t('scheduler.dueToday')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="scheduler-search" className={`label ${isBangla ? 'font-bangla' : ''}`}>
              {t('scheduler.search')}
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="scheduler-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('scheduler.search')}
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="card-padded">
        <h3
          className={`mb-6 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          {language === 'en' ? 'Vaccination Schedule' : 'টিকাদান সূচি'}
        </h3>

        {filteredSchedule.length === 0 ? (
          <p
            className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            {language === 'en'
              ? 'No vaccines match your filters'
              : 'আপনার ফিল্টারের সাথে কোনো টিকা মিলে না'}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-7 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 sm:left-8" />

            <div className="space-y-4">
              {filteredSchedule.map((dose, index) => (
                <div
                  key={dose.scheduledDoseId}
                  className="relative flex cursor-pointer gap-4 sm:gap-6 animate-slide-in-right transition-transform hover:translate-x-0.5"
                  style={{ animationDelay: `${index * 0.03}s` }}
                  onClick={() => setSelectedDose(dose)}
                >
                  {/* Timeline Dot */}
                  <div className="relative z-10 shrink-0">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md sm:h-16 sm:w-16 ${
                        dose.status === 'completed'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : dose.status === 'overdue'
                            ? 'bg-gradient-to-br from-red-500 to-pink-600'
                            : dose.status === 'due-today'
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                              : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                      }`}
                    >
                      {getStatusIcon(dose.status)}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-1">
                    <div
                      className={`rounded-2xl border-2 bg-neutral-50/70 p-4 sm:p-5 transition-all hover:shadow-md dark:bg-neutral-800/50 ${
                        dose.status === 'completed'
                          ? 'border-emerald-300 dark:border-emerald-800'
                          : dose.status === 'overdue'
                            ? 'border-red-300 dark:border-red-800'
                            : dose.status === 'due-today'
                              ? 'border-amber-300 dark:border-amber-800'
                              : 'border-blue-200 dark:border-blue-900'
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4
                            className={`mb-1.5 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {milestoneDoseName(dose, language)}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={getStatusColor(dose.status)}>
                              {dose.status === 'completed'
                                ? t('scheduler.completed')
                                : dose.status === 'due-today'
                                  ? t('scheduler.dueToday')
                                  : dose.status === 'overdue'
                                    ? t('scheduler.overdue')
                                    : t('scheduler.upcoming')}
                            </span>
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                              {formatDate(dose.scheduledDate, language)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {dose.status === 'upcoming' && (
                            <p className="text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                              {localiseNumber(dose.daysUntilDue, language)} {t('scheduler.daysUntil')}
                            </p>
                          )}
                          {dose.status === 'overdue' && (
                            <p className="text-sm font-semibold tabular-nums text-red-700 dark:text-red-300">
                              {localiseNumber(Math.abs(dose.daysUntilDue), language)}{' '}
                              {t('scheduler.daysOverdue')}
                            </p>
                          )}
                          {dose.status === 'due-today' && (
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                              {t('scheduler.today')}
                            </p>
                          )}
                          {dose.status === 'completed' && dose.actualDate && (
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                              {formatDate(dose.actualDate, language)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className={isBangla ? 'font-bangla' : ''}>
                            {t('scheduler.recommended')}{' '}
                            {localiseNumber(dose.scheduledAge.months || 0, language)}{' '}
                            {language === 'en' ? 'months' : 'মাস'}
                          </span>
                        </span>
                        {dose.status !== 'completed' && (
                          <Link
                            to={`/tracker?member=${encodeURIComponent(currentProfile.id)}&vaccine=${encodeURIComponent(dose.vaccineId)}&dose=${dose.doseNumber}&action=record`}
                            onClick={(e) => e.stopPropagation()}
                            className="btn-ghost btn-sm no-print"
                          >
                            <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('schedule.recordDose')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vaccine Detail Modal */}
      {selectedDose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedDose(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl animate-scale-in dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2
                    className={`mb-2 text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {milestoneDoseName(selectedDose, language)}
                  </h2>
                  <span className={getStatusColor(selectedDose.status)}>
                    {selectedDose.status === 'completed'
                      ? t('scheduler.completed')
                      : selectedDose.status === 'due-today'
                        ? t('scheduler.dueToday')
                        : selectedDose.status === 'overdue'
                          ? t('scheduler.overdue')
                          : t('scheduler.upcoming')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDose(null)}
                  className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label={t('common.a11y.closeMenu')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40">
                  <h3
                    className={`mb-2 font-semibold text-blue-900 dark:text-blue-200 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t('scheduler.why')}
                  </h3>
                  <p
                    className={`text-sm text-blue-800 dark:text-blue-100 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {selectedDose.explanation[language]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800">
                    <p
                      className={`mb-1 text-sm text-neutral-600 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('scheduler.recommended')}
                    </p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {localiseNumber(selectedDose.scheduledAge.months || 0, language)}{' '}
                      {language === 'en' ? 'months' : 'মাস'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800">
                    <p
                      className={`mb-1 text-sm text-neutral-600 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('scheduler.dose')}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(selectedDose.doseNumber, language)} /{' '}
                      {localiseNumber(
                        selectedDose.scheduledDoseCount || selectedDose.totalDoses,
                        language,
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800">
                  <p
                    className={`mb-1 text-sm text-neutral-600 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t('scheduler.source')}
                  </p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {selectedDose.source}
                  </p>
                  <p
                    className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t('scheduler.verified')}: {selectedDose.lastVerified}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
