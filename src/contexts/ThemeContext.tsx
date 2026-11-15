import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isStorageAvailable,
  readString,
  readStringWithLegacy,
  STORAGE_KEYS,
  writeString,
} from '../lib/storage';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

/**
 * Root font size preference.
 *
 * Low-vision users, and anyone reading a vaccination schedule in strong
 * sunlight, need more than the browser default. Scaling the root font size
 * scales every rem-based utility — text *and* spacing — so the layout keeps its
 * proportions instead of overflowing.
 */
export type TextSize = 'normal' | 'large' | 'xlarge';

export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'xlarge'] as const;

interface ThemeContextValue {
  /** What the user asked for. */
  preference: ThemePreference;
  /** What is actually applied (resolves `system`). */
  theme: Theme;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** Step to the next size, wrapping back to normal. */
  cycleTextSize: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readPreference(): ThemePreference {
  const stored = readStringWithLegacy(STORAGE_KEYS.theme, 'theme', '');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function readTextSize(): TextSize {
  const stored = readString(STORAGE_KEYS.textSize, '');
  return stored === 'large' || stored === 'xlarge' ? stored : 'normal';
}

function applyToDocument(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1f1a' : '#059669');
}

function applyTextSize(size: TextSize) {
  const root = document.documentElement;
  if (size === 'normal') root.removeAttribute('data-text-size');
  else root.setAttribute('data-text-size', size);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    isStorageAvailable() ? readPreference() : 'system',
  );
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);
  const [textSize, setTextSizeState] = useState<TextSize>(() =>
    isStorageAvailable() ? readTextSize() : 'normal',
  );

  const theme: Theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // Follow the OS when the user picked "system".
  useEffect(() => {
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    applyToDocument(theme);
  }, [theme]);

  useEffect(() => {
    writeString(STORAGE_KEYS.theme, preference);
  }, [preference]);

  useEffect(() => {
    applyTextSize(textSize);
    writeString(STORAGE_KEYS.textSize, textSize);
  }, [textSize]);

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), []);
  const toggleTheme = useCallback(
    () => setPreference((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );

  const setTextSize = useCallback((next: TextSize) => setTextSizeState(next), []);
  const cycleTextSize = useCallback(
    () =>
      setTextSizeState((current) => {
        const index = TEXT_SIZES.indexOf(current);
        return TEXT_SIZES[(index + 1) % TEXT_SIZES.length];
      }),
    [],
  );

  const value = useMemo(
    () => ({ preference, theme, setTheme, toggleTheme, textSize, setTextSize, cycleTextSize }),
    [preference, theme, setTheme, toggleTheme, textSize, setTextSize, cycleTextSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
