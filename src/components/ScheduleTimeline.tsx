import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  Filter,
  ClipboardPlus,
  Users,
} from 'lucide-react';
import { allVaccines, schedule, vaccineColors, type Vaccine } from '../data/vaccines';
import { VaccineModal } from './VaccineModal';
import { useProfiles } from '../contexts/ProfilesContext';
import { useI18n } from '../i18n';
import { downloadTextFile, printElement } from '../lib/exporters';
import { formatAge, formatDate, localiseNumber, todayISO } from '../lib/format';
import { doseNumberForMilestone } from '../lib/doseLedger';
import {
  calculateAge,
  calculateVaccinationStats,
  generatePersonalizedSchedule,
  type ScheduledDose,
} from '../lib/smartScheduler';

export default function ScheduleTimeline() {
  const { profiles } = useProfiles();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(profiles[0]?.id ?? '');
  const [birthDate, setBirthDate] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState<Vaccine | null>(null);
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const timelineRef = useRef<HTMLDivElement>(null);

  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  useEffect(() => {
    if (selectedMemberId && !profiles.some((p) => p.id === selectedMemberId)) {
      setSelectedMemberId('');
    }
  }, [profiles, selectedMemberId]);

  const activeMember = useMemo(
    () => profiles.find((p) => p.id === selectedMemberId) ?? null,
    [profiles, selectedMemberId],
  );

  const effectiveDob = activeMember ? activeMember.dateOfBirth : birthDate;
  const age = useMemo(() => (effectiveDob ? calculateAge(effectiveDob) : null), [effectiveDob]);

  // Real dose-level schedule when a saved family member is selected.
  const memberScheduleMap = useMemo(() => {
    const map = new Map<string, ScheduledDose>();
    if (!activeMember) return map;
    for (const row of generatePersonalizedSchedule(activeMember.dateOfBirth, activeMember)) {
      map.set(`${row.vaccineId}@${row.scheduledAge.days}`, row);
    }
    return map;
  }, [activeMember]);

  const memberStats = useMemo(
    () =>
      activeMember ? calculateVaccinationStats(activeMember.dateOfBirth, activeMember) : null,
    [activeMember],
  );

  // Anonymous age-milestone calculation when inspecting a custom DOB without a profile.
  const anonymousProgress = useMemo(() => {
    if (!age) return { reached: 0, total: 0, percentage: 0 };
    let reached = 0;
    let total = 0;
    for (const item of schedule) {
      for (const _v of item.vaccines) {
        total += 1;
        if (age.days >= item.ageDays) reached += 1;
      }
    }
    return {
      reached,
      total,
      percentage: total > 0 ? Math.round((reached / total) * 100) : 0,
    };
  }, [age]);

  const getMilestoneStatus = (ageDays: number, vaccinesAtAge: typeof schedule[number]['vaccines']) => {
    if (activeMember) {
      const rows = vaccinesAtAge
        .map((v) => memberScheduleMap.get(`${v.id}@${ageDays}`))
        .filter((row): row is ScheduledDose => Boolean(row));
      if (rows.length > 0) {
        if (rows.every((r) => r.status === 'completed')) return 'completed';
        if (rows.some((r) => r.status === 'overdue')) return 'overdue';
        if (rows.some((r) => r.status === 'due-today')) return 'due-today';
        if (rows.some((r) => r.status === 'upcoming') && age && age.days >= ageDays - 30) {
          return 'upcoming';
        }
        return 'not-due';
      }
    }
    if (!age) return 'not-due';
    if (age.days >= ageDays + 30) return 'overdue';
    if (age.days === ageDays) return 'due-today';
    if (age.days > ageDays) return 'due';
    if (age.days >= ageDays - 30) return 'upcoming';
    return 'not-due';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-done';
      case 'overdue':
        return 'badge-overdue';
      case 'due':
      case 'due-today':
        return 'badge-due';
      case 'upcoming':
        return 'badge-upcoming';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('schedule.completed');
      case 'overdue':
        return t('schedule.overdue');
      case 'due-today':
      case 'due':
        return t('schedule.dueToday');
      case 'upcoming':
        return t('schedule.upcoming');
      default:
        return t('schedule.notDue');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'due':
      case 'due-today':
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'upcoming':
        return <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />;
    }
  };

  // Filter schedule by age group
  const filteredSchedule = useMemo(() => {
    if (ageFilter === 'all') return schedule;

    const ageRanges: Record<string, [number, number]> = {
      newborn: [0, 28],
      infant: [29, 365],
      toddler: [366, 1825],
    };

    const [min, max] = ageRanges[ageFilter] || [0, Infinity];
    return schedule.filter((item) => item.ageDays >= min && item.ageDays <= max);
  }, [ageFilter]);

  const handlePrint = () => {
    if (timelineRef.current) {
      printElement(timelineRef.current, t('schedule.title'));
    }
  };

  const handleDownload = () => {
    const content = schedule
      .map(
        (item) =>
          `${item.age[language]}:\n${item.vaccines.map((v) => `  - ${v.name[language]}`).join('\n')}`,
      )
      .join('\n\n');

    downloadTextFile(
      `vaccination-schedule-${todayISO()}.txt`,
      content,
      'text/plain;charset=utf-8',
    );
  };

  const progressPercentage = activeMember
    ? (memberStats?.progressPercentage ?? 0)
    : anonymousProgress.percentage;

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
            <Calendar className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1
            className={`text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('schedule.title')}
          </h1>
        </div>
        <p
          className={`text-lg text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('schedule.subtitle')}
        </p>
      </div>

      {/* Member & Birth Date Selector */}
      <div className="card-padded mb-8 no-print">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
          {profiles.length > 0 && (
            <div>
              <label
                htmlFor="schedule-member-select"
                className={`label flex items-center gap-1.5 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('schedule.selectMember')}
              </label>
              <select
                id="schedule-member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="input-field"
              >
                <option value="">{t('schedule.customDob')}</option>
                {profiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({formatAge(member.dateOfBirth, language)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="schedule-dob-input" className={`label ${isBangla ? 'font-bangla' : ''}`}>
              {t('schedule.enterBirthDate')}
            </label>
            <input
              id="schedule-dob-input"
              type="date"
              value={effectiveDob}
              onChange={(e) => {
                setSelectedMemberId('');
                setBirthDate(e.target.value);
              }}
              className="input-field"
              max={todayISO()}
            />
          </div>

          {age && (
            <div className="flex items-center gap-4 rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/30">
              <div className="flex-1">
                <p
                  className={`text-xs font-medium text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('schedule.currentAge')}
                </p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAge(effectiveDob, language)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xs font-medium text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('schedule.progress')}
                </p>
                <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {localiseNumber(progressPercentage, language)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {age && (
          <div className="mt-4">
            <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              {activeMember && memberStats ? (
                <p className={isBangla ? 'font-bangla' : ''}>
                  {t('schedule.memberDosesRecorded', memberStats.completed, memberStats.totalScheduled)}
                </p>
              ) : (
                <p className={isBangla ? 'font-bangla' : ''}>
                  {t('schedule.milestonesReached', anonymousProgress.reached, anonymousProgress.total)}
                </p>
              )}
              {!activeMember && (
                <Link to="/tracker" className="link text-xs">
                  {t('schedule.recordNotice')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3 no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span className={isBangla ? 'font-bangla' : ''}>{t('schedule.print')}</span>
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="btn-secondary flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className={isBangla ? 'font-bangla' : ''}>{t('schedule.download')}</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-5 w-5 text-neutral-600 dark:text-neutral-300" aria-hidden="true" />
          <select
            aria-label={t('schedule.filter')}
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">{t('schedule.all')}</option>
            <option value="newborn">{t('schedule.newborn')}</option>
            <option value="infant">{t('schedule.infant')}</option>
            <option value="toddler">{t('schedule.toddler')}</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="print-area relative">
        <div className="absolute top-0 bottom-0 left-7 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 sm:left-8" />

        <div className="space-y-6">
          {filteredSchedule.map((item, index) => {
            const status = getMilestoneStatus(item.ageDays, item.vaccines);

            return (
              <div
                key={item.ageDays}
                className="relative flex gap-4 sm:gap-6 animate-slide-in-right"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {/* Timeline Dot */}
                <div className="relative z-10 shrink-0">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md sm:h-16 sm:w-16 ${
                      status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : status === 'overdue'
                          ? 'bg-gradient-to-br from-red-500 to-red-600'
                          : status === 'due' || status === 'due-today'
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                            : status === 'upcoming'
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                              : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-7 w-7 text-white" />
                    ) : (
                      <Clock className="h-7 w-7 text-white" />
                    )}
                  </div>
                  {status === 'overdue' && (
                    <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600">
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Content Card */}
                <div className="flex-1">
                  <div
                    className={`card-padded transition-all hover:shadow-lg ${
                      status === 'completed'
                        ? 'border-emerald-300 dark:border-emerald-800'
                        : status === 'overdue'
                          ? 'border-2 border-red-300 dark:border-red-800'
                          : status === 'due' || status === 'due-today'
                            ? 'border-2 border-amber-300 dark:border-amber-800'
                            : ''
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className={`mb-2 text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {item.age[language]}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={getStatusColor(status)}>{getStatusLabel(status)}</span>
                          {age && (
                            <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                              {age.days >= item.ageDays
                                ? `${localiseNumber(age.days - item.ageDays, language)} ${language === 'en' ? 'days ago' : 'দিন আগে'}`
                                : `${localiseNumber(item.ageDays - age.days, language)} ${language === 'en' ? 'days left' : 'দিন বাকি'}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {item.vaccines.map((vaccine, vIndex) => {
                        const vaccineData = allVaccines.find((v) => v.id === vaccine.id);
                        const colorConfig =
                          vaccineColors[vaccineData?.color || 'emerald'] || vaccineColors.emerald;
                        const memberDose = memberScheduleMap.get(`${vaccine.id}@${item.ageDays}`);
                        const doseNum =
                          memberDose?.doseNumber ??
                          doseNumberForMilestone(vaccine.id, item.ageDays) ??
                          1;

                        return (
                          <div
                            key={`${vaccine.id}-${vIndex}`}
                            className={`${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} flex flex-col justify-between gap-2 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md`}
                          >
                            <div
                              onClick={() => vaccineData && setSelectedVaccine(vaccineData)}
                              onKeyDown={(e) => {
                                if (vaccineData && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  setSelectedVaccine(vaccineData);
                                }
                              }}
                              role={vaccineData ? 'button' : undefined}
                              tabIndex={vaccineData ? 0 : undefined}
                              className={`flex items-center gap-3 ${vaccineData ? 'cursor-pointer' : ''}`}
                            >
                              <span className="text-3xl" aria-hidden="true">
                                {vaccineData?.icon || '💉'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`font-bold ${isBangla ? 'font-bangla' : ''}`}>
                                  {vaccine.name[language]}
                                </p>
                                {vaccineData && (
                                  <p className="text-xs opacity-90">
                                    {vaccineData.efficacy}{' '}
                                    {language === 'en' ? 'effective' : 'কার্যকর'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {activeMember && memberDose && (
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/25 pt-2 text-xs">
                                {memberDose.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    {memberDose.actualDate
                                      ? formatDate(memberDose.actualDate, language)
                                      : t('schedule.completed')}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-medium opacity-95">
                                      {getStatusLabel(memberDose.status)}
                                    </span>
                                    <Link
                                      to={`/tracker?member=${encodeURIComponent(activeMember.id)}&vaccine=${encodeURIComponent(vaccine.id)}&dose=${doseNum}&action=record`}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white/25 px-2 py-1 font-semibold hover:bg-white/35 no-print"
                                    >
                                      <ClipboardPlus className="h-3 w-3" aria-hidden="true" />
                                      {t('schedule.recordDose')}
                                    </Link>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vaccine Modal */}
      {selectedVaccine && (
        <VaccineModal vaccine={selectedVaccine} onClose={() => setSelectedVaccine(null)} />
      )}
    </div>
  );
}
