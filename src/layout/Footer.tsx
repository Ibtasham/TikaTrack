import { Link } from 'react-router-dom';
import { Phone, ShieldCheck } from 'lucide-react';

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
  { to: '/cold-chain', labelKey: 'nav.coldChain' },
  { to: '/tikabot', labelKey: 'nav.tikabot' },
  { to: '/reminders', labelKey: 'nav.reminders' },
  { to: '/compare', labelKey: 'nav.compare' },
  { to: '/passport', labelKey: 'nav.passport' },
] as const;

const LEGAL_LINKS = [
  { to: '/about', labelKey: 'nav.about' },
  { to: '/privacy', labelKey: 'nav.privacy' },
] as const;

export function Footer() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';
  const year = new Date().getFullYear();

  const column = (title: string, links: ReadonlyArray<{ to: string; labelKey: string }>) => (
    <div>
      <h3 className="text-xs font-semibold tracking-wider text-[var(--tt-ink)] uppercase">
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {links.map(({ to, labelKey }) => (
          <li key={to}>
            <Link
              to={to}
              className={`text-sm text-[var(--tt-ink-muted)] transition-colors hover:text-[var(--tt-accent)] ${
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
    <footer className="mt-auto border-t border-[var(--tt-border)] bg-[var(--tt-chrome-solid)] pb-18 lg:pb-0">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <span className="text-base font-bold tracking-tight text-[var(--tt-ink)]">
                TikaTrack
              </span>
            </div>
            <p
              className={`mt-3 max-w-sm text-sm leading-relaxed text-[var(--tt-ink-muted)] ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('footer.text')}
            </p>

            <a
              href="tel:16263"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {t('about.hotline')}: <span className="tabular-nums">16263</span>
            </a>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--tt-ink-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-accent)]" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>{t('footer.disclaimer')}</span>
            </p>
          </div>

          {column(t('footer.product'), PRODUCT_LINKS)}
          {column(t('footer.resources'), RESOURCE_LINKS)}
          {column(t('footer.legal'), LEGAL_LINKS)}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--tt-border)] pt-6 text-xs text-[var(--tt-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular-nums">
            © {year} TikaTrack · v{APP_VERSION} · {t('footer.rights')}
          </p>
          <p className={isBangla ? 'font-bangla' : undefined}>{t('footer.text')}</p>
        </div>
      </div>
    </footer>
  );
}
