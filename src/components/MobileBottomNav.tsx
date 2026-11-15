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
 * Thumb-zone bottom bar on mobile viewports (`< lg`) for the 5 daily workflows.
 * Hidden on desktop (`lg:hidden`) and suppressed when printing (`no-print`).
 */
export function MobileBottomNav() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  return (
    <nav
      aria-label={t('common.a11y.mainNavigation')}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/85 bg-white/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-neutral-800 dark:bg-neutral-900/90"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-emerald-100 dark:bg-emerald-950' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className={`truncate max-w-full ${isBangla ? 'font-bangla' : ''}`}>
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
