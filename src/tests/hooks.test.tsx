import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useBodyScrollLock,
  useDebouncedValue,
  useEscapeKey,
  useFocusTrap,
  useInstallPrompt,
  useInterval,
  useLiveAnnouncer,
  useMediaQuery,
  useOnlineStatus,
  usePersistentState,
  useServiceWorkerUpdate,
} from '../hooks';
import { applyServiceWorkerUpdate, registerServiceWorker } from '../lib/serviceWorker';
import { STORAGE_KEYS } from '../lib/storage';

vi.mock('../lib/serviceWorker', () => ({
  registerServiceWorker: vi.fn(async () => null),
  applyServiceWorkerUpdate: vi.fn(async () => true),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.style.overflow = '';
});

// ---------------------------------------------------------------------------
// Storage-backed state
// ---------------------------------------------------------------------------

describe('usePersistentState', () => {
  it('hydrates from storage and writes back on change', () => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify('dark'));
    const { result } = renderHook(() => usePersistentState<string>(STORAGE_KEYS.theme, 'light'));

    expect(result.current[0]).toBe('dark');

    act(() => result.current[1]('light'));
    expect(result.current[0]).toBe('light');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('"light"');
  });

  it('falls back to the initial value on corrupt data', () => {
    localStorage.setItem('tikatrack.test', '{not json');
    const { result } = renderHook(() => usePersistentState<number>('tikatrack.test', 7));
    expect(result.current[0]).toBe(7);
  });

  it('falls back when the validator rejects the stored value', () => {
    localStorage.setItem('tikatrack.test', JSON.stringify('huge'));
    const { result } = renderHook(() =>
      usePersistentState<string>(
        'tikatrack.test',
        'small',
        (value): value is string => value === 'small',
      ),
    );
    expect(result.current[0]).toBe('small');
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => usePersistentState<number>('tikatrack.count', 1));
    act(() => result.current[1]((current) => current + 41));
    expect(result.current[0]).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

describe('useDebouncedValue', () => {
  it('settles on the latest value after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('abc');
  });
});

describe('useInterval', () => {
  it('ticks until the delay is removed', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 100 as number | null },
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(callback).toHaveBeenCalledTimes(2);

    rerender({ delay: null });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('pauses while the tab is hidden', () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 100));

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(callback).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
});

describe('useEscapeKey', () => {
  it('fires only while active', () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ active }) => useEscapeKey(active, onEscape), {
      initialProps: { active: false },
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onEscape).not.toHaveBeenCalled();

    rerender({ active: true });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ handler }) => useEscapeKey(true, handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useBodyScrollLock', () => {
  it('locks scrolling while active and restores the previous value', () => {
    document.body.style.overflow = 'scroll';
    const { rerender } = renderHook(({ active }) => useBodyScrollLock(active), {
      initialProps: { active: true },
    });
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ active: false });
    expect(document.body.style.overflow).toBe('scroll');
  });
});

// ---------------------------------------------------------------------------
// Media + announcements
// ---------------------------------------------------------------------------

describe('useMediaQuery', () => {
  it('tracks the query and reacts to changes', () => {
    let listener: ((event: { matches: boolean }) => void) | null = null;
    const addEventListener = vi.fn((_type: string, handler: typeof listener) => {
      listener = handler;
    });
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener,
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);

    act(() => listener?.({ matches: false }));
    expect(result.current).toBe(false);
  });

  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1px)'));
    expect(result.current).toBe(false);
  });
});

describe('useLiveAnnouncer', () => {
  it('resets then publishes the message so repeats are still read out', async () => {
    const { result } = renderHook(() => useLiveAnnouncer());
    expect(result.current.liveRegionProps.children).toBe('');

    await act(async () => {
      result.current.announce('Dose recorded');
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(result.current.liveRegionProps.children).toBe('Dose recorded');
    expect(result.current.liveRegionProps['aria-live']).toBe('polite');
    expect(result.current.liveRegionProps.role).toBe('status');
  });
});

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

describe('useOnlineStatus', () => {
  function setOnline(online: boolean) {
    Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
  }

  it('follows the browser online/offline events', () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('starts online when the browser does not report', () => {
    Object.defineProperty(navigator, 'onLine', { value: undefined, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Install prompt
// ---------------------------------------------------------------------------

describe('useInstallPrompt', () => {
  function installEvent(outcome: 'accepted' | 'dismissed') {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome }),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    return event;
  }

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
  });

  it('cannot install until the browser offers the prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    await expect(result.current.promptInstall()).resolves.toBe('unavailable');
  });

  it('reports an accepted install and clears the prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = installEvent('accepted');

    expect(result.current.canInstall).toBe(true);
    await act(async () => {
      await expect(result.current.promptInstall()).resolves.toBe('accepted');
    });
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(false);
  });

  it('reports a dismissed install', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    installEvent('dismissed');

    await act(async () => {
      await expect(result.current.promptInstall()).resolves.toBe('dismissed');
    });
  });

  it('degrades gracefully when prompt() throws', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          prompt: () => Promise.reject(new Error('gesture required')),
          userChoice: Promise.resolve({ outcome: 'dismissed' }),
        }),
      );
    });

    await act(async () => {
      await expect(result.current.promptInstall()).resolves.toBe('unavailable');
    });
  });

  it('marks the app installed once appinstalled fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    installEvent('accepted');

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('detects an already-installed (standalone) page', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn() }));
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.installed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Service worker lifecycle
// ---------------------------------------------------------------------------

