import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Unmount React trees between tests so queries never see stale markup.
afterEach(() => {
  cleanup();
});

// jsdom implements neither of these; the app feature-detects them at runtime,
// so tests exercise the same fallback path a restricted browser would.
// A plain function (not `vi.fn()`): `restoreMocks: true` in the Vitest config
// would otherwise strip the implementation before each test and make
// `matchMedia(...)` return `undefined`, crashing any component that reads
// `.matches` (e.g. ThemeProvider). Plain functions are left alone by restore.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated Safari API, still called by some libs
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom has no `ResizeObserver`, and recharts' `<ResponsiveContainer>` requires
// one — without it, mounting a chart throws, the ErrorBoundary catches it, and a
// perfectly good page looks broken in tests. The shim does nothing on purpose:
// jsdom reports zero-sized boxes anyway, so charts render empty while the page
// logic around them runs for real.
class ResizeObserverShim {
  observe() {
    // no-op: layout is not simulated in jsdom
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverShim,
});

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
