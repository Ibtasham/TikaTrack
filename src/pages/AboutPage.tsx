import {
  BookOpen,
  CloudOff,
  Database,
  ExternalLink,
  HardDrive,
  HeartPulse,
  Info,
  Phone,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react';

import { useI18n } from '../i18n';
import { APP_VERSION } from '../lib/version';
import { allVaccines } from '../data/vaccines';
import { allVaccinationCentres } from '../data/vaccinationCentres';

const OFFICIAL_RESOURCES = [
  {
    label: 'Directorate General of Health Services (DGHS)',
    href: 'https://www.dghs.gov.bd/',
  },
  {
    label: 'Expanded Programme on Immunization — Bangladesh',
    href: 'https://www.epi.gov.bd/',
  },
  { label: 'WHO — Immunization', href: 'https://www.who.int/health-topics/immunization' },
  { label: 'UNICEF — Bangladesh', href: 'https://www.unicef.org/bangladesh/' },
];

interface SectionProps {
  icon: typeof Info;
  title: string;
  body: string;
  tone?: 'default' | 'warning';
}

function Section({ icon: Icon, title, body, tone = 'default' }: SectionProps) {
  const { language } = useI18n();
  const isBangla = language === 'bn';
  const iconTone =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

  return (
    <section className="card-padded">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2
            className={`text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {title}
          </h2>
          <p
            className={`mt-2 leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * `/about` — what TikaTrack is, what it is not, and where the data came from.
 *
 * This page carries the medical disclaimer. It is linked from the footer on
 * every screen, because a health-information app that hides its limitations is
 * not trustworthy.
 */
export default function AboutPage() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  return (
    <div className="page-shell max-w-4xl">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <Info className="h-4 w-4" aria-hidden="true" />
          {t('nav.about')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('about.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>{t('about.subtitle')}</p>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { value: allVaccines.length, label: t('home.stats.vaccines') },
          { value: allVaccinationCentres.length, label: t('home.stats.centres') },
          { value: 2, label: t('home.stats.languages') },
          { value: `v${APP_VERSION}`, label: t('about.version') },
        ].map(({ value, label }) => (
          <div key={label} className="card-padded text-center">
            <dt
              className={`order-last mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {label}
            </dt>
            <dd className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-5">
        <Section
          icon={HeartPulse}
          title={t('about.mission.title')}
          body={t('about.mission.body')}
        />
        <Section
          icon={ShieldCheck}
          title={t('about.whatItIs.title')}
          body={t('about.whatItIs.body')}
        />
        <Section
          icon={TriangleAlert}
          title={t('about.whatItIsNot.title')}
          body={t('about.whatItIsNot.body')}
          tone="warning"
        />
        <Section icon={BookOpen} title={t('about.sources.title')} body={t('about.sources.body')} />
      </div>

      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('about.tech.title')}
        </h2>
        <p
          className={`mt-2 leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('about.tech.body')}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <CloudOff
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span className={isBangla ? 'font-bangla' : undefined}>{t('home.offline.title')}</span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
            <HardDrive
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span className={isBangla ? 'font-bangla' : undefined}>{t('home.offline.body')}</span>
          </li>
        </ul>
      </section>

      <section className="card-padded mt-5 border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-amber-900 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          <Stethoscope className="h-5 w-5" aria-hidden="true" />
          {t('about.disclaimer.title')}
        </h2>
        <p
          className={`mt-2 leading-relaxed text-amber-900/90 dark:text-amber-100/90 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('about.disclaimer.body')}
        </p>
        <a
          href="tel:16263"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          {t('about.hotline')}: 16263
        </a>
      </section>

      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <ExternalLink
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          {t('about.links.title')}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {OFFICIAL_RESOURCES.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {label}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
          {t('about.license')} · v{APP_VERSION}
        </p>
      </section>
    </div>
  );
}
