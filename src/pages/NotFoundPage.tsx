import { Link } from 'react-router-dom';
import { Calendar, Compass, MapPin, SearchX, Syringe, Users } from 'lucide-react';

import Logo from '../components/Logo';
import { useI18n } from '../i18n';

const SUGGESTIONS = [
  { to: '/vaccines', labelKey: 'nav.vaccines', icon: Syringe },
  { to: '/schedule', labelKey: 'nav.schedule', icon: Calendar },
  { to: '/tracker', labelKey: 'nav.tracker', icon: Users },
  { to: '/centres', labelKey: 'nav.centres', icon: MapPin },
] as const;

/**
 * `*` — the catch-all route.
 *
 * Reached both by typos and by the GitHub Pages `404.html` redirect shim (see
 * `docs/DEPLOYMENT.md`), which re-encodes the original path into a query string
 * and bounces back here; keeping this page friendly matters because that shim
 * sends real users through it.
 */
export default function NotFoundPage() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Logo size="lg" showText={false} className="animate-float mb-6" />

      <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
        <Compass className="h-4 w-4" aria-hidden="true" />
        404
      </p>

      <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
        {t('notFound.title')}
      </h1>
      <p className={`section-subtitle mx-auto ${isBangla ? 'font-bangla' : ''}`}>
        {t('notFound.subtitle')}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className="btn-primary">
          {t('notFound.home')}
        </Link>
        <Link to="/vaccines" className="btn-secondary">
          {t('notFound.vaccines')}
        </Link>
      </div>

      <div className="mt-12 w-full max-w-2xl">
        <h2
          className={`flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 ${
            isBangla ? 'font-bangla' : ''
          }`}
        >
          <SearchX className="h-4 w-4" aria-hidden="true" />
          {t('notFound.suggestions')}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUGGESTIONS.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={`card-hover flex h-full flex-col items-center gap-2 p-4 text-sm font-medium text-neutral-700 dark:text-neutral-200 ${
                  isBangla ? 'font-bangla' : ''
                }`}
              >
                <Icon
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