describe('useServiceWorkerUpdate', () => {
  let captured: {
    onInstalled?: () => void;
    onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  };

  beforeEach(() => {
    captured = {};
    // Call counts are asserted below, and Vitest does not guarantee that a
    // previous test's calls are gone (`restoreMocks` restores implementations,
    // it does not clear history in every version). Be explicit about it.
    vi.clearAllMocks();
    vi.mocked(registerServiceWorker).mockImplementation(async (hooks = {}) => {
      captured = hooks;
      return null;
    });
    vi.mocked(applyServiceWorkerUpdate).mockResolvedValue(true);
  });

  it('registers with the environment default', () => {
    renderHook(() => useServiceWorkerUpdate());
    expect(registerServiceWorker).toHaveBeenCalledWith(
      expect.objectContaining({}),
      import.meta.env.PROD,
    );
  });

  it('becomes offline-ready when the shell is cached', async () => {
    const { result } = renderHook(() => useServiceWorkerUpdate(true));
    expect(result.current.offlineReady).toBe(false);

    await act(async () => {
      captured.onInstalled?.();
    });
    expect(result.current.offlineReady).toBe(true);
    expect(result.current.updateAvailable).toBe(false);
  });

  it('surfaces a pending update and applies it', async () => {
    const onUpdate = vi.fn();
    const registration = {} as ServiceWorkerRegistration;
    const { result } = renderHook(() => useServiceWorkerUpdate(true, onUpdate));

    await act(async () => {
      captured.onUpdateAvailable?.(registration);
    });
    expect(result.current.updateAvailable).toBe(true);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await expect(result.current.applyUpdate()).resolves.toBe(true);
    });
    expect(applyServiceWorkerUpdate).toHaveBeenCalledWith(registration);
    expect(result.current.updateAvailable).toBe(false);
  });

  it('keeps the banner when the update could not be applied', async () => {
    vi.mocked(applyServiceWorkerUpdate).mockResolvedValue(false);
    const { result } = renderHook(() => useServiceWorkerUpdate(true));

    await act(async () => {
      captured.onUpdateAvailable?.({} as ServiceWorkerRegistration);
    });
    await act(async () => {
      await result.current.applyUpdate();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('registers only once across re-renders', async () => {
    const { rerender } = renderHook(() => useServiceWorkerUpdate(true));
    rerender();
    rerender();
    await act(async () => undefined);
    expect(registerServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('forwards the enabled flag so a dev build never caches itself', () => {
    renderHook(() => useServiceWorkerUpdate(false));
    expect(registerServiceWorker).toHaveBeenCalledWith(expect.anything(), false);
  });
});

// ---------------------------------------------------------------------------
// Focus management
// ---------------------------------------------------------------------------

function Dialog({
  open,
  onEscape,
  onOutsideClick,
  autoFocus = true,
  children,
}: {
  open: boolean;
  onEscape?: () => void;
  onOutsideClick?: () => void;
  autoFocus?: boolean;
  children?: React.ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, { onEscape, onOutsideClick, autoFocus });
  return (
    <div>
      <button type="button" data-testid="trigger">
        Open
      </button>
      {open && (
        <div ref={ref} role="dialog" aria-modal="true" data-testid="dialog">
          {children ?? (
            <>
              <button type="button" data-testid="first">
                First
              </button>
              <button type="button" data-testid="second">
                Second
              </button>
              <button type="button" data-testid="hidden" aria-hidden="true">
                Hidden
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleDialog({ onEscape }: { onEscape?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="open" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog open={open} onEscape={onEscape}>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="second">
          Second
        </button>
        <button type="button" data-testid="close" onClick={() => setOpen(false)}>
          Close
        </button>
      </Dialog>
    </>
  );
}

describe('useFocusTrap', () => {
  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup();
    render(<ToggleDialog />);

    await user.click(screen.getByTestId('open'));
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('wraps Tab forward from the last control', async () => {
    const user = userEvent.setup();
    render(<ToggleDialog />);
    await user.click(screen.getByTestId('open'));

    screen.getByTestId('close').focus();
    await user.tab();
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('wraps Shift+Tab back from the first control', async () => {
    const user = userEvent.setup();
    render(<ToggleDialog />);
    await user.click(screen.getByTestId('open'));

    await user.tab({ shift: true });
    expect(screen.getByTestId('close')).toHaveFocus();
  });

  it('gives focus back to the element that opened it', async () => {
    const user = userEvent.setup();
    render(<ToggleDialog />);

    await user.click(screen.getByTestId('open'));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    await user.click(screen.getByTestId('close'));

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('open')).toHaveFocus();
  });

  it('calls onEscape on the Escape key', async () => {
    const onEscape = vi.fn();
    render(<Dialog open onEscape={onEscape} />);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('makes an empty dialog focusable instead of letting focus escape', async () => {
    const user = userEvent.setup();
    render(
      <Dialog open>
        <span>no controls in here</span>
      </Dialog>,
    );

    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('tabindex', '-1');
    expect(dialog).toHaveFocus();

    await user.tab();
    expect(dialog).toHaveFocus();
  });

  it('leaves focus alone when autoFocus is off', async () => {
    const outside = render(<Dialog open autoFocus={false} />);
    expect(outside.getByTestId('dialog')).not.toHaveFocus();
  });

  it('closes on a pointer-down outside the dialog', async () => {
    const onOutsideClick = vi.fn();
    render(
      <div>
        <span data-testid="outside-target">outside</span>
        <Dialog open onOutsideClick={onOutsideClick} />
      </div>,
    );

    await act(async () => {
      screen
        .getByTestId('outside-target')
        .dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(onOutsideClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByTestId('first').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing while closed', () => {
    render(<Dialog open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });
});
