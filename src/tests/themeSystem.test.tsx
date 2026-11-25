import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { THEME_PALETTES, THEME_PRESETS } from '../contexts/ThemeContext';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { STORAGE_KEYS } from '../lib/storage';

const en = translations.en;

describe('Warm Wood Day Mode & Multi-Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-palette');
  });

  it('defaults Day Mode to Warm Wood palette rather than white', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByText(en['home.hero.title'])).toBeTruthy();
    expect(document.documentElement.getAttribute('data-palette')).toBe('wood');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    const woodPreset = THEME_PRESETS.find((preset) => preset.id === 'wood');
    expect(woodPreset?.day.canvas.toLowerCase()).not.toBe('#ffffff');
    expect(woodPreset?.day.canvas.toLowerCase()).not.toBe('#fafafa');
  });

  it('switches Display Mode and all curated color themes via Header ThemePicker and persists selection', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/');
    render(<App />);

    const pickerButtons = await screen.findAllByRole('button', {
      name: en['common.theme.toggle'],
    });
    await user.click(pickerButtons[0]);

    for (const paletteId of THEME_PALETTES) {
      const label = en[`common.theme.${paletteId}`];
      const themeBtn = await screen.findByRole('button', { name: label });
      await user.click(themeBtn);
      expect(document.documentElement.getAttribute('data-palette')).toBe(paletteId);
      expect(localStorage.getItem(STORAGE_KEYS.palette)).toBe(paletteId);
    }

    const nightBtn = await screen.findByRole('button', { name: en['common.theme.dark'] });
    await user.click(nightBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });

  it('renders the full ThemeAppearanceCard on /privacy and switches to Terracotta Clay cleanly', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/privacy');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: en['common.theme.palette'] }),
    ).toBeTruthy();

    const terracottaBtn = await screen.findByRole('button', {
      name: en['common.theme.terracotta'],
    });
    await user.click(terracottaBtn);
    expect(document.documentElement.getAttribute('data-palette')).toBe('terracotta');
    expect(localStorage.getItem(STORAGE_KEYS.palette)).toBe('terracotta');
  });
});
