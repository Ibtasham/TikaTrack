import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import App from '../App';
import Logo from '../components/Logo';
import { isPublishable } from '../data/evidence/bridge';
import {
  evaluateScenarioReadiness,
  READINESS_SCENARIOS,
} from '../data/readinessScenarios';
import { allVaccines } from '../data/vaccines';
import { ProfilesProvider } from '../contexts/ProfilesContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { I18nProvider } from '../i18n';
import { createProfile, recordDoseEvent } from '../lib/profileStore';
import ReadinessPage from '../pages/ReadinessPage';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

describe('Bespoke Logo & Favicon upgrade', () => {
  it('renders custom architectural SVG monogram without blur glows across variants', () => {
    const { container, rerender } = render(<Logo size="sm" showText={false} />);
    const svg = container.querySelector('svg[aria-label="TikaTrack emblem"]');
    expect(svg).not.toBeNull();
    expect(container.querySelector('.blur-lg')).toBeNull();
    expect(screen.queryByText(/TikaTrack/i)).toBeNull();

    rerender(<Logo size="xl" variant="white" showText />);
    expect(screen.getByText(/টিকাট্র্যাক/)).toBeInTheDocument();
  });
});

describe('Readiness Scenarios engine invariants', () => {
  it('references only real, publishable vaccines in allVaccines', () => {
    const ids = new Set(allVaccines.map((v) => v.id));
    for (const scenario of READINESS_SCENARIOS) {
      expect(scenario.recommendations.length).toBeGreaterThanOrEqual(4);
      for (const rec of scenario.recommendations) {
        expect(ids.has(rec.vaccineId)).toBe(true);
        expect(isPublishable(rec.vaccineId)).toBe(true);
      }
    }
  });

  it('cross-checks family profile events and computes latest clinic dates', () => {
    const created = createProfile({
      name: 'Tariq',
      dateOfBirth: '1988-05-10',
      gender: 'male',
    });
    expect(created.profile).toBeDefined();
    if (!created.profile) return;

    let profiles = [created.profile];
    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'meningococcal-acwy',
      doseNumber: 1,
      date: '2025-02-01',
    }).profiles;

    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'pentavalent',
      doseNumber: 3,
      date: '1988-09-01',
    }).profiles;

    const sampleProfile = profiles[0];

    const hajj = evaluateScenarioReadiness(['hajj'], sampleProfile, '2026-06-20');
    const menItem = hajj.items.find((i) => i.vaccine.id === 'meningococcal-acwy');
    expect(menItem?.status).toBe('recorded');
    expect(menItem?.recordedCount).toBe(1);
    expect(menItem?.latestClinicDate).toBe('2026-06-10');

    const fluItem = hajj.items.find((i) => i.vaccine.id === 'influenza');
    expect(fluItem?.status).toBe('needed');
    expect(fluItem?.latestClinicDate).toBe('2026-06-06');

    const occ = evaluateScenarioReadiness(['occupational'], sampleProfile);
    const hepItem = occ.items.find((i) => i.vaccine.id === 'hepatitis-b-adult');
    expect(hepItem?.status).toBe('recorded');
    expect(hepItem?.matchedViaEquivalent).toBe(true);
  });
});

describe('ReadinessPage & CommandPalette UI integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows selecting scenarios and calculating deadlines on ReadinessPage', () => {
    render(
      <MemoryRouter initialEntries={['/readiness']}>
        <I18nProvider>
          <AuthProvider>
            <ProfilesProvider>
              <ToastProvider>
                <ReadinessPage />
                <LocationProbe />
              </ToastProvider>
            </ProfilesProvider>
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Vaccine Readiness Advisor/i })).toBeInTheDocument();
    // Hajj is active by default — Meningococcal ACWY visible in guidance + vaccine card
    expect(screen.getAllByText(/Meningococcal ACWY/i).length).toBeGreaterThan(0);

    // Toggle Pregnancy on as well
    fireEvent.click(screen.getByRole('button', { name: /Pregnancy & Expectant Parent/i }));
    expect(screen.getAllByText(/Maternal RSV/i).length).toBeGreaterThan(0);

    // Enter a target date
    const dateInput = screen.getByLabelText(/Departure date/i);
    fireEvent.change(dateInput, { target: { value: '2027-06-20' } });
    expect(screen.getAllByText(/Latest recommended clinic date/i).length).toBeGreaterThan(0);
  });

  it('opens CommandPalette via Ctrl+K, searches across 90 vaccines & 175 centres, and navigates', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    // Open with Ctrl+K
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    const searchInput = await screen.findByPlaceholderText(/Search 90 vaccines/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Yellow Fever' } });
    const vaccineOption = await screen.findByRole('option', { name: /^Yellow Fever —/i });
    fireEvent.click(vaccineOption);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/vaccines/yellowFever');
    });
  });
});
