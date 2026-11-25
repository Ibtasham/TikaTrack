import { useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';

import {
  THEME_PRESETS,
  useTheme,
  type ThemePreference,
} from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';

const MODE_OPTIONS: Array<{ value: ThemePreference; icon: typeof Sun; labelKey: string }> = [
  { value: 'light', icon: Sun, labelKey: 'common.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'common.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'common.theme.system' },
];

function ThemePaletteGrid({ compact = false }: { compact?: boolean }) {
  const { t, language } = useI18n();
  const { preference, theme, setTheme, palette, setPalette } = useTheme();
  const isBangla = language === 'bn';

  return (
    <div>
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
          {t('common.theme.mode')}
        </p>
        <div
          role="group"
          aria-label={t('common.theme.mode')}
          className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-subtle)] p-1"
        >
          {MODE_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
            const selected = preference === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(value)}
                className={`flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selected
                    ? 'bg-[var(--tt-card)] text-[var(--tt-accent)] shadow-xs'
                    : 'text-[var(--tt-ink-muted)] hover:text-[var(--tt-ink)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>{t(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5 border-t border-[var(--tt-border)] pt-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
          {t('common.theme.palette')}
        </p>
        <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
          {THEME_PRESETS.map((preset) => {
            const selected = palette === preset.id;
            const colors = theme === 'dark' ? preset.dark : preset.day;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPalette(preset.id)}
                className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                  selected
                    ? 'border-[var(--tt-accent)] bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]'
                    : 'border-[var(--tt-border)] bg-[var(--tt-card)] text-[var(--tt-ink)] hover:bg-[var(--tt-subtle)]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-4 w-6 shrink-0 overflow-hidden rounded border border-black/15"
                    aria-hidden="true"
                  >
                    <span className="w-1/2" style={{ backgroundColor: colors.canvas }} />
                    <span className="w-1/4" style={{ backgroundColor: colors.card }} />
                    <span className="w-1/4" style={{ backgroundColor: colors.accent }} />
                  </span>
                  <span className={`truncate ${isBangla ? 'font-bangla' : ''}`}>
                    {t(preset.labelKey)}
                  </span>
                </span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Header popover combining Day / Night / System display mode with the 6 curated
 * surface & accent themes (defaulting to Warm Wood in Day Mode).
 */
export function ThemePicker({ className = 'btn-ghost btn-sm' }: { className?: string }) {
  const { t } = useI18n();
  const { theme, palette } = useTheme();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const ref = useFocusTrap<HTMLDivElement>(open, { onEscape: close, onOutsideClick: close });

  const activePreset = THEME_PRESETS.find((item) => item.id === palette) ?? THEME_PRESETS[0];
  const activeSwatch = theme === 'dark' ? activePreset.dark : activePreset.day;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`${className} min-h-[36px] gap-1.5 px-2.5 py-1.5`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('common.theme.toggle')}
        title={`${t('common.theme.palette')}: ${t(activePreset.labelKey)}`}
      >
        <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span
          className="h-3 w-3 shrink-0 rounded-sm border border-[var(--tt-border-strong)]"
          style={{ backgroundColor: activeSwatch.canvas }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('common.theme.palette')}
          className="animate-scale-in absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-3 shadow-xl"
        >
          <ThemePaletteGrid compact />
        </div>
      )}
    </div>
  );
}

/**
 * Full-width appearance card for `/privacy` so users can browse and test all
 * Display Modes and Color Themes directly alongside device settings.
 */
export function ThemeAppearanceCard() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  return (
    <section className="card-padded mt-5" aria-labelledby="appearance-themes-heading">
      <h2
        id="appearance-themes-heading"
        className={`flex items-center gap-2 text-lg font-bold text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}
      >
        <Palette className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
        <span>{t('common.theme.palette')}</span>
      </h2>
      <div className="mt-4">
        <ThemePaletteGrid />
      </div>
    </section>
  );
}

export default ThemePicker;
