import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { PageSkeleton } from './components/Skeleton';
import { Layout } from './layout/Layout';
import AboutPage from './pages/AboutPage';
import AuthPage from './pages/AuthPage';
import CentresPage from './pages/CentresPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';
import SchedulePage from './pages/SchedulePage';
import TikabotPage from './pages/TikabotPage';
import TrackerPage from './pages/TrackerPage';
import VaccineDetailPage from './pages/VaccineDetailPage';
import VaccinesPage from './pages/VaccinesPage';

/**
 * Routes that pull in a heavy dependency (recharts) or are visited rarely are
 * code-split. Everything else stays in the main chunk so the first navigation
 * is instant — the app is meant to work offline, and an offline user should not
 * be waiting on a lazy chunk that was never cached.
 */
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const PassportPage = lazy(() => import('./pages/PassportPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));

/**
 * The route table.
 *
 * `Layout` renders the skip link, header, `<main>` and footer; the nested
 * routes render into its `<Outlet />`. Keeping the shell out of every page is
 * what lets a page stay a pure function of its data.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        <Route path="vaccines" element={<VaccinesPage />} />
        <Route path="vaccines/:vaccineId" element={<VaccineDetailPage />} />

        <Route path="schedule" element={<SchedulePage />} />
        <Route path="tracker" element={<TrackerPage />} />
        <Route path="centres" element={<CentresPage />} />
        <Route path="tikabot" element={<TikabotPage />} />

        <Route
          path="analytics"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="reminders"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <RemindersPage />
            </Suspense>
          }
        />
        <Route
          path="compare"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <ComparePage />
            </Suspense>
          }
        />
        <Route
          path="passport"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <PassportPage />
            </Suspense>
          }
        />

        <Route path="auth" element={<AuthPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="about" element={<AboutPage />} />

        {/* Catch-all — must stay last so it cannot shadow a real route. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
