import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  BriefcaseMedical,
  CalendarClock,
  CheckCircle2,
  Compass,
  Download,
  HeartPulse,
  MapPin,
  Plane,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Syringe,
  Users,
} from 'lucide-react';

import {
  evaluateScenarioReadiness,
  READINESS_SCENARIOS,
  type ReadinessPriority,
  type ReadinessScenarioId,
} from '../data/readinessScenarios';
import { useProfiles } from '../contexts/ProfilesContext';
import { useI18n } from '../i18n';
import { downloadTextFile } from '../lib/exporters';
import { formatAge, formatDate, localiseNumber } from '../lib/format';

const SCENARIO_ICONS: Record<ReadinessScenarioId, typeof Compass> = {
  hajj: Compass,
  travel: Plane,
  pregnancy: Baby,
  occupational: BriefcaseMedical,
  chronic: HeartPulse,
  senior: ShieldCheck,
};

const PRIORITY_STYLES: Record<ReadinessPriority, string> = {
  mandatory: 'text-red-700 dark:text-red-400',
  essential: 'text-amber-700 dark:text-amber-400',
  recommended: 'text-emerald-700 dark:text-emerald-400',
  situational: 'text-sky-700 dark:text-sky-400',
};

export default function ReadinessPage() {
  const { t, language } = useI18n();
  const { profiles } = useProfiles();
  const isBangla = language === 'bn';

  const [selectedScenarios, setSelectedScenarios] = useState<ReadinessScenarioId[]>(['hajj']);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id ?? '');
  const [targetDate, setTargetDate] = useState<string>('');

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const evaluation = useMemo(
    () => evaluateScenarioReadiness(selectedScenarios, activeProfile, targetDate || undefined),
    [selectedScenarios, activeProfile, targetDate],
  );

  const toggleScenario = (id: ReadinessScenarioId) => {
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDownloadSummary = () => {
    const lines: string[] = [
      `TikaTrack — ${t('readiness.title')}`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      activeProfile ? `Member: ${activeProfile.name} (${activeProfile.dateOfBirth})` : 'Mode: General checklist',
      targetDate ? `Target date: ${targetDate}` : '',
      '',
      ...evaluation.items.map((item, i) => {
        const statusLabel =
          item.status === 'recorded'
            ? `[RECORDED x${item.recordedCount}]`
            : '[ACTION NEEDED]';
        const deadline = item.latestClinicDate ? ` | Latest clinic date: ${item.latestClinicDate}` : '';
        return `${i + 1}. ${statusLabel} ${item.vaccine.name[language]} (${item.vaccine.fullName[language]})\n   - Timing: ${item.recommendation.timingLabel[language]}${deadline}\n   - Why: ${item.recommendation.rationale[language]}`;
      }),
      '',
      'Bangladesh Health Hotline: 16263',
    ].filter(Boolean);

    downloadTextFile(
      `tikatrack-readiness-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
      'text/plain;charset=utf-8',
    );
  };

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className={`eyebrow ${isBangla ? 'font-bangla' : ''}`}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('readiness.eyebrow')}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
              {t('readiness.title')}
            </h1>
            <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
              {t('readiness.subtitle')}
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={evaluation.items.length === 0}
              className="btn-secondary btn-sm whitespace-nowrap shrink-0"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>{t('readiness.actions.print')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSummary}
              disabled={evaluation.items.length === 0}
              className="btn-primary btn-sm whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>{t('readiness.actions.download')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Step 1: Scenario Picker */}
      <section aria-labelledby="readiness-scenarios-heading" className="space-y-3">
        <h2
          id="readiness-scenarios-heading"
          className={`text-sm font-bold tracking-wide text-neutral-800 uppercase dark:text-neutral-200 ${
            isBangla ? 'font-bangla' : ''
          }`}
        >
          {t('readiness.stepScenarios')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {READINESS_SCENARIOS.map((scenario) => {
            const Icon = SCENARIO_ICONS[scenario.id];
            const active = selectedScenarios.includes(scenario.id);
            return (
              <button
                key={scenario.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleScenario(scenario.id)}
                className={`flex h-full cursor-pointer flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-emerald-600 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/40'
                    : 'border-neutral-200 bg-white hover:border-emerald-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-800'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      active
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {localiseNumber(scenario.recommendations.length, language)}{' '}
                    {isBangla ? 'টি টিকা' : 'vaccines'}
                  </span>
                </div>
                <p
                  className={`mt-3 font-bold text-neutral-900 dark:text-white ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {scenario.title[language]}
                </p>
                <p
                  className={`mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {scenario.subtitle[language]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Member + Target Date Context */}
      <section
        aria-labelledby="readiness-context-heading"
        className="card-padded grid gap-5 bg-white md:grid-cols-2 dark:bg-neutral-900"
      >
        <div className="md:col-span-2">
          <h2
            id="readiness-context-heading"
            className={`text-sm font-bold tracking-wide text-neutral-800 uppercase dark:text-neutral-200 ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('readiness.stepContext')}
          </h2>
        </div>

        <div>
          <label
            htmlFor="readiness-member-select"
            className={`label flex items-center gap-1.5 ${isBangla ? 'font-bangla' : ''}`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            {t('readiness.memberLabel')}
          </label>
          <select
            id="readiness-member-select"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="input-field mt-1"
          >
            <option value="">{t('readiness.memberGuest')}</option>
            {profiles.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({formatAge(member.dateOfBirth, language)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="readiness-target-date"
            className={`label flex items-center gap-1.5 ${isBangla ? 'font-bangla' : ''}`}
          >
            <CalendarClock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            {evaluation.scenarioList[0]?.defaultTargetLabel[language] ?? t('readiness.targetDateLabel')}
          </label>
          <input
            id="readiness-target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="input-field mt-1"
          />
          <p className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
            {t('readiness.targetDateHint')}
          </p>
        </div>
      </section>

      {/* Empty selection state */}
      {evaluation.items.length === 0 ? (
        <div className="card-padded text-center">
          <p className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('readiness.emptySelection')}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Strip (unified hairline grid) */}
          <dl className="grid gap-px overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-200/80 sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
            <div className="bg-white p-4 sm:p-5 dark:bg-neutral-900">
              <dt className={`stat-label ${isBangla ? 'font-bangla' : ''}`}>
                {t('readiness.summaryTotal')}
              </dt>
              <dd className="stat-value mt-1">
                {localiseNumber(evaluation.items.length, language)}
              </dd>
            </div>
            <div className="bg-white p-4 sm:p-5 dark:bg-neutral-900">
              <dt className={`stat-label ${isBangla ? 'font-bangla' : ''}`}>
                {t('readiness.summaryRecorded')}
              </dt>
              <dd className="stat-value mt-1 text-emerald-700 dark:text-emerald-400">
                {localiseNumber(evaluation.recordedCount, language)}
              </dd>
            </div>
            <div className="bg-white p-4 sm:p-5 dark:bg-neutral-900">
              <dt className={`stat-label ${isBangla ? 'font-bangla' : ''}`}>
                {t('readiness.summaryNeeded')}
              </dt>
              <dd
                className={`stat-value mt-1 ${
                  evaluation.neededCount > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {localiseNumber(evaluation.neededCount, language)}
              </dd>
            </div>
          </dl>

          {/* Active Scenario Clinic Tips */}
          <div className="grid gap-4 lg:grid-cols-2">
            {evaluation.scenarioList.map((scenario) => (
              <div
                key={scenario.id}
                className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30"
              >
                <p
                  className={`text-xs font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-300 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {scenario.title[language]} · {t('readiness.clinicGuidance')}
                </p>
                <p
                  className={`mt-1.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {scenario.summary[language]}
                </p>
                <p
                  className={`mt-2 border-t border-emerald-200/60 pt-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:text-emerald-200 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {scenario.clinicTip[language]}
                </p>
              </div>
            ))}
          </div>

          {/* Checklist Cards */}
          <ul className="space-y-4">
            {evaluation.items.map((item) => {
              const { recommendation, vaccine, clinical } = item;
              return (
                <li
                  key={vaccine.id}
                  className="card-padded bg-white dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Zero-pill inline clinical priority + status line */}
                      <p
                        className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        <span className={PRIORITY_STYLES[recommendation.priority]}>
                          {t(`readiness.priority.${recommendation.priority}`)}
                        </span>
                        {recommendation.certificateNote && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className="text-neutral-600 dark:text-neutral-300">
                              {recommendation.certificateNote[language]}
                            </span>
                          </>
                        )}
                      </p>

                      <h3
                        className={`mt-1 text-lg font-bold text-neutral-900 dark:text-white ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {vaccine.name[language]} — {vaccine.fullName[language]}
                      </h3>
                      <p className={`text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                        {vaccine.disease[language]} · {clinical.platform[language]}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {item.status === 'recorded' ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>
                              {item.matchedViaEquivalent
                                ? t('readiness.status.equivalent', item.recordedCount)
                                : t('readiness.status.recorded', item.recordedCount)}
                            </span>
                          </span>
                          {item.hasUnconfirmedRecords && (
                            <p
                              className={`mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 ${isBangla ? 'font-bangla' : ''}`}
                            >
                              {t('readiness.status.unconfirmedNote')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                          <span>{t('readiness.status.needed')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-neutral-100 pt-3 text-sm md:grid-cols-2 dark:border-neutral-800">
                    <div>
                      <p className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                        {recommendation.timingLabel[language]}
                      </p>
                      <p className={`mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                        {recommendation.rationale[language]}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {t('readiness.routeSiteLabel')}
                      </p>
                      <p className={isBangla ? 'font-bangla' : undefined}>
                        {clinical.route[language]} · {clinical.doseVolume[language]}
                      </p>
                      <p className={`text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                        {clinical.coldChain[language]}
                      </p>
                    </div>
                  </div>

                  {item.latestClinicDate && (
                    <div
                      className={`mt-3 flex flex-wrap items-center gap-2 rounded-xl border p-2.5 text-xs ${
                        item.tightWindow
                          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200'
                      }`}
                    >
                      {item.tightWindow ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                      ) : (
                        <CalendarClock className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                      )}
                      <span className="font-semibold">
                        {t('readiness.deadlineLabel')}: {formatDate(item.latestClinicDate, language)}
                      </span>
                      {item.tightWindow && (
                        <span className={isBangla ? 'font-bangla' : undefined}>
                          — {t('readiness.tightWindowAlert')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="no-print mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <Link
                      to={`/vaccines/${vaccine.id}`}
                      className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                    >
                      <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('readiness.actions.viewMonograph')}</span>
                    </Link>
                    <Link
                      to={activeProfile ? `/tracker?member=${encodeURIComponent(activeProfile.id)}` : '/tracker'}
                      className="btn-ghost btn-sm whitespace-nowrap shrink-0"
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('readiness.actions.logInTracker')}</span>
                    </Link>
                    <Link
                      to="/centres"
                      className="btn-link ml-auto inline-flex items-center gap-1 text-xs whitespace-nowrap shrink-0"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('readiness.actions.findCentres')}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p
        className={`rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 ${
          isBangla ? 'font-bangla' : ''
        }`}
      >
        {t('readiness.disclaimer')}
      </p>
    </div>
  );
}
