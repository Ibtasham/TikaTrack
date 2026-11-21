import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  Cloud,
  CloudOff,
  Compass,
  IdCard,
  MapPin,
  Search,
  ShieldCheck,
  Snowflake,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { AnimatedCounter } from '../components/AnimatedCounter';
import { openCommandPalette } from '../lib/commandPalette';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfilesContext';
import { useI18n } from '../i18n';
import { allVaccines } from '../data/vaccines';
import { allVaccinationCentres } from '../data/vaccinationCentres';
import { formatAge, formatDate, localiseNumber } from '../lib/format';
import {
  calculateVaccinationStats,
  getNextUpcomingVaccination,
  milestoneDoseName,
} from '../lib/smartScheduler';

interface Feature {
  to: string;
  icon: typeof Calendar;
  titleKey: string;
  bodyKey: string;
  metaKey: string;
}

const FEATURES: Feature[] = [
  {
    to: '/schedule',
    icon: Calendar,
    titleKey: 'home.features.schedule.title',
    bodyKey: 'home.features.schedule.body',
    metaKey: 'home.features.schedule.meta',
  },
  {
    to: '/readiness',
    icon: Compass,
    titleKey: 'home.features.readiness.title',
    bodyKey: 'home.features.readiness.body',
    metaKey: 'home.features.readiness.meta',
  },
  {
    to: '/tracker',
    icon: Users,
    titleKey: 'home.features.tracker.title',
    bodyKey: 'home.features.tracker.body',
    metaKey: 'home.features.tracker.meta',
  },
  {
    to: '/cold-chain',
    icon: Snowflake,
    titleKey: 'home.features.coldchain.title',
    bodyKey: 'home.features.coldchain.body',
    metaKey: 'home.features.coldchain.meta',
  },
  {
    to: '/tikabot',
    icon: Bot,
    titleKey: 'home.features.bot.title',
    bodyKey: 'home.features.bot.body',
    metaKey: 'home.features.bot.meta',
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

  const familyCards = useMemo(
    () =>
      profiles.map((member) => ({
        member,
        stats: calculateVaccinationStats(member.dateOfBirth, member),
        nextDose: getNextUpcomingVaccination(member.dateOfBirth, member),
      })),
    [profiles],
  );

  const familyOverview = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let completed = 0;
    for (const card of familyCards) {
      overdue += card.stats.overdue;
      dueToday += card.stats.dueToday;
      completed += card.stats.completed;
    }
    return { overdue, dueToday, completed };
  }, [familyCards]);

  return (
    <>
      {/* --- Clean Clinical Editorial Hero ---------------------------------- */}
      <section className="border-b border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            {/* Zero-pill typographic eyebrow */}
            <p
              className={`flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              <span>DGHS EPI · WHO GROWTH STANDARDS</span>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span>{t('home.hero.eyebrowMeta')}</span>
            </p>

            <h1
              className={`mt-4 text-3xl leading-[1.12] font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.hero.title')}
            </h1>

            <p
              className={`mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-300 ${
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
              <Link to="/readiness" className="btn-secondary">
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.readiness')}
                </span>
              </Link>
              <Link to="/tikabot" className="btn-ghost">
                <Bot className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.tertiary')}
                </span>
              </Link>
              <Link to="/cold-chain" className="btn-ghost">
                <Snowflake className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('nav.coldChain')}
                </span>
              </Link>
            </div>

            {!persistent && ready && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.banner.notPersistent')}
                </span>
              </p>
            )}
          </div>

          {/* Clinical Family Command Telemetry Card */}
          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  {t('home.command.eyebrow')}
                </p>
                <h2
                  className={`mt-1 text-lg font-bold text-neutral-900 dark:text-white ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {profiles.length > 0 ? t('home.family.title') : t('home.command.readyTitle')}
                </h2>
              </div>
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
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

            {profiles.length > 0 ? (
              <div className="mt-5 space-y-4">
                <dl className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {t('home.command.members')}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(profiles.length, language)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {t('home.command.completed')}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {localiseNumber(familyOverview.completed, language)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <dt className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
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

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <Link to="/analytics" className="btn-link inline-flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('nav.analytics')}</span>
                  </Link>
                  <Link to="/schedule" className="btn-link inline-flex items-center gap-1">
                    <span>{t('home.hero.primary')}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <dl className="grid grid-cols-2 gap-3">
                  {stats.slice(0, 4).map(({ key, value }) => (
                    <div
                      key={key}
                      className="rounded-xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-950"
                    >
                      <dd className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        <AnimatedCounter end={value} duration={1100} />
                      </dd>
                      <dt
                        className={`mt-1 text-xs text-neutral-600 dark:text-neutral-300 ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {t(key)}
                      </dt>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                  <span className={isBangla ? 'font-bangla' : undefined}>{t('home.command.instantHint')}</span>
                  <Link to="/schedule" className="btn-link shrink-0">
                    {t('home.hero.primary')}
                  </Link>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={openCommandPalette}
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left text-xs text-neutral-600 transition-colors hover:border-emerald-300 hover:text-emerald-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span className={`truncate ${isBangla ? 'font-bangla' : ''}`}>
                  {t('home.command.searchHint')}
                </span>
              </span>
              <kbd className="shrink-0 rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                ⌘K
              </kbd>
            </button>
          </aside>
        </div>
      </section>

      {/* --- Live Family Member Strip (when profiles exist) ---------------- */}
      {familyCards.length > 0 && (
        <section className="border-b border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  className={`text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('home.family.title')}
                </h2>
                <p
                  className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('home.family.subtitle')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/tracker" className="btn-secondary btn-sm">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('nav.tracker')}
                </Link>
                <Link to="/passport" className="btn-ghost btn-sm">
                  <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('nav.passport')}
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {familyCards.map(({ member, stats: memberStats, nextDose }) => (
                <Link
                  key={member.id}
                  to={`/tracker?member=${encodeURIComponent(member.id)}`}
                  className="card-hover flex flex-col justify-between gap-3 bg-white p-4 dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white"
                        aria-hidden="true"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`truncate font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {member.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatAge(member.dateOfBirth, language)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {localiseNumber(memberStats.progressPercentage, language)}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${memberStats.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {memberStats.overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('tracker.member.overdueCount', memberStats.overdue)}
                      </span>
                    ) : memberStats.dueToday > 0 ? (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {t('home.family.dueToday', memberStats.dueToday)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('home.family.allCaughtUp')}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-300">
                      {nextDose ? (
                        <span className="max-w-[11rem] truncate">
                          {t('home.family.nextLabel')}: {milestoneDoseName(nextDose, language)} (
                          {formatDate(nextDose.scheduledDate, language)})
                        </span>
                      ) : (
                        <span>{t('home.family.openTracker')}</span>
                      )}
                      <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- National Surveillance Stats Strip ------------------------------- */}
      <section className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
          {stats.map(({ key, value }) => (
            <div key={key} className="text-center">
              <dd className="text-2xl font-bold tabular-nums text-emerald-700 sm:text-3xl dark:text-emerald-400">
                <AnimatedCounter end={value} />
              </dd>
              <dt
                className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t(key)}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Asymmetric Capability Grid ------------------------------------ */}
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

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ to, icon: Icon, titleKey, bodyKey, metaKey }, index) => (
            <li key={to} className={`animate-slide-up stagger-${index + 1}`}>
              <Link to={to} className="card-hover flex h-full flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                    {t(metaKey)}
                  </span>
                </div>
                <h3
                  className={`mt-4 text-lg font-bold text-neutral-900 dark:text-white ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {t(titleKey)}
                </h3>
                <p
                  className={`mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                >
                  {t(bodyKey)}
                </p>
                <span className="link mt-4 inline-flex items-center gap-1.5 text-sm">
                  {t('common.actions.learnMore')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Privacy + Cloud Sync Choice ----------------------------------- */}
      <section className="page-shell pt-0">
        <div className="card-padded grid gap-6 bg-emerald-800 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center dark:bg-emerald-950">
          <ShieldCheck className="h-11 w-11 shrink-0 opacity-90" aria-hidden="true" />
          <div>
            <h2 className={`text-xl font-bold ${isBangla ? 'font-bangla' : ''}`}>
              {t('home.offline.title')}
            </h2>
            <p
              className={`mt-2 text-sm leading-relaxed text-white/90 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('home.offline.body')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="btn bg-white text-emerald-900 hover:bg-emerald-50"
              >
                {t('nav.auth')}
              </Link>
              <Link
                to="/privacy"
                className="btn border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                {t('nav.privacy')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- Final Call to Action ------------------------------------------ */}
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
            className={`mt-4 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.title')} · {profiles.length}
          </p>
        )}
      </section>
    </>
  );
}
