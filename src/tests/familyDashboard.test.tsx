import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { FamilyDashboard } from '../components/FamilyDashboard';
import { ThemeProvider } from '../contexts/ThemeContext';
import { I18nProvider, translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { addDays, startOfToday, toISODate } from '../lib/format';
import { createProfile, recordDose } from '../lib/profileStore';
import type { Profile } from '../types';

const en = translations.en;
const bn = translations.bn;

function renderDashboard(profiles: Profile[]) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>
          <FamilyDashboard profiles={profiles} />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function buildInfantProfile(options?: { withGrowth?: boolean; onlyBirthDoses?: boolean }): Profile {
  // ~105 days (~15 weeks) old so birth + 6-week + 10-week + 14-week doses are due/overdue or upcoming.
  const dob = toISODate(addDays(startOfToday(), -105));
  const created = createProfile({
    name: 'Ayaan Karim',
    dateOfBirth: dob,
    relationship: 'child',
    gender: 'male',
  });
  if (!created.profile) throw new Error('Failed to create test profile');

  let list = recordDose([created.profile], created.profile.id, 'bcg', {
    date: dob,
    doseNumber: 1,
    centre: 'Dhaka Medical College Hospital',
  });

  if (!options?.onlyBirthDoses) {
    list = recordDose(list, created.profile.id, 'opv', {
      date: dob,
      doseNumber: 1,
    });
  }

  const profile = list[0];
  if (options?.withGrowth) {
    profile.growth = [
      {
        id: 'gr-1',
        date: toISODate(addDays(startOfToday(), -5)),
        weightKg: 6.4,
        heightCm: 62.5,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return profile;
}

describe('FamilyDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('renders nothing when no family profiles exist', () => {
    const { container } = renderDashboard([]);
    expect(container.firstChild).toBeNull();
  });

  it('renders completion overview, overdue review links, upcoming timeline, growth summary, and quick actions', () => {
    const profile = buildInfantProfile({ withGrowth: true });
    renderDashboard([profile]);

    expect(screen.getByText(en['home.dashboard.eyebrow'])).toBeTruthy();
    expect(screen.getByTestId('vaccine-countdown')).toBeTruthy();
    expect(screen.getByText(en['home.dashboard.countdownTitle'])).toBeTruthy();
    expect(screen.getByText(en['home.dashboard.completionTitle'])).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: en['home.dashboard.completionTitle'] })).toBeTruthy();

    // Quick action navigation links
    const quickNav = screen.getByRole('navigation', { name: en['home.dashboard.quickActions'] });
    expect(within(quickNav).getByRole('link', { name: en['home.dashboard.action.record'] }).getAttribute('href')).toBe('/tracker');
    expect(within(quickNav).getByRole('link', { name: en['home.dashboard.action.schedule'] }).getAttribute('href')).toBe('/schedule');
    expect(within(quickNav).getByRole('link', { name: en['home.dashboard.action.passport'] }).getAttribute('href')).toBe('/passport');
    expect(within(quickNav).getByRole('link', { name: en['home.dashboard.action.centres'] }).getAttribute('href')).toBe('/centres');

    // Growth telemetry & family summary
    expect(screen.getAllByText('Ayaan Karim').length).toBeGreaterThan(0);
    expect(screen.getByText(/6\.4 kg · 62\.5 cm/)).toBeTruthy();

    // Overdue review action links into catchup mode in tracker
    const reviewLinks = screen.getAllByRole('link', { name: en['home.dashboard.reviewButton'] });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0].getAttribute('href')).toContain(`/tracker?member=${encodeURIComponent(profile.id)}`);

    // Upcoming timeline rows deep-link straight into recording a dose
    const recordLinks = screen.getAllByRole('link', { name: en['home.dashboard.recordDose'] });
    expect(recordLinks.length).toBeGreaterThan(0);
    expect(recordLinks[0].getAttribute('href')).toContain('&action=record');

    // Contextual Bangladesh EPI education & 16263 helpline
    expect(screen.getByText(en['home.dashboard.educationTitle'])).toBeTruthy();
    expect(screen.getByRole('link', { name: /16263/ }).getAttribute('href')).toBe('tel:16263');
  });

  it('shows clear review notice when newborn has all birth doses up to date', () => {
    const today = toISODate(startOfToday());
    const created = createProfile({
      name: 'Nora Islam',
      dateOfBirth: today,
      relationship: 'child',
      gender: 'female',
    });
    if (!created.profile) throw new Error('Failed to create newborn');
    let list = recordDose([created.profile], created.profile.id, 'bcg', { date: today, doseNumber: 1 });
    list = recordDose(list, created.profile.id, 'opv', { date: today, doseNumber: 1 });

    renderDashboard(list);

    expect(screen.getByText(en['home.dashboard.reviewClear'])).toBeTruthy();
    expect(screen.getByText(en['home.dashboard.noGrowthYet'])).toBeTruthy();
  });

  it('localizes dashboard telemetry and guidance into Bangla', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    const profile = buildInfantProfile({ withGrowth: true });
    renderDashboard([profile]);

    expect(screen.getByText(bn['home.dashboard.eyebrow'])).toBeTruthy();
    expect(screen.getByText(bn['home.dashboard.countdownTitle'])).toBeTruthy();
    expect(screen.getByText(bn['home.dashboard.completionTitle'])).toBeTruthy();
    expect(screen.getByText(bn['home.dashboard.educationTitle'])).toBeTruthy();
    expect(screen.getByText(/৬\.৪ kg/)).toBeTruthy();
  });
});
