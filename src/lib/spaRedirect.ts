/**
 * Resolving a static host's SPA redirect.
 *
 * Hosts without rewrite rules (GitHub Pages) serve `dist/404.html` for unknown
 * paths. That page bounces to the app root with the original location in
 * `?tikatrack_route=`, and stores a copy in `sessionStorage` in case the query
 * parameter is dropped by an intermediary. This module turns that bounce back
 * into the real path *before* React Router reads `window.location`, so a deep
 * link shared from a GitHub Pages deploy lands on the intended route instead of
 * silently falling back to home.
 *
 * Hosts that rewrite properly (Netlify, Vercel, nginx) never trigger any of this:
 * with no query parameter and no stored value, `resolveSpaRedirect` is a no-op.
 */

/** Query parameter the generated `404.html` uses to carry the original path. */
export const SPA_ROUTE_PARAM = 'tikatrack_route';

/** sessionStorage key holding the same value, as a fallback. */
export const SPA_REDIRECT_KEY = 'tikatrack.redirect';

export interface SpaRedirectSource {
  /** Full URL the app was loaded from (`window.location.href`). */
  href: string;
  /** Value stored by `404.html`, or `null` when absent/unreadable. */
  stored: string | null;
}

/** Read `?tikatrack_route=` from a URL, tolerating a malformed one. */
function readRouteParam(href: string): string | null {
  try {
    return new URL(href).searchParams.get(SPA_ROUTE_PARAM);
  } catch {
    return null;
  }
}

/**
 * Work out the path to restore, or `null` when there is nothing to do.
 *
 * The query parameter wins over sessionStorage: it is the value that matches the
 * URL the user is actually looking at, whereas a stored value can be stale from
 * an earlier navigation.
 */
export function spaRedirectTarget({ href, stored }: SpaRedirectSource): string | null {
  const raw = (readRouteParam(href) ?? stored)?.trim();
  if (!raw) return null;
  // `history.replaceState` needs a root-relative path; the base prefix (if the
  // app is deployed under a sub-path) is already part of it.
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function readStoredRedirect(): string | null {
  try {
    return window.sessionStorage.getItem(SPA_REDIRECT_KEY);
  } catch {
    return null;
  }
}

function clearStoredRedirect(): void {
  try {
    window.sessionStorage.removeItem(SPA_REDIRECT_KEY);
  } catch {
    /* nothing to do — the value is only a convenience */
  }
}

/**
 * Apply the redirect to the address bar. Called once at boot, before `createRoot`.
 *
 * Every failure mode degrades to "stay on the current URL", which renders the
 * home route — never a crash and never a blank page.
 */
export function resolveSpaRedirect(): void {
  const target = spaRedirectTarget({
    href: window.location.href,
    stored: readStoredRedirect(),
  });

  // Clear it whether or not we used it, so a stored bounce cannot fire again on
  // the next load.
  clearStoredRedirect();

  if (!target) return;

  try {
    window.history.replaceState(window.history.state, '', target);
  } catch {
    /* Some embedders block history writes; the home route is fine. */
  }
}
