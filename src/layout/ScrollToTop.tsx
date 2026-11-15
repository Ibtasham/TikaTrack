import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset the scroll position on navigation.
 *
 * Without this, following a link from the bottom of a long page lands the user
 * mid-way down the next one. Hash targets are left alone so `#sources` anchors
 * still work, and `replace: false` keeps the browser's back/forward scroll
 * restoration intact.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
