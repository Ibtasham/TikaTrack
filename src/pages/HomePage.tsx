import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Cloud,
  CloudOff,
  Compass,
  IdCard,
  MapPin,
  Search,
  ShieldCheck,
  Snowflake,
  Syringe,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { AnimatedCounter } from '../components/AnimatedCounter';
import { FamilyDashboard } from '../components/FamilyDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfilesContext';
import { allVaccinationCentres } from '../data/vaccinationCentres';
import { allVaccines, schedule } from '../data/vaccines';
import { useI18n } from '../i18n';
import { openCommandPalette } from '../lib/commandPalette';
import { localiseNumber } from '../lib/format';
import { calculateVaccinationStats } from '../lib/smartScheduler';

interface Feature {
  to: string;
  icon: typeof Calendar;
  titleKey: string;
  bodyKey: string;
  metaKey: string;
}

const CORE_WORKFLOWS: Feature[] = [
  {
    to: '/schedule',
    icon: Calendar,
    titleKey: 'home.features.schedule.title',
    bodyKey: 'home.features.schedule.body',
    metaKey: 'home.features.schedule.meta',
  },
  {
    to: '/tracker',
    icon: Users,
    titleKey: 'home.features.tracker.title',
    bodyKey: 'home.features.tracker.body',
    metaKey: 'home.features.tracker.meta',
  },
  {
    to: '/centres',
    icon: MapPin,
    titleKey: 'home.features.centres.title',
    bodyKey: 'home.features.centres.body',
    metaKey: 'home.features.centres.meta',
  },
  {
    to: '/passport',
    icon: IdCard,
    titleKey: 'home.features.passport.title',
    bodyKey: 'home.features.passport.body',
    metaKey: 'home.features.passport.meta',
  },
];

const DIAGNOSTIC_TOOLS: Feature[] = [
  {
    to: '/readiness',
    icon: Compass,
    titleKey: 'home.features.readiness.title',
    bodyKey: 'home.features.readiness.body',
    metaKey: 'home.features.readiness.meta',
  },
  {
    to: '/tikabot',
    icon: Bot,
    titleKey: 'home.features.bot.title',
    bodyKey: 'home.features.bot.body',
    metaKey: 'home.features.bot.meta',
  },
  {
    to: '/cold-chain',
    icon: Snowflake,
    titleKey: 'home.features.coldchain.title',
    bodyKey: 'home.features.coldchain.body',
    metaKey: 'home.features.coldchain.meta',
  },
  {
    to: '/analytics',
    icon: BarChart3,
    titleKey: 'home.features.analytics.title',
    bodyKey: 'home.features.analytics.body',
    metaKey: 'home.features.analytics.meta',
  },
];

