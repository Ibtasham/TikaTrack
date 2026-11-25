import { Outlet } from 'react-router-dom';

import { AppStatus } from '../components/AppStatus';
import { CommandPalette } from '../components/CommandPalette';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LocalNotificationAgent } from '../components/LocalNotificationAgent';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { WelcomeDialog } from '../components/WelcomeDialog';
import { useI18n } from '../i18n';
import { Footer } from './Footer';
import { Header } from './Header';
import { ScrollToTop } from './ScrollToTop';

/**
 * The app shell shared by every route.
 *
 * The page itself is wrapped in its own `ErrorBoundary` so a crash in, say, the
 * analytics charts keeps the header, navigation and the rest of the app usable —
 * and keeps the user's locally stored records reachable.
 */
export function Layout() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-[var(--tt-ink)]">
      <ScrollToTop />

      <a className="sr-only-focusable" href="#main-content">
        {t('common.a11y.skipToContent')}
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        <AppStatus />
        <LocalNotificationAgent />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />

      <MobileBottomNav />

      <CommandPalette />

      {/* First-run tour. Mounted here rather than on the home route so a visitor
          who arrives on a deep link is greeted too. */}
      <WelcomeDialog />
    </div>
  );
}
