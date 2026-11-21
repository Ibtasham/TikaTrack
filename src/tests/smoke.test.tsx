import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import App from '../App';

/**
 * Whole-app smoke test.
 *
 * Unit tests cover the pure logic; this covers the wiring that only fails at
 * runtime — the provider stack, the router, and each route mounting without
 * throwing. A crash inside a page is caught by the layout's ErrorBoundary, whose
 * fallback has a distinctive heading we assert is *absent*.
 */
const ERROR_MARKER = 'TikaTrack hit an unexpected error';

function renderAt(path: string) {
  // BrowserRouter reads window.location on mount, so set it first.
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('app smoke test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the app shell and home route', async () => {
    renderAt('/');
    expect(document.getElementById('main-content')).not.toBeNull();
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
    // The header brand proves Layout + Header + i18n all mounted.
    expect(screen.getAllByText(/TikaTrack/i).length).toBeGreaterThan(0);
    // Primary navigation links are present.
    expect(document.querySelector('a[href="/tracker"]')).not.toBeNull();
  });

  const syncRoutes = [
    '/vaccines',
    '/schedule',
    '/tracker',
    '/centres',
    '/tikabot',
    '/auth',
    '/privacy',
    '/about',
  ];

  it.each(syncRoutes)('renders the eagerly-bundled route %s', async (path) => {
    renderAt(path);
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });

  it('renders the 404 route for an unknown path', async () => {
    renderAt('/definitely-not-a-real-route');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });

  const lazyRoutes = ['/analytics', '/reminders', '/compare', '/passport', '/cold-chain', '/readiness'];

  it.each(lazyRoutes)('lazy-loads the code-split route %s', async (path) => {
    renderAt(path);
    // Wait for the Suspense skeleton to resolve (or for a crash to surface),
    // then assert the page mounted cleanly.
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull(), { timeout: 5000 });
    expect(document.getElementById('main-content')).not.toBeNull();
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });
});
