import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  ChevronDown,
  ClipboardList,
  Compass,
  Globe,
  IdCard,
  MapPin,
  Menu,
  Monitor,
  Moon,
  Search,
  Snowflake,
  Sun,
  Syringe,
  User,
  Users,
  X,
} from 'lucide-react';

import { InstallButton } from '../components/InstallButton';
import { openCommandPalette } from '../lib/commandPalette';
import Logo from '../components/Logo';
import { TextSizeButton } from '../components/TextSizeButton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemePreference } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Calendar;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Sun },
  { to: '/vaccines', labelKey: 'nav.vaccines', icon: Syringe },
  { to: '/schedule', labelKey: 'nav.schedule', icon: Calendar },
  { to: '/tracker', labelKey: 'nav.tracker', icon: Users },
  { to: '/centres', labelKey: 'nav.centres', icon: MapPin },
  { to: '/tikabot', labelKey: 'nav.tikabot', icon: Bot },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/readiness', labelKey: 'nav.readiness', icon: Compass },
  { to: '/cold-chain', labelKey: 'nav.coldChain', icon: Snowflake },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/reminders', labelKey: 'nav.reminders', icon: Bell },
  { to: '/compare', labelKey: 'nav.compare', icon: ClipboardList },
  { to: '/passport', labelKey: 'nav.passport', icon: IdCard },
];

const THEME_OPTIONS: Array<{ value: ThemePreference; icon: typeof Sun; labelKey: string }> = [
  { value: 'light', icon: Sun, labelKey: 'common.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'common.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'common.theme.system' },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
  ].join(' ');
}

export function Header() {
  const { t, language, toggleLanguage } = useI18n();
  const { preference, setTheme } = useTheme();
  const { user, backend } = useAuth();
  const { pathname } = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // One mechanism for both popovers: Escape, outside pointer-down and Tab
  // cycling all come from `useFocusTrap`.
  const moreRef = useFocusTrap<HTMLLIElement>(moreOpen, {
    onEscape: () => setMoreOpen(false),
    onOutsideClick: () => setMoreOpen(false),
    autoFocus: false,
  });
  const mobileRef = useFocusTrap<HTMLDivElement>(mobileOpen, {
    onEscape: () => setMobileOpen(false),
    onOutsideClick: () => setMobileOpen(false),
    autoFocus: false,
  });

  // Navigating (including via the mobile menu) must close the drawers.
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const isBangla = language === 'bn';
  const moreActive = SECONDARY_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/85 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/85">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label={t('app.title')}
          title={t('app.tagline')}
        >
          <Logo size="sm" showText={false} />
          <span className="hidden text-lg font-bold tracking-tight text-neutral-900 sm:inline dark:text-white">
            TikaTrack
          </span>
        </NavLink>

        {/* Desktop navigation */}
        <nav aria-label={t('common.a11y.mainNavigation')} className="ml-2 hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.slice(1).map(({ to, labelKey, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={navClass} end={to === '/'}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
            <li className="relative" ref={moreRef}>
              <button
                type="button"
                className={`${navClass({ isActive: moreOpen || moreActive })} w-full`}
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                <span className={isBangla ? 'font-bangla' : undefined}>{t('nav.more')}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {moreOpen && (
                <div className="animate-scale-in absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                  {SECONDARY_NAV.map(({ to, labelKey, icon: Icon }) => (
                    <NavLink key={to} to={to} className={navClass}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className={isBangla ? 'font-bangla' : undefined}>{t(labelKey)}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <button
            type="button"
            onClick={openCommandPalette}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
            aria-label={t('nav.quickSearch')}
            title={`${t('nav.quickSearch')} (${t('cmd.shortcutHint')})`}
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">{t('cmd.triggerLabel')}</span>
            <kbd className="hidden rounded border border-neutral-300 bg-white px-1 py-0.5 font-mono text-[10px] text-neutral-500 xl:inline dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              ⌘K
            </kbd>
          </button>

          <InstallButton className="btn-ghost btn-sm whitespace-nowrap" />

          <TextSizeButton />

          {/* Language */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="btn-ghost btn-sm whitespace-nowrap"
            aria-label={t('common.label.language')}
            title={`${t('common.label.language')}: ${language === 'en' ? 'English' : 'বাংলা'}`}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="font-bangla">{isBangla ? 'EN' : 'বাং'}</span>
          </button>

          {/* Theme */}
          <div
            className="hidden items-center rounded-lg border border-neutral-200 p-0.5 sm:flex dark:border-neutral-700"
            role="group"
            aria-label={t('common.label.theme')}
          >
            {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={preference === value}
                title={t(labelKey)}
                aria-label={t(labelKey)}
                className={`rounded-md p-1.5 transition-colors ${
                  preference === value
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTheme(preference === 'dark' ? 'light' : 'dark')}
            className="btn-ghost btn-sm sm:hidden"
            aria-label={t('common.theme.toggle')}
          >
            {preference === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Account */}
          <NavLink to="/auth" className={navClass} title={t('nav.auth')}>
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">
              {user ? user.full_name || user.email : t('nav.auth')}
            </span>
          </NavLink>

          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="btn-ghost btn-sm lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? t('common.a11y.closeMenu') : t('common.a11y.openMenu')}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          ref={mobileRef}
          aria-label={t('common.a11y.mainNavigation')}
          className="animate-slide-up border-t border-neutral-200 bg-white px-4 py-3 lg:hidden dark:border-neutral-800 dark:bg-neutral-900"
        >
          <ul className="grid gap-1">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ to, labelKey, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={navClass} end={to === '/'}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span
              className={`h-2 w-2 rounded-full ${backend !== 'local' ? 'bg-emerald-500' : 'bg-neutral-400'}`}
              aria-hidden="true"
            />
            {backend !== 'local' ? t('common.data.cloudSync') : t('common.data.localOnly')}
          </p>
        </nav>
      )}
    </header>
  );
}
