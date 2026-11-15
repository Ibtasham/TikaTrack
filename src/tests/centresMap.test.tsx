import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { I18nProvider, translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import {
  formatRouteDistance,
  formatRouteDuration,
  isMapsQuotaError,
  notifyMapsQuotaExceeded,
} from '../lib/googleMaps';
import CentresPage from '../pages/CentresPage';

const en = translations.en;

describe('googleMaps helpers & Case A quota defense', () => {
  it('identifies quota exhaustion signals without false positives', () => {
    expect(isMapsQuotaError({ status: 429 })).toBe(true);
    expect(isMapsQuotaError({ status: 'RESOURCE_EXHAUSTED' })).toBe(true);
    expect(isMapsQuotaError({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } })).toBe(true);
    expect(isMapsQuotaError({ status: 'OVER_QUERY_LIMIT' })).toBe(true);
    expect(isMapsQuotaError(new Error('OverQuotaMapError: daily quota exceeded'))).toBe(true);
    expect(isMapsQuotaError(new Error('QuotaExceededError'))).toBe(true);

    // Must not false-positive on normal empty results or unrelated errors.
    expect(isMapsQuotaError(null)).toBe(false);
    expect(isMapsQuotaError(undefined)).toBe(false);
    expect(isMapsQuotaError({ status: 'ZERO_RESULTS' })).toBe(false);
    expect(isMapsQuotaError(new Error('ZERO_RESULTS'))).toBe(false);
    expect(isMapsQuotaError(new Error('Network offline'))).toBe(false);
  });

  it('dispatches gmp-quota-exceeded and surfaces the root App warning banner', async () => {
    window.history.pushState({}, '', '/centres');
    render(<App />);

    expect(screen.queryByText(/Google Maps Platform quota reached/i)).toBeNull();

    act(() => {
      notifyMapsQuotaExceeded();
    });

    const link = await screen.findByRole('link', { name: /maps developer site/i });
    expect(link.getAttribute('href')).toContain('utm_campaign=gmp_mcp_codeassist_v1_aistudio');
  });

  it('formats route distances and durations in English and Bangla', () => {
    expect(formatRouteDistance(450, 'en')).toBe('450 m');
    expect(formatRouteDistance(3240, 'en')).toBe('3.2 km');
    expect(formatRouteDistance(15400, 'en')).toBe('15 km');
    expect(formatRouteDistance(450, 'bn')).toContain('মি.');
    expect(formatRouteDistance(3240, 'bn')).toContain('কি.মি.');

    expect(formatRouteDuration(5 * 60 * 1000, 'en')).toBe('5 min');
    expect(formatRouteDuration(60 * 60 * 1000, 'en')).toBe('1 hr');
    expect(formatRouteDuration(75 * 60 * 1000, 'en')).toBe('1 hr 15 min');
    expect(formatRouteDuration(12 * 60 * 1000, 'bn')).toContain('মিনিট');
    expect(formatRouteDuration(90 * 60 * 1000, 'bn')).toContain('ঘণ্টা');
  });
});

describe('CentresPage map integration & fallback behaviour', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  function renderCentresPage() {
    return render(
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <CentresPage />
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>,
    );
  }

  it('supports view mode switching and renders offline fallback cleanly when Maps key is absent', async () => {
    const user = userEvent.setup();
    renderCentresPage();

    const splitBtn = screen.getByRole('button', { name: en['centres.view.split'] });
    const mapBtn = screen.getByRole('button', { name: en['centres.view.map'] });
    const listBtn = screen.getByRole('button', { name: en['centres.view.list'] });

    expect(splitBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(en['centres.map.unavailable'])).toBeTruthy();
    expect(screen.getByText(/EPI Headquarters - DGHS/i)).toBeTruthy();

    // Switch to List only -> hides map fallback card, preserves directory.
    await user.click(listBtn);
    expect(listBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText(en['centres.map.unavailable'])).toBeNull();
    expect(screen.getByText(/EPI Headquarters - DGHS/i)).toBeTruthy();

    // Switch to Map only -> shows map container (or graceful fallback), hides centre list.
    await user.click(mapBtn);
    expect(mapBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(en['centres.map.unavailable'])).toBeTruthy();
    expect(screen.queryByText(/EPI Headquarters - DGHS/i)).toBeNull();
  });

  it('filters centres and exposes the 16263 helpline fallback on empty matches', async () => {
    const user = userEvent.setup();
    renderCentresPage();

    const searchInput = screen.getByPlaceholderText(en['centres.searchPlaceholder']);
    await user.type(searchInput, 'zzznonexistentcentre999');

    const helplineLink = await screen.findByRole('link', { name: /16263/i });
    expect(helplineLink.getAttribute('href')).toBe('tel:16263');
  });

  it('sorts centres by distance when geolocation succeeds', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 23.7937,
          longitude: 90.4066,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    renderCentresPage();
    await user.click(screen.getByRole('button', { name: en['centres.nearMe'] }));

    expect(await screen.findByRole('button', { name: en['centres.locationClear'] })).toBeTruthy();
    expect(screen.getAllByText(/away$/i).length).toBeGreaterThan(0);
  });
});
