import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  Compass,
  Download,
  Filter,
  Printer,
  Syringe,
  TrendingUp,
  Users,
} from 'lucide-react';

import {
  LIFE_STAGE_OPTIONS,
  lifespanSchedule,
  lifeStageForAgeDays,
  type LifeStageKey,
  type LifespanMilestone,
  type ProgrammeScope,
} from '../data/lifespanSchedule';
import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails';
import { allVaccines, type Vaccine } from '../data/vaccines';
import { useProfiles } from '../contexts/ProfilesContext';
import { useI18n } from '../i18n';
import { doseNumberForMilestone } from '../lib/doseLedger';
import { downloadTextFile, printElement } from '../lib/exporters';
import {
  daysBetween,
  formatAge,
  formatDate,
  isValidISODate,
  localiseNumber,
  parseISODate,
  resolveReferenceToday,
  resolveReferenceTodayISO,
  todayISO,
} from '../lib/format';
import { buildLifespanDoseIndex, resolveLifespanVaccineRecord } from '../lib/lifespanStatus';
import {
  analyzeSchedule,
  calculateAge,
  calculateScheduledDate,
  type ScheduledDose,
} from '../lib/smartScheduler';
import { VaccineModal } from './VaccineModal';

type MilestoneStatus =
  | 'completed'
  | 'active-stage'
  | 'overdue'
  | 'due-today'
  | 'upcoming'
  | 'passed'
  | 'special'
  | 'not-due';

const PROGRAMME_SCOPES: ProgrammeScope[] = ['all', 'epi', 'recommended', 'special'];

