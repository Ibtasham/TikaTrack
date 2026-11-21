import { Link } from 'react-router-dom';
import { Heart, Phone, ShieldCheck } from 'lucide-react';

import Logo from '../components/Logo';
import { useI18n } from '../i18n';
import { APP_VERSION } from '../lib/version';

const PRODUCT_LINKS = [
  { to: '/schedule', labelKey: 'nav.schedule' },
  { to: '/tracker', labelKey: 'nav.tracker' },
  { to: '/vaccines', labelKey: 'nav.vaccines' },
  { to: '/centres', labelKey: 'nav.centres' },
  { to: '/analytics', labelKey: 'nav.analytics' },
] as const;

const RESOURCE_LINKS = [
  { to: '/readiness', labelKey: 'nav.readiness' },
  { to: '/tikabot', labelKey: 'nav.tikabot' },
  { to: '/reminders', labelKey: 'nav.reminders' },
  { to: '/compare', labelKey: 'nav.compare' },
  { to: '/passport', labelKey: 'nav.passport' },
  { to: '/about', labelKey: 'nav.about' },
] as const;

const LEGAL_LINKS = [{ to: '/privacy', labelKey: 'nav.privacy' }] as const;

/**
 * Site footer.
 *
 * The health hotline is deliberately the most prominent link in the footer: if
 * someone is reading TikaTrack during a medical worry, the fastest safe route is
 * a phone call, not another page of this app.
 */
export function Footer() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';
  const year = new Date().getFullYear();

  const column = (title: string, links: ReadonlyArray<{ to: string; labelKey: string }>) => (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(({ to, labelKey }) => (
          <li key={to}>
            <Link
              to={to}
              className={`text-sm text-neutral-600 transition-colors hover:text-emerald-700 dark:text-neutral-400 dark:hover:text-emerald-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white pb-20 lg:pb-0 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} />
              <span className="text-lg font-bold text-neutral-900 dark:text-white">TikaTrack</span>
            </div>
            <p
              className={`mt-3 max-w-sm text-sm text-neutral-600 dark:text-neutral-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('footer.text')}
            </p>

            <a
              href="tel:16263"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {t('about.hotline')}: 16263
            </a>

            <p className="mt-4 flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>{t('footer.disclaimer')}</span>
            </p>
          </div>

          {column(t('footer.product'), PRODUCT_LINKS)}
          {column(t('footer.resources'), RESOURCE_LINKS)}
          {column(t('footer.legal'), LEGAL_LINKS)}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <p>
            © {year} TikaTrack · v{APP_VERSION} · {t('footer.rights')}
          </p>
          <p className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>{t('footer.text')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
