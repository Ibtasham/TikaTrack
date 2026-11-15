import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  CloudOff,
  IdCard,
  MapPin,
  ShieldCheck,
  Syringe,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { AnimatedCounter } from '../components/AnimatedCounter';
import Logo from '../components/Logo';
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
}

const FEATURES: Feature[] = [
  {
    to: '/schedule',
    icon: Calendar,
    titleKey: 'home.features.schedule.title',
    bodyKey: 'home.features.schedule.body',
  },
  {
    to: '/tracker',
    icon: Users,
    titleKey: 'home.features.tracker.title',
    bodyKey: 'home.features.tracker.body',
  },
  {
    to: '/centres',
    icon: MapPin,
    titleKey: 'home.features.centres.title',
    bodyKey: 'home.features.centres.body',
  },
  {
    to: '/tikabot',
    icon: Bot,
    titleKey: 'home.features.bot.title',
    bodyKey: 'home.features.bot.body',
  },
  {
    to: '/passport',
    icon: IdCard,
    titleKey: 'home.features.passport.title',
    bodyKey: 'home.features.passport.body',
  },
  {
    to: '/analytics',
    icon: BarChart3,
    titleKey: 'home.features.analytics.title',
    bodyKey: 'home.features.analytics.body',
  },
];

/**
 * `/` — landing page.
 *
 * The job of this page is to answer three questions in under ten seconds: what
 * is this, is it trustworthy, and where do I click. It therefore leads with the
 * offline/no-account guarantee rather than with marketing copy, and every card
 * links somewhere useful.
 */
export default function HomePage() {
  const { t, language } = useI18n();
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

  return (
    <>
      {/* --- Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-neutral-900 dark:via-emerald-950/40 dark:to-neutral-900">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl animate-pulse-soft dark:bg-emerald-800/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl animate-pulse-soft dark:bg-teal-900/20"
          aria-hidden="true"
        />

        <div className="page-shell relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <span className="badge-done">
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              {t('home.offline.title')}
            </span>

            <h1
              className={`mt-4 text-3xl leading-tight font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-white ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.hero.title')}
            </h1>

            <p
              className={`mt-4 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg dark:text-neutral-300 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/schedule" className="btn-primary">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.primary')}
                </span>
              </Link>
              <Link to="/tracker" className="btn-secondary">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.hero.secondary')}
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
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('home.banner.notPersistent')}
                </span>
              </p>
            )}
          </div>

          <div className="relative hidden justify-center lg:flex" aria-hidden="true">
            <div className="animate-float rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
              <Logo size="xl" showText={false} className="mx-auto" />
              <p className="mt-4 text-center text-lg font-bold text-neutral-900 dark:text-white">
                TikaTrack
              </p>
              <p
                className={`mt-1 text-center text-sm text-neutral-600 dark:text-neutral-300 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                {t('app.tagline')}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {stats.slice(0, 4).map(({ key, value }) => (
                  <div
                    key={key}
                    className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/50"
                  >
                    <dd className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      <AnimatedCounter end={value} duration={1200} />
                    </dd>
                    <dt
                      className={`mt-0.5 text-[11px] leading-tight text-neutral-600 dark:text-neutral-300 ${
                        isBangla ? 'font-bangla' : ''
                      }`}
                    >
                      {t(key)}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* --- Live Family Command Strip (when members exist) --------------- */}
      {familyCards.length > 0 && (
        <section className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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
                  className="card-hover flex flex-col justify-between gap-3 bg-neutral-50/70 p-4 dark:bg-neutral-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
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

                  <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${memberStats.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {memberStats.overdue > 0 ? (
                      <span className="badge-overdue">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {t('tracker.member.overdueCount', memberStats.overdue)}
                      </span>
                    ) : memberStats.dueToday > 0 ? (
                      <span className="badge-due">{t('home.family.dueToday', memberStats.dueToday)}</span>
                    ) : (
                      <span className="badge-done">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {t('home.family.allCaughtUp')}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                      {nextDose ? (
                        <span className="truncate max-w-[11rem]">
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

      {/* --- Stats bar (mobile / no-JS-friendly) --------------------------- */}
      <section className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
          {stats.map(({ key, value }) => (
            <div key={key} className="text-center">
              <dd className="text-2xl font-bold text-emerald-700 sm:text-3xl dark:text-emerald-400">
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

      {/* --- Features ------------------------------------------------------ */}
      <section className="page-shell">
        <h2 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
          {t('home.quick.title')}
        </h2>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ to, icon: Icon, titleKey, bodyKey }, index) => (
            <li key={to} className={`animate-slide-up stagger-${index + 1}`}>
              <Link to={to} className="card-hover flex h-full flex-col p-6">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
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
                <span className="link mt-4 inline-flex items-center gap-1 text-sm">
                  {t('common.actions.learnMore')}
                  <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Privacy promise ----------------------------------------------- */}
      <section className="page-shell pt-0">
        <div className="card-padded grid gap-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <ShieldCheck className="h-12 w-12 shrink-0 opacity-90" aria-hidden="true" />
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
                to="/privacy"
                className="btn bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                {t('nav.privacy')}
              </Link>
              <Link to="/tracker" className="btn bg-white text-emerald-800 hover:bg-emerald-50">
                {t('home.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- Call to action ------------------------------------------------ */}
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
