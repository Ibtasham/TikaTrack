import { Suspense, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { PageSkeleton } from './components/Skeleton';
import { ToastViewport } from './components/ui/ToastViewport';
import { AuthProvider } from './contexts/AuthContext';
import { ProfilesProvider } from './contexts/ProfilesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { I18nProvider } from './i18n';
import { AppRoutes } from './router';

/**
 * Where the app is served from, so routes match on a sub-path deploy.
 *
 * Vite exposes the configured `base` (`VITE_BASE=/tikatrack/` for a GitHub Pages
 * project site) as `import.meta.env.BASE_URL`. React Router wants the same prefix
 * without the trailing slash so it can strip it before matching — otherwise every
 * path would look like `/tikatrack/tracker` and nothing would match.
 */
const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

/**
 * Provider stack, outermost first.
 *
 * Order matters: `I18nProvider` is inside `ThemeProvider` because the language
 * toggle lives in the header next to the theme toggle, and `AuthProvider` sits
 * above `ProfilesProvider` so a future cloud-sync layer can key profiles by
 * user id without a second re-parent. `BrowserRouter` wraps everything so any
 * context or page can reach for router hooks.
 *
 * Every route is lazy-loaded and wrapped in its own `ErrorBoundary`, so a crash
 * on the analytics page never takes the header, the tracker or the user's data
 * down with it.
 */
export default function App() {
  const [mapsQuotaReached, setMapsQuotaReached] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaReached(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <ProfilesProvider>
                {mapsQuotaReached && (
                  <div
                    role="status"
                    className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100"
                  >
                    <span>
                      Google Maps Platform quota reached. If you are the app owner, visit{' '}
                      <a
                        href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-amber-950 underline hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100"
                      >
                        maps developer site
                      </a>{' '}
                      for instructions to update your account.
                    </span>
                  </div>
                )}
                <Suspense fallback={<PageSkeleton />}>
                  <AppRoutes />
                </Suspense>
                <ToastViewport />
              </ProfilesProvider>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