export default function ScheduleTimeline() {
  const { profiles } = useProfiles();
  const [searchParams] = useSearchParams();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(profiles[0]?.id ?? '');
  const [birthDate, setBirthDate] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState<Vaccine | null>(null);
  const [stageFilter, setStageFilter] = useState<LifeStageKey>('all');
  const [programmeScope, setProgrammeScope] = useState<ProgrammeScope>('all');
  const [highlightedMilestoneId, setHighlightedMilestoneId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const doseIndex = useMemo(() => buildLifespanDoseIndex(lifespanSchedule), []);

  useEffect(() => {
    if (selectedMemberId && !profiles.some((p) => p.id === selectedMemberId)) {
      setSelectedMemberId('');
    }
  }, [profiles, selectedMemberId]);

  useEffect(() => {
    const memberParam = searchParams.get('member');
    if (memberParam && profiles.some((p) => p.id === memberParam)) {
      setSelectedMemberId(memberParam);
    }

    const stageParam = searchParams.get('stage');
    if (!stageParam) return;

    const milestoneMatch = lifespanSchedule.find((m) => m.id === stageParam);
    if (milestoneMatch) {
      setStageFilter(milestoneMatch.stage);
      setProgrammeScope('all');
      setHighlightedMilestoneId(milestoneMatch.id);
      requestAnimationFrame(() => {
        const el = document.getElementById(`milestone-card-${milestoneMatch.id}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    const validStage = LIFE_STAGE_OPTIONS.find((opt) => opt.key === stageParam);
    if (validStage) {
      setStageFilter(validStage.key);
      setHighlightedMilestoneId(null);
    }
  }, [profiles, searchParams]);

  const activeMember = useMemo(
    () => profiles.find((p) => p.id === selectedMemberId) ?? null,
    [profiles, selectedMemberId],
  );

  const rawEffectiveDob = activeMember ? activeMember.dateOfBirth : birthDate;
  const referenceTodayISO = resolveReferenceTodayISO();
  const isInvalidOrFutureDob = Boolean(
    rawEffectiveDob && (!isValidISODate(rawEffectiveDob) || rawEffectiveDob > referenceTodayISO),
  );
  const effectiveDob = rawEffectiveDob && !isInvalidOrFutureDob ? rawEffectiveDob : '';
  const age = useMemo(() => (effectiveDob ? calculateAge(effectiveDob) : null), [effectiveDob]);

  const currentStage = useMemo(
    () => (age ? lifeStageForAgeDays(age.days) : null),
    [age],
  );

  const memberAnalysis = useMemo(
    () => (activeMember ? analyzeSchedule(activeMember.dateOfBirth, activeMember) : null),
    [activeMember],
  );

  // Exact EPI dose-ledger schedule rows for active member
  const memberScheduleMap = useMemo(() => {
    const map = new Map<string, ScheduledDose>();
    if (!memberAnalysis) return map;
    for (const row of memberAnalysis.scheduled) {
      map.set(`${row.vaccineId}@${row.scheduledAge.days}`, row);
    }
    return map;
  }, [memberAnalysis]);

  const memberStats = memberAnalysis?.stats ?? null;

  // Life-stage milestone progress when an anonymous custom DOB is entered
  const anonymousProgress = useMemo(() => {
    if (!age) return { reached: 0, total: 0, percentage: 0 };
    const ageMilestones = lifespanSchedule.filter((item) => item.ageDays !== null);
    let reached = 0;
    for (const item of ageMilestones) {
      if (item.ageDays === null) continue;
      if (typeof item.ageMonths === 'number' && effectiveDob) {
        const target = calculateScheduledDate(effectiveDob, item.ageDays, item.ageMonths);
        if (target <= referenceTodayISO) reached += 1;
      } else if (age.days >= item.ageDays) {
        reached += 1;
      }
    }
    const total = ageMilestones.length;
    return {
      reached,
      total,
      percentage: total > 0 ? Math.round((reached / total) * 100) : 0,
    };
  }, [age, effectiveDob, referenceTodayISO]);

  const getMilestoneStatus = (item: LifespanMilestone): MilestoneStatus => {
    if (item.ageDays === null) return 'special';

    if (activeMember) {
      const epiRows = item.vaccines
        .map((v) => memberScheduleMap.get(`${v.id}@${item.ageDays}`))
        .filter((row): row is ScheduledDose => Boolean(row));

      const recordedCount = item.vaccines.filter(
        (v) =>
          resolveLifespanVaccineRecord(
            activeMember,
            item,
            v.id,
            memberScheduleMap,
            doseIndex,
          ).recorded,
      ).length;

      if (recordedCount === item.vaccines.length && item.vaccines.length > 0) {
        return 'completed';
      }
      if (epiRows.length > 0 && epiRows.every((r) => r.status === 'completed')) {
        return 'completed';
      }
    }

    if (!age) return 'not-due';

    const targetDate = effectiveDob
      ? item.ageDays === 0
        ? effectiveDob
        : calculateScheduledDate(effectiveDob, item.ageDays, item.ageMonths)
      : null;

    if (targetDate && targetDate === referenceTodayISO) return 'due-today';

    // Exact current age window
    const reachedStart = targetDate ? referenceTodayISO >= targetDate : age.days >= item.ageDays;
    const withinMax = item.maxAgeDays === undefined || age.days <= item.maxAgeDays;
    if (reachedStart && withinMax) return 'active-stage';

    if (targetDate ? referenceTodayISO < targetDate : age.days < item.ageDays) {
      const daysUntil = targetDate
        ? daysBetween(resolveReferenceToday(), parseISODate(targetDate) ?? resolveReferenceToday())
        : item.ageDays - age.days;
      return daysUntil <= 60 ? 'upcoming' : 'not-due';
    }

    // Past window: distinguish young child overdue EPI vs older adult reviewing childhood milestones
    if (age.years >= 7 && item.ageDays < 1825) {
      return 'passed';
    }
    return 'overdue';
  };

  const statusMeta = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: t('schedule.completed'),
          dotClass: 'bg-emerald-600 dark:bg-emerald-500',
          borderClass: 'border-emerald-300 dark:border-emerald-800',
          textClass: 'text-emerald-700 dark:text-emerald-300',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
        };
      case 'active-stage':
        return {
          label: t('schedule.activeStage'),
          dotClass: 'bg-emerald-600 ring-4 ring-emerald-500/15 dark:bg-emerald-500',
          borderClass: 'border-emerald-400 ring-1 ring-emerald-500/20 dark:border-emerald-600',
          textClass: 'text-emerald-700 dark:text-emerald-300',
          icon: <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
        };
      case 'overdue':
        return {
          label: t('schedule.overdue'),
          dotClass: 'bg-red-600 dark:bg-red-500',
          borderClass: 'border-red-300 dark:border-red-800',
          textClass: 'text-red-700 dark:text-red-300',
          icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
        };
      case 'due-today':
        return {
          label: t('schedule.dueToday'),
          dotClass: 'bg-amber-600 dark:bg-amber-500',
          borderClass: 'border-amber-300 dark:border-amber-800',
          textClass: 'text-amber-700 dark:text-amber-300',
          icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        };
      case 'upcoming':
        return {
          label: t('schedule.upcoming'),
          dotClass: 'bg-sky-600 dark:bg-sky-500',
          borderClass: 'border-sky-200 dark:border-sky-800',
          textClass: 'text-sky-700 dark:text-sky-300',
          icon: <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
        };
      case 'passed':
        return {
          label: t('schedule.childhoodPassed'),
          dotClass: 'bg-neutral-400 dark:bg-neutral-600',
          borderClass: '',
          textClass: 'text-neutral-500 dark:text-neutral-400',
          icon: <Clock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />,
        };
      case 'special':
        return {
          label: t('schedule.asNeeded'),
          dotClass: 'bg-teal-600 dark:bg-teal-500',
          borderClass: 'border-teal-200 dark:border-teal-900',
          textClass: 'text-teal-700 dark:text-teal-300',
          icon: <Compass className="h-5 w-5 text-teal-600 dark:text-teal-400" />,
        };
      default:
        return {
          label: t('schedule.notDue'),
          dotClass: 'bg-neutral-400 dark:bg-neutral-600',
          borderClass: '',
          textClass: 'text-neutral-500 dark:text-neutral-400',
          icon: <Clock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />,
        };
    }
  };

  // Current age spotlight milestone
  const activeStageMilestone = useMemo(() => {
    if (!currentStage) return null;
    return lifespanSchedule.find((item) => item.stage === currentStage) ?? null;
  }, [currentStage]);

  // Filtered schedule combining Life Stage AND Programme Scope cleanly
  const filteredSchedule = useMemo(() => {
    return lifespanSchedule
      .filter((item) => stageFilter === 'all' || item.stage === stageFilter)
      .map((item) => {
        if (programmeScope === 'all') return item;
        return {
          ...item,
          vaccines: item.vaccines.filter((v) => v.programme === programmeScope),
        };
      })
      .filter((item) => item.vaccines.length > 0);
  }, [stageFilter, programmeScope]);

  const handlePrint = () => {
    if (timelineRef.current) {
      printElement(timelineRef.current, t('schedule.title'));
    }
  };

  const handleDownload = () => {
    const content = filteredSchedule
      .map((item) => {
        const lines = item.vaccines.map(
          (v) => `  - ${v.doseLabel[language]} (${t(`schedule.programme.${v.programme}`)}): ${v.note[language]}`,
        );
        return `${item.age[language]} — ${item.stageLabel[language]}\n${item.summary[language]}\n${lines.join('\n')}`;
      })
      .join('\n\n');

    downloadTextFile(
      `tikatrack-all-ages-schedule-${todayISO()}.txt`,
      content,
      'text/plain;charset=utf-8',
    );
  };

  const progressPercentage = activeMember
    ? (memberStats?.progressPercentage ?? 0)
    : anonymousProgress.percentage;

  return (
    <div className="animate-slide-up">
      {/* --- Header -------------------------------------------------------- */}
      <header className="mb-8 border-b border-neutral-200/80 pb-6 dark:border-neutral-800">
        <p className="eyebrow">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('nav.schedule')}</span>
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('schedule.title')}
        </h1>
        <p className={`section-subtitle max-w-3xl ${isBangla ? 'font-bangla' : ''}`}>
          {t('schedule.subtitleLifespan')}
        </p>
      </header>

      {/* --- Member & Birth Date Selector ---------------------------------- */}
      <div className="card-padded mb-6 no-print">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
          {profiles.length > 0 && (
            <div>
              <label
                htmlFor="schedule-member-select"
                className={`label flex items-center gap-1.5 ${isBangla ? 'font-bangla' : ''}`}
              >
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
              value={rawEffectiveDob}
              onChange={(e) => {
                setSelectedMemberId('');
                setBirthDate(e.target.value);
              }}
              className="input-field"
              max={todayISO()}
            />
          </div>

          {age && (
            <div className="flex items-center gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('schedule.currentAge')}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                  {formatAge(effectiveDob, language)}
                </p>
              </div>
              <div className="border-l border-emerald-200/80 pl-4 text-right dark:border-emerald-900/60">
                <p
                  className={`text-[11px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('schedule.progress')}
                </p>
                <p className="mt-0.5 text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                  {localiseNumber(progressPercentage, language)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {isInvalidOrFutureDob && (
          <p
            role="alert"
            className={`mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('schedule.invalidDob')}
          </p>
        )}

        {/* Progress Bar */}
        {age && (
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-500"
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

        {/* Schedule Intelligence & Boundary Strip */}
        {age && (
          <div className="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`font-semibold text-neutral-800 dark:text-neutral-100 ${isBangla ? 'font-bangla' : ''}`}>
                {t('schedule.intelligence.title')}
              </span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {t(
                  'schedule.timezoneNote',
                  formatDate(referenceTodayISO, language),
                  memberStats?.timezone ?? 'Asia/Dhaka',
                )}
              </span>
            </div>
            <div className={`mt-1.5 flex flex-wrap gap-x-4 gap-y-1 ${isBangla ? 'font-bangla' : ''}`}>
              {memberAnalysis && (
                <span>
                  {t(
                    'schedule.intelligence.dueToDate',
                    memberAnalysis.stats.completedDueToDate,
                    memberAnalysis.stats.dueToDateTotal,
                  )}
                </span>
              )}
              {memberAnalysis && memberAnalysis.stats.needsReview > 0 && (
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {t('schedule.intelligence.reviewNeeded', memberAnalysis.stats.needsReview)}
                </span>
              )}
              <span>{t('schedule.intelligence.noCatchUpIntervals')}</span>
            </div>
          </div>
        )}

        {/* Current Life-Stage Focus Banner */}
        {age && currentStage && activeStageMilestone && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="min-w-0">
              <p className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                {t('schedule.currentFocusTitle')}
              </p>
              <p className={`text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                {t(
                  'schedule.currentFocusSubtitle',
                  formatAge(effectiveDob, language),
                  t(`schedule.stage.${currentStage}`),
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {stageFilter !== currentStage ? (
                <button
                  type="button"
                  onClick={() => setStageFilter(currentStage)}
                  className="btn-primary btn-sm whitespace-nowrap shrink-0"
                >
                  {t('schedule.jumpToCurrentStage')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStageFilter('all')}
                  className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                >
                  {t('schedule.showFullTimeline')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Life-Stage Filter Strip + Programme Scope + Actions ----------- */}
      <div className="mb-6 space-y-3 no-print">
        <div
          role="group"
          aria-label={t('schedule.filter')}
          className="segmented-group flex w-full flex-wrap"
        >
          {LIFE_STAGE_OPTIONS.map((option) => {
            const active = stageFilter === option.key;
            const isCurrent = currentStage === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStageFilter(option.key)}
                className={`segmented-tab shrink-0 ${
                  active
                    ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300'
                    : isCurrent
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : ''
                } ${isBangla ? 'font-bangla' : ''}`}
              >
                {t(option.labelKey)}
                <span className="ml-1 text-[11px] opacity-70 tabular-nums">
                  {option.ageBand[language]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
            <div className="segmented-group">
              {PROGRAMME_SCOPES.map((scope) => {
                const active = programmeScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProgrammeScope(scope)}
                    className={`segmented-tab shrink-0 ${
                      active ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300' : ''
                    } ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {t(`schedule.scope.${scope}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500 tabular-nums dark:text-neutral-400">
              {t('schedule.milestoneCount', filteredSchedule.length)}
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : ''}>{t('schedule.print')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="btn-secondary btn-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : ''}>{t('schedule.download')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Timeline ------------------------------------------------------ */}
      {filteredSchedule.length === 0 ? (
        <div className="card-padded text-center">
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('schedule.emptyFiltered')}
          </p>
          <button
            type="button"
            className="btn-secondary btn-sm mt-4"
            onClick={() => {
              setStageFilter('all');
              setProgrammeScope('all');
            }}
          >
            {t('schedule.resetFilters')}
          </button>
        </div>
      ) : (
        <div ref={timelineRef} className="print-area relative">
          <div
            className="absolute top-0 bottom-0 left-6 hidden w-0.5 bg-neutral-200 sm:block dark:bg-neutral-800"
            aria-hidden="true"
          />

          <div className="space-y-6">
            {filteredSchedule.map((item) => {
              const status = getMilestoneStatus(item);
              const meta = statusMeta(status);
              const targetDate =
                effectiveDob && item.ageDays !== null && item.ageDays > 0
                  ? calculateScheduledDate(effectiveDob, item.ageDays, item.ageMonths)
                  : effectiveDob && item.ageDays === 0
                    ? effectiveDob
                    : null;
              const targetParsed = targetDate ? parseISODate(targetDate) : null;
              const targetDeltaDays =
                targetParsed !== null
                  ? daysBetween(resolveReferenceToday(), targetParsed)
                  : item.ageDays !== null && age
                    ? item.ageDays - age.days
                    : null;
              const basisText =
                targetDate && item.ageDays !== null
                  ? typeof item.ageMonths === 'number'
                    ? t('schedule.basis.ageMonths', localiseNumber(item.ageMonths, language))
                    : item.ageDays === 0
                      ? t('schedule.basis.birth')
                      : t('schedule.basis.ageDays', localiseNumber(item.ageDays, language))
                  : null;

              return (
                <section
                  id={`milestone-card-${item.id}`}
                  key={item.id}
                  aria-labelledby={`milestone-heading-${item.id}`}
                  className="relative flex gap-4 sm:gap-6"
                >
                  {/* Timeline Node */}
                  <div className="relative z-10 hidden shrink-0 sm:block">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm ${meta.dotClass}`}
                      aria-hidden="true"
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : status === 'overdue' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  {/* Milestone Card */}
                  <div
                    className={`card-padded flex-1 transition-shadow ${meta.borderClass} ${
                      highlightedMilestoneId === item.id
                        ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-950'
                        : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 pb-4 dark:border-neutral-800">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400 ${isBangla ? 'font-bangla' : ''}`}>
                          {item.stageLabel[language]}
                        </p>
                        <h2
                          id={`milestone-heading-${item.id}`}
                          className={`mt-1 text-xl font-bold text-neutral-900 tabular-nums dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {item.age[language]}
                        </h2>
                        <p className={`mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                          <span className={meta.textClass}>{meta.label}</span>
                          {targetDate && (
                            <>
                              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {t('schedule.targetDate')}: {formatDate(targetDate, language)}
                              </span>
                            </>
                          )}
                          {targetDeltaDays !== null && (
                            <>
                              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                              <span className="text-neutral-500 dark:text-neutral-400">
                                {targetDeltaDays <= 0
                                  ? targetDeltaDays === 0
                                    ? t('schedule.dueToday')
                                    : `${localiseNumber(Math.abs(targetDeltaDays), language)} ${language === 'en' ? 'days ago' : 'দিন আগে'}`
                                  : `${localiseNumber(targetDeltaDays, language)} ${language === 'en' ? 'days left' : 'দিন বাকি'}`}
                              </span>
                            </>
                          )}
                          {basisText && (
                            <>
                              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                              <span className="text-neutral-500 dark:text-neutral-400">{basisText}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div aria-hidden="true">{meta.icon}</div>
                    </div>

                    <p className={`mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                      {item.summary[language]}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {item.vaccines.map((vaccine, vIndex) => {
                        const vaccineData = allVaccines.find((v) => v.id === vaccine.id);
                        const clinical = vaccineData ? getVaccineClinicalProfile(vaccineData) : null;
                        const resolved = resolveLifespanVaccineRecord(
                          activeMember,
                          item,
                          vaccine.id,
                          memberScheduleMap,
                          doseIndex,
                        );
                        const recordedDate = resolved.date;
                        const isRecorded = resolved.recorded;
                        const doseNum =
                          item.ageDays !== null
                            ? doseNumberForMilestone(vaccine.id, item.ageDays) ??
                              resolved.suggestedDoseNumber
                            : resolved.suggestedDoseNumber;

                        return (
                          <div
                            key={`${vaccine.id}-${vIndex}`}
                            className={`flex flex-col justify-between gap-2.5 rounded-xl border p-4 transition-colors ${
                              isRecorded
                                ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                                : 'border-neutral-200 bg-neutral-50/60 hover:border-emerald-300 dark:border-neutral-800 dark:bg-neutral-800/40 dark:hover:border-emerald-800'
                            }`}
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
                              className={`flex items-start gap-3 text-left ${vaccineData ? 'cursor-pointer' : ''}`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                  isRecorded
                                    ? 'border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                    : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                                }`}
                                aria-hidden="true"
                              >
                                {isRecorded ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Syringe className="h-4 w-4" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                                  {vaccine.doseLabel[language]}
                                </p>
                                <p className={`mt-0.5 text-xs font-medium text-neutral-500 tabular-nums dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                                  <span>{t(`schedule.programme.${vaccine.programme}`)}</span>
                                  {vaccineData?.efficacy ? (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span>{vaccineData.efficacy}</span>
                                    </>
                                  ) : null}
                                </p>
                                <p className={`mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                                  {vaccine.note[language]}
                                </p>
                                {clinical && (
                                  <p className={`mt-1 line-clamp-1 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                                    {clinical.route[language]}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 pt-2.5 text-xs dark:border-neutral-800">
                              {isRecorded ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  {recordedDate
                                    ? t('schedule.recordedOn', formatDate(recordedDate, language))
                                    : t('schedule.completed')}
                                </span>
                              ) : activeMember ? (
                                <Link
                                  to={`/tracker?member=${encodeURIComponent(activeMember.id)}&vaccine=${encodeURIComponent(vaccine.id)}&dose=${doseNum}&action=record`}
                                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400 no-print"
                                >
                                  <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('schedule.recordDose')}
                                </Link>
                              ) : vaccineData ? (
                                <Link
                                  to={`/vaccines/${vaccineData.id}`}
                                  className="link text-xs font-medium no-print"
                                >
                                  {t('vaccines.detail.openFullProfile')}
                                </Link>
                              ) : null}

                              {vaccineData && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedVaccine(vaccineData)}
                                  className="ml-auto text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white no-print"
                                >
                                  {t('vaccines.detail.quickOverview')}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Vaccine Modal */}
      {selectedVaccine && (
        <VaccineModal vaccine={selectedVaccine} onClose={() => setSelectedVaccine(null)} />
      )}
    </div>
  );
}
