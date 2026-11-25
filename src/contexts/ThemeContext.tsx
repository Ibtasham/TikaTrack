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

export type ThemePalette =
  | 'wood'
  | 'bamboo'
  | 'botanical'
  | 'terracotta'
  | 'coastal'
  | 'indigo';

export const THEME_PALETTES: readonly ThemePalette[] = [
  'wood',
  'bamboo',
  'botanical',
  'terracotta',
  'coastal',
  'indigo',
] as const;

export interface ThemePresetMeta {
  id: ThemePalette;
  labelKey: string;
  day: { canvas: string; card: string; accent: string };
  dark: { canvas: string; card: string; accent: string };
}

export const THEME_PRESETS: readonly ThemePresetMeta[] = [
  {
    id: 'wood',
    labelKey: 'common.theme.wood',
    day: { canvas: '#e6d3b5', card: '#f7efe2', accent: '#047857' },
    dark: { canvas: '#150e09', card: '#211710', accent: '#10b981' },
  },
  {
    id: 'bamboo',
    labelKey: 'common.theme.bamboo',
    day: { canvas: '#eadfbf', card: '#f8f2e4', accent: '#0f766e' },
    dark: { canvas: '#12110b', card: '#1d1b12', accent: '#14b8a6' },
  },
  {
    id: 'botanical',
    labelKey: 'common.theme.botanical',
    day: { canvas: '#dce8e0', card: '#f3f8f4', accent: '#059669' },
    dark: { canvas: '#091512', card: '#10221d', accent: '#34d399' },
  },
  {
    id: 'terracotta',
    labelKey: 'common.theme.terracotta',
    day: { canvas: '#eedad0', card: '#faf1ec', accent: '#c2410c' },
    dark: { canvas: '#180f0c', card: '#251713', accent: '#fb923c' },
  },
  {
    id: 'coastal',
    labelKey: 'common.theme.coastal',
    day: { canvas: '#dce7ef', card: '#f2f7fb', accent: '#0369a1' },
    dark: { canvas: '#09141d', card: '#11212f', accent: '#38bdf8' },
  },
  {
    id: 'indigo',
    labelKey: 'common.theme.indigo',
    day: { canvas: '#e2e1ef', card: '#f5f4fb', accent: '#4338ca' },
    dark: { canvas: '#0f0e1c', card: '#18172b', accent: '#818cf8' },
  },
] as const;

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
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
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

function isThemePalette(value: string): value is ThemePalette {
  return (THEME_PALETTES as readonly string[]).includes(value);
}

function readPalette(): ThemePalette {
  const stored = readString(STORAGE_KEYS.palette, '');
  return isThemePalette(stored) ? stored : 'wood';
}

function readTextSize(): TextSize {
  const stored = readString(STORAGE_KEYS.textSize, '');
  return stored === 'large' || stored === 'xlarge' ? stored : 'normal';
}

function applyToDocument(theme: Theme, palette: ThemePalette) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-palette', palette);

  const preset = THEME_PRESETS.find((item) => item.id === palette) ?? THEME_PRESETS[0];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? preset.dark.canvas : preset.day.accent);
  }
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
  const [palette, setPaletteState] = useState<ThemePalette>(() =>
    isStorageAvailable() ? readPalette() : 'wood',
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
    applyToDocument(theme, palette);
  }, [theme, palette]);

  useEffect(() => {
    writeString(STORAGE_KEYS.theme, preference);
  }, [preference]);

  useEffect(() => {
    writeString(STORAGE_KEYS.palette, palette);
  }, [palette]);

  useEffect(() => {
    applyTextSize(textSize);
    writeString(STORAGE_KEYS.textSize, textSize);
  }, [textSize]);

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), []);
  const setPalette = useCallback((next: ThemePalette) => setPaletteState(next), []);
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
    () => ({
      preference,
      theme,
      setTheme,
      toggleTheme,
      palette,
      setPalette,
      textSize,
      setTextSize,
      cycleTextSize,
    }),
    [preference, theme, setTheme, toggleTheme, palette, setPalette, textSize, setTextSize, cycleTextSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
