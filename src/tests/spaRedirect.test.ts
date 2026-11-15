import { beforeEach, describe, expect, it } from 'vitest';

import {
  resolveSpaRedirect,
  spaRedirectTarget,
  SPA_REDIRECT_KEY,
  SPA_ROUTE_PARAM,
} from '../lib/spaRedirect';

/** Build a URL with the bounce parameter, the way `dist/404.html` does. */
function bounceUrl(path: string): string {
  return `https://example.test/?${SPA_ROUTE_PARAM}=${encodeURIComponent(path)}`;
}

describe('spaRedirectTarget', () => {
  it('returns null when there is nothing to resolve', () => {
    expect(spaRedirectTarget({ href: 'https://example.test/tracker', stored: null })).toBeNull();
  });

  it('reads the route from the query parameter', () => {
    expect(spaRedirectTarget({ href: bounceUrl('/vaccines/bcg'), stored: null })).toBe(
      '/vaccines/bcg',
    );
  });

  it('prefers the query parameter over a stale stored value', () => {
    expect(spaRedirectTarget({ href: bounceUrl('/tracker'), stored: '/analytics' })).toBe(
      '/tracker',
    );
  });

  it('falls back to sessionStorage when the parameter is absent', () => {
    expect(spaRedirectTarget({ href: 'https://example.test/', stored: '/centres' })).toBe(
      '/centres',
    );
  });

  it('tolerates a malformed href and still uses the stored value', () => {
    expect(spaRedirectTarget({ href: 'not a url', stored: '/privacy' })).toBe('/privacy');
  });

  it('adds the leading slash replaceState requires', () => {
    expect(spaRedirectTarget({ href: bounceUrl('schedule'), stored: null })).toBe('/schedule');
  });

  it('keeps the base prefix of a sub-path deploy', () => {
    expect(spaRedirectTarget({ href: bounceUrl('/tikatrack/reminders'), stored: null })).toBe(
      '/tikatrack/reminders',
    );
  });

  it('preserves search and hash', () => {
    expect(
      spaRedirectTarget({ href: bounceUrl('/centres?division=Dhaka#map'), stored: null }),
    ).toBe('/centres?division=Dhaka#map');
  });

  it('ignores blank values', () => {
    expect(spaRedirectTarget({ href: bounceUrl('   '), stored: null })).toBeNull();
    expect(spaRedirectTarget({ href: 'https://example.test/', stored: '' })).toBeNull();
  });
});

describe('resolveSpaRedirect', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('rewrites the address bar from the query parameter', () => {
    window.history.replaceState({}, '', `/?${SPA_ROUTE_PARAM}=%2Fvaccines%2Fbcg`);

    resolveSpaRedirect();

    expect(window.location.pathname).toBe('/vaccines/bcg');
    expect(window.location.search).toBe('');
  });

  it('rewrites the address bar from sessionStorage alone', () => {
    window.sessionStorage.setItem(SPA_REDIRECT_KEY, '/analytics');

    resolveSpaRedirect();

    expect(window.location.pathname).toBe('/analytics');
  });

  it('clears the stored value so the bounce cannot fire twice', () => {
    window.sessionStorage.setItem(SPA_REDIRECT_KEY, '/tracker');

    resolveSpaRedirect();
    expect(window.sessionStorage.getItem(SPA_REDIRECT_KEY)).toBeNull();

    // A second load with a clean URL must not be dragged back to /tracker.
    window.history.replaceState({}, '', '/');
    resolveSpaRedirect();
    expect(window.location.pathname).toBe('/');
  });

  it('is a no-op on a normal load', () => {
    window.history.replaceState({}, '', '/centres');

    resolveSpaRedirect();

    expect(window.location.pathname).toBe('/centres');
  });

  it('keeps working when the route carries a base prefix', () => {
    window.sessionStorage.setItem(SPA_REDIRECT_KEY, '/tikatrack/privacy');

    resolveSpaRedirect();

    expect(window.location.pathname).toBe('/tikatrack/privacy');
  });
});