export default function HomePage() {
  const { t, language } = useI18n();
  const { user, backend } = useAuth();
  const { profiles, persistent, ready } = useProfiles();
  const isBangla = language === 'bn';

  const [epiStageIdx, setEpiStageIdx] = useState(0);
  const [panelView, setPanelView] = useState<'household' | 'explorer'>('household');

  const stats = useMemo(() => {
    const districts = new Set(allVaccinationCentres.map((centre) => centre.district));
    const divisions = new Set(allVaccinationCentres.map((centre) => centre.division));
    const doses = allVaccines.reduce((total, vaccine) => total + (vaccine.doses || 0), 0);
    return [
      { key: 'home.stats.vaccines', value: allVaccines.length },
      { key: 'home.stats.centres', value: allVaccinationCentres.length },
      { key: 'home.stats.districts', value: districts.size },
      { key: 'home.stats.divisions', value: divisions.size },
      { key: 'home.stats.doses', value: doses },
    ];
  }, []);

  const familyOverview = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let completed = 0;
    for (const member of profiles) {
      const s = calculateVaccinationStats(member.dateOfBirth, member);
      overdue += s.overdue;
      dueToday += s.dueToday;
      completed += s.completed;
    }
    return { overdue, dueToday, completed };
  }, [profiles]);

  const activeEpiStage = schedule[epiStageIdx] ?? schedule[0];
  const showingExplorer = profiles.length === 0 || panelView === 'explorer';

  return (
    <>
      {/* --- Clinical Editorial Hero ---------------------------------------- */}
      <section className="bg-clinical-grid border-b border-[var(--tt-border)] bg-[var(--tt-card)]/35">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <p className={`eyebrow flex-wrap ${isBangla ? 'font-bangla' : ''}`}>
              <span>DGHS EPI · WHO GROWTH STANDARDS</span>
              <span className="opacity-45" aria-hidden="true">
                ·
              </span>
              <span>{t('home.hero.eyebrowMeta')}</span>
            </p>

            <h1
              className={`mt-4 max-w-2xl text-3xl leading-[1.1] font-extrabold tracking-tight text-balance text-[var(--tt-ink)] sm:text-5xl ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.hero.title')}
            </h1>

            <p
              className={`mt-5 max-w-2xl text-base leading-relaxed text-[var(--tt-ink-muted)] sm:text-lg ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/tracker" className="btn-primary">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.secondary')}
                </span>
              </Link>
              <Link to="/schedule" className="btn-secondary">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.primary')}
                </span>
              </Link>
              <Link to="/tikabot" className="btn-ghost">
                <Bot className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.tertiary')}
                </span>
              </Link>
            </div>

            {!persistent && ready && (
              <p className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.banner.notPersistent')}
                </span>
              </p>
            )}
          </div>

          {/* Clinical Family Command & Interactive EPI Milestone Panel */}
          <aside className="rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--tt-border)] pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                  {showingExplorer ? t('home.explorer.eyebrow') : t('home.command.eyebrow')}
                </p>
                <h2
                  className={`mt-1 text-base font-bold text-[var(--tt-ink)] ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {showingExplorer ? t('home.explorer.title') : t('home.family.title')}
                </h2>
              </div>
              <Link
                to="/auth"
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--tt-accent)] hover:underline"
              >
                {user && backend !== 'local' ? (
                  <>
                    <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('home.command.synced')}</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('home.command.localMode')}</span>
                  </>
                )}
              </Link>
            </div>

            {profiles.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="segmented-group" role="group" aria-label={t('home.command.eyebrow')}>
                  <button
                    type="button"
                    aria-pressed={panelView === 'household'}
                    onClick={() => setPanelView('household')}
                    className={`segmented-tab ${
                      panelView === 'household'
                        ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300'
                        : ''
                    }`}
                  >
                    {t('home.family.title')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={panelView === 'explorer'}
                    onClick={() => setPanelView('explorer')}
                    className={`segmented-tab ${
                      panelView === 'explorer'
                        ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300'
                        : ''
                    }`}
                  >
                    {t('home.explorer.eyebrow')}
                  </button>
                </div>
              </div>
            )}

            {!showingExplorer ? (
              <div className="mt-4 space-y-4">
                <dl className="grid grid-cols-3 divide-x divide-[var(--tt-border)] rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] py-3">
                  <div className="px-3">
                    <dt className="text-[11px] font-medium text-[var(--tt-ink-muted)]">
                      {t('home.command.members')}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-[var(--tt-ink)]">
                      {localiseNumber(profiles.length, language)}
                    </dd>
                  </div>
                  <div className="px-3">
                    <dt className="text-[11px] font-medium text-[var(--tt-ink-muted)]">
                      {t('home.command.completed')}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-[var(--tt-accent)]">
                      {localiseNumber(familyOverview.completed, language)}
                    </dd>
                  </div>
                  <div className="px-3">
                    <dt className="text-[11px] font-medium text-[var(--tt-ink-muted)]">
                      {t('home.command.attention')}
                    </dt>
                    <dd
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        familyOverview.overdue > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-900 dark:text-white'
                      }`}
                    >
                      {localiseNumber(familyOverview.overdue + familyOverview.dueToday, language)}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link to="/analytics" className="btn-link inline-flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('nav.analytics')}</span>
                  </Link>
                  <Link to="/readiness" className="btn-link inline-flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('home.hero.readiness')}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5">
                {/* Interactive EPI Stage Selector */}
                <div
                  role="group"
                  aria-label={t('home.explorer.title')}
                  className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-1"
                >
                  {schedule.map((stage, idx) => {
                    const active = idx === epiStageIdx;
                    return (
                      <button
                        key={stage.age.en}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setEpiStageIdx(idx)}
                        className={`rounded-md px-2 py-1.5 text-center text-xs font-semibold whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-[var(--tt-card)] text-[var(--tt-accent)] shadow-xs'
                            : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
                        } ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {stage.age[language]}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Stage Vaccine Doses */}
                {activeEpiStage && (
                  <div className="rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--tt-border)] pb-2">
                      <span
                        className={`text-xs font-bold text-[var(--tt-ink)] ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {activeEpiStage.age[language]}
                      </span>
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--tt-accent)]">
                        {t(
                          'home.explorer.vaccinesDueCount',
                          localiseNumber(activeEpiStage.vaccines.length, language),
                        )}
                      </span>
                    </div>
                    <ul className="mt-2.5 divide-y divide-[var(--tt-border)]">
                      {activeEpiStage.vaccines.map((item) => (
                        <li key={`${activeEpiStage.ageDays}-${item.name.en}`} className="py-1.5 first:pt-0 last:pb-0">
                          <Link
                            to={`/vaccines/${item.id}`}
                            className="group flex items-center justify-between gap-2 text-xs font-semibold text-neutral-800 hover:text-emerald-700 dark:text-neutral-200 dark:hover:text-emerald-400"
                          >
                            <span className="inline-flex items-center gap-2 truncate">
                              <Syringe
                                className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                              />
                              <span className={`truncate ${isBangla ? 'font-bangla' : ''}`}>
                                {item.name[language]}
                              </span>
                            </span>
                            <ArrowRight
                              className="h-3 w-3 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link to="/schedule" className="btn-link inline-flex items-center gap-1">
                    <span>{t('home.explorer.openSchedule')}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/tracker"
                    className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {t('home.explorer.trackThisAge')}
                  </Link>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={openCommandPalette}
              className="mt-4 flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] px-3.5 py-2.5 text-left text-xs text-[var(--tt-ink-muted)] transition-colors hover:border-[var(--tt-accent)] hover:text-[var(--tt-ink)]"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Search
                  className="h-3.5 w-3.5 shrink-0 text-[var(--tt-accent)]"
                  aria-hidden="true"
                />
                <span className={`truncate ${isBangla ? 'font-bangla' : ''}`}>
                  {t('home.command.searchHint')}
                </span>
              </span>
              <kbd className="shrink-0 rounded border border-[var(--tt-border-strong)] bg-[var(--tt-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tt-ink-muted)]">
                ⌘K
              </kbd>
            </button>
          </aside>
        </div>
      </section>

      {/* --- Intelligent Family Dashboard (when profiles exist) ------------- */}
      <FamilyDashboard profiles={profiles} />

      {/* --- National Surveillance Stats Strip ------------------------------ */}
      <section className="border-b border-[var(--tt-border)] bg-[var(--tt-chrome-solid)]">
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-[var(--tt-border)] px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:divide-x lg:px-8">
          {stats.map(({ key, value }) => (
            <div key={key} className="px-4 py-2 text-center">
              <dd className="text-2xl font-bold tabular-nums text-[var(--tt-accent)] sm:text-3xl">
                <AnimatedCounter end={value} />
              </dd>
              <dt
                className={`mt-1 text-xs text-[var(--tt-ink-muted)] ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t(key)}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Curated Asymmetric Capability Workspace ------------------------ */}
      <section className="page-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
              {t('home.quick.title')}
            </h2>
            <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
              {t('home.quick.subtitle')}
            </p>
          </div>
          <Link to="/analytics" className="btn-link text-sm">
            {t('nav.analytics')}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* Primary Clinical Workflows */}
          <div className="lg:col-span-7">
            <p
              className={`mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.quick.coreGroup')}
            </p>
            <div className="divide-y divide-[var(--tt-border)] overflow-hidden rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] shadow-[var(--shadow-card)]">
              {CORE_WORKFLOWS.map(({ to, icon: Icon, titleKey, bodyKey, metaKey }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-start justify-between gap-4 p-5 transition-colors hover:bg-[var(--tt-subtle)]/55"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--tt-border)] bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <h3
                          className={`text-base font-bold text-[var(--tt-ink)] group-hover:text-[var(--tt-accent)] ${
                            isBangla ? 'font-bangla' : ''
                          }`}
                        >
                          {t(titleKey)}
                        </h3>
                        <span className="text-[11px] font-medium text-[var(--tt-ink-muted)]">
                          · {t(metaKey)}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-sm leading-relaxed text-[var(--tt-ink-muted)] ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {t(bodyKey)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-ink-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--tt-accent)]"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Decision Support & Diagnostics */}
          <div className="lg:col-span-5">
            <p
              className={`mb-3 text-xs font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.quick.toolsGroup')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {DIAGNOSTIC_TOOLS.map(({ to, icon: Icon, titleKey, bodyKey, metaKey }) => (
                <Link key={to} to={to} className="card-hover flex items-start gap-3.5 p-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tt-subtle)] text-[var(--tt-ink)]"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-sm font-bold text-[var(--tt-ink)] ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {t(titleKey)}
                      </h3>
                      <span className="text-[11px] font-medium text-[var(--tt-ink-muted)]">
                        {t(metaKey)}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-xs leading-relaxed text-[var(--tt-ink-muted)] ${
                        isBangla ? 'font-bangla' : ''
                      }`}
                    >
                      {t(bodyKey)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- Privacy + Cloud Sync Choice ------------------------------------ */}
      <section className="page-shell pt-0">
        <div className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8 dark:border-emerald-900/60 dark:bg-emerald-950/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isBangla ? 'font-bangla' : ''}`}>
              {t('home.offline.title')}
            </h2>
            <p
              className={`mt-2 max-w-3xl text-sm leading-relaxed text-neutral-300 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.offline.body')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="btn bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {t('nav.auth')}
              </Link>
              <Link
                to="/privacy"
                className="btn border border-neutral-700 bg-transparent text-neutral-200 hover:bg-neutral-800"
              >
                {t('nav.privacy')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- Final Call to Action ------------------------------------------- */}
      <section className="page-shell pt-0 text-center">
        <h2 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>{t('home.cta.title')}</h2>
        <p className={`section-subtitle mx-auto ${isBangla ? 'font-bangla' : ''}`}>
          {t('home.cta.body')}
        </p>
        <Link to="/tracker" className="btn-primary mt-6">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span className={isBangla ? 'font-bangla' : undefined}>{t('home.cta.button')}</span>
        </Link>
        {profiles.length > 0 && (
          <p
            className={`mt-4 text-sm text-neutral-500 dark:text-neutral-400 ${
              isBangla ? 'font-bangla' : ''
            }`}
          >
            {t('tracker.title')} · {localiseNumber(profiles.length, language)}
          </p>
        )}
      </section>
    </>
  );
}
