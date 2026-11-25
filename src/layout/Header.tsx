import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  ChevronDown,
  ClipboardList,
  Cloud,
  Compass,
  Globe,
  HardDrive,
  IdCard,
  MapPin,
  Menu,
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
import Logo from '../components/Logo';
import { TextSizeButton } from '../components/TextSizeButton';
import { ThemePicker } from '../components/ThemePicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';
import { openCommandPalette } from '../lib/commandPalette';

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

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'relative flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)] font-semibold'
      : 'text-[var(--tt-ink-muted)] hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)]',
  ].join(' ');
}

export function Header() {
  const { t, language, toggleLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, backend } = useAuth();
  const { pathname } = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const isBangla = language === 'bn';
  const moreActive = SECONDARY_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--tt-border)] bg-[var(--tt-chrome)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={t('app.title')}
          title={t('app.tagline')}
        >
          <Logo size="sm" showText={false} />
          <span className="hidden text-base font-bold tracking-tight text-[var(--tt-ink)] sm:inline">
            TikaTrack
          </span>
        </NavLink>

        {/* Desktop navigation */}
        <nav aria-label={t('common.a11y.mainNavigation')} className="ml-3 hidden flex-1 lg:block">
          <ul className="flex items-center gap-0.5">
            {PRIMARY_NAV.slice(1).map(({ to, labelKey, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={navClass} end={to === '/'}>
                  <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
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
                <div className="animate-scale-in absolute right-0 mt-2 w-56 rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-1.5 shadow-lg">
                  {SECONDARY_NAV.map(({ to, labelKey, icon: Icon }) => (
                    <NavLink key={to} to={to} className={navClass}>
                      <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
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
            className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--tt-ink-muted)] transition-colors hover:border-[var(--tt-border-strong)] hover:text-[var(--tt-ink)]"
            aria-label={t('nav.quickSearch')}
            title={`${t('nav.quickSearch')} (${t('cmd.shortcutHint')})`}
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline">{t('cmd.triggerLabel')}</span>
            <kbd className="hidden rounded border border-[var(--tt-border-strong)] bg-[var(--tt-card)] px-1 py-0.5 font-mono text-[10px] text-[var(--tt-ink-muted)] xl:inline">
              ⌘K
            </kbd>
          </button>

          <InstallButton className="btn-ghost btn-sm whitespace-nowrap" />

          <TextSizeButton />

          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--tt-ink-muted)] transition-colors hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)]"
            aria-label={t('common.label.language')}
            title={`${t('common.label.language')}: ${language === 'en' ? 'English' : 'বাংলা'}`}
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-bangla">{isBangla ? 'EN' : 'বাং'}</span>
          </button>

          {/* Theme palette & mode */}
          <ThemePicker />
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg text-[var(--tt-ink-muted)] transition-colors hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)] sm:inline-flex"
            aria-label={t('common.theme.toggle')}
            title={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Account */}
          <NavLink
            to="/auth"
            className={navClass}
            title={t('nav.auth')}
            aria-label={user ? user.full_name || user.email : t('nav.auth')}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden max-w-[8rem] truncate xl:inline">
              {user ? user.full_name || user.email : t('nav.auth')}
            </span>
          </NavLink>

          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg text-[var(--tt-ink-muted)] hover:bg-[var(--tt-subtle)] lg:hidden"
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
          className="animate-slide-up border-t border-[var(--tt-border)] bg-[var(--tt-chrome-solid)] px-4 py-3 lg:hidden"
        >
          <ul className="grid gap-1 sm:grid-cols-2">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ to, labelKey, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={navClass} end={to === '/'}>
                  <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>{t(labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 border-t border-[var(--tt-border)] pt-3 text-xs font-medium text-[var(--tt-ink-muted)]">
            {backend !== 'local' ? (
              <Cloud className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
            ) : (
              <HardDrive className="h-3.5 w-3.5 text-[var(--tt-ink-muted)]" aria-hidden="true" />
            )}
            <span>
              {backend !== 'local' ? t('common.data.cloudSync') : t('common.data.localOnly')}
            </span>
          </p>
        </nav>
      )}
    </header>
  );
}
