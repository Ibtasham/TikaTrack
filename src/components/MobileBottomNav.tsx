import { NavLink } from 'react-router-dom';
import { Bot, Calendar, Home, MapPin, Users } from 'lucide-react';

import { useI18n } from '../i18n';

const MOBILE_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/schedule', labelKey: 'nav.schedule', icon: Calendar },
  { to: '/tracker', labelKey: 'nav.tracker', icon: Users },
  { to: '/centres', labelKey: 'nav.centres', icon: MapPin },
  { to: '/tikabot', labelKey: 'nav.tikabot', icon: Bot },
] as const;

/**
 * Thumb-zone bottom bar on mobile viewports (`< lg`) for the 5 core workflows.
 */
export function MobileBottomNav() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  return (
    <nav
      aria-label={t('common.a11y.mainNavigation')}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'relative flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-emerald-600 dark:bg-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'stroke-[2.25]' : ''}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`max-w-full truncate ${isActive ? 'font-semibold' : ''} ${
                      isBangla ? 'font-bangla' : ''
                    }`}
                  >
                    {t(labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
