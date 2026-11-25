import { useState } from 'react';
import { Type } from 'lucide-react';

import { TEXT_SIZES, useTheme, type TextSize } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';

/** The sample glyph grows with the setting, so the choice is self-describing. */
const SAMPLE_CLASS: Record<TextSize, string> = {
  normal: 'text-xs',
  large: 'text-sm',
  xlarge: 'text-base',
};

/**
 * Text-size preference.
 *
 * A vaccination schedule is read by grandparents, by people in bright sunlight
 * and by people with low vision — for all of them the browser default is too
 * small, and pinch-zooming a form is where mis-taps happen. This scales the root
 * font size, so spacing scales with the text and nothing overflows.
 */
export function TextSizeButton({ className = 'btn-ghost btn-sm' }: { className?: string }) {
  const { t, language } = useI18n();
  const { textSize, setTextSize } = useTheme();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const ref = useFocusTrap<HTMLDivElement>(open, { onEscape: close, onOutsideClick: close });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={className}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t('common.label.textSize')}: ${t(`common.textSize.${textSize}`)}`}
        title={t('common.label.textSize')}
      >
        <Type className="h-4 w-4" aria-hidden="true" />
        <span className={`font-semibold ${SAMPLE_CLASS[textSize]}`} aria-hidden="true">
          A
        </span>
      </button>

      {open && (
        <div
          role="group"
          aria-label={t('common.label.textSize')}
          className="animate-scale-in absolute right-0 z-50 mt-2 w-44 rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-1.5 shadow-xl"
        >
          {TEXT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setTextSize(size);
                close();
              }}
              aria-pressed={textSize === size}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                textSize === size
                  ? 'bg-[var(--tt-accent-soft)] font-semibold text-[var(--tt-accent-ink)]'
                  : 'text-[var(--tt-ink-muted)] hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)]'
              }`}
            >
              <span className={`w-5 text-center ${SAMPLE_CLASS[size]}`} aria-hidden="true">
                A
              </span>
              <span className={language === 'bn' ? 'font-bangla' : undefined}>
                {t(`common.textSize.${size}`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TextSizeButton;
