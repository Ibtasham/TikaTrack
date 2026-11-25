import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { FamilyDashboard } from '../components/FamilyDashboard';
import { FamilyProgressChart } from '../components/FamilyProgressChart';
import { ThemeProvider } from '../contexts/ThemeContext';
import { I18nProvider, translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { buildFamilyProgressSeries } from '../lib/familyProgress';
import { createProfile, recordDose } from '../lib/profileStore';
import type { Profile } from '../types';

const en = translations.en;
const bn = translations.bn;

function buildSampleFamily(): Profile[] {
  // Older sibling born 2025-11-01 (as of 2026-06-15 -> ~7.5m old, 0d/6w/10w/14w due, 9m/15m ahead)
  const first = createProfile({
    name: 'Rafi Ahmed',
    dateOfBirth: '2025-11-01',
    relationship: 'child',
    gender: 'male',
  });
  if (!first.profile) throw new Error('Failed to create Rafi');

  // Younger sibling born 2026-04-01 (as of 2026-06-15 -> ~2.5m old)
  const second = createProfile({
    name: 'Zara Ahmed',
    dateOfBirth: '2026-04-01',
    relationship: 'child',
    gender: 'female',
  });
  if (!second.profile) throw new Error('Failed to create Zara');

  let list: Profile[] = [first.profile, second.profile];
  // Rafi received BCG & OPV-1 at birth (2025-11-01) and OPV-2 at 6 weeks (2025-12-15)
  list = recordDose(list, first.profile.id, 'bcg', { date: '2025-11-01', doseNumber: 1 });
  list = recordDose(list, first.profile.id, 'opv', { date: '2025-11-01', doseNumber: 1 });
  list = recordDose(list, first.profile.id, 'opv', { date: '2025-12-15', doseNumber: 2 });

  // Zara received BCG & OPV-1 at birth (2026-04-01)
  list = recordDose(list, second.profile.id, 'bcg', { date: '2026-04-01', doseNumber: 1 });
  list = recordDose(list, second.profile.id, 'opv', { date: '2026-04-01', doseNumber: 1 });

  return list;
}

function renderChart(profiles: Profile[]) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>
          <FamilyProgressChart profiles={profiles} />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('buildFamilyProgressSeries', () => {
  it('returns an empty dataset when no profiles are provided', () => {
    const result = buildFamilyProgressSeries([]);
    expect(result.points).toEqual([]);
    expect(result.members).toEqual([]);
    expect(result.hasScheduledDoses).toBe(false);
  });

  it('tracks cumulative scheduled vs completed progress chronologically and keeps pre-birth & future points accurate', () => {
    const family = buildSampleFamily();
    const [rafi, zara] = family;

    const dataset = buildFamilyProgressSeries(family, {
      language: 'en',
      horizon: 'active',
      dateOptions: { asOfDate: '2026-06-15' },
    });

    expect(dataset.hasScheduledDoses).toBe(true);
    expect(dataset.currentMonthKey).toBe('2026-06');
    expect(dataset.members.map((m) => m.name)).toEqual(['Rafi Ahmed', 'Zara Ahmed']);

    // Birth month for Rafi (2025-11): 2 scheduled, 2 completed => 100%; Zara not born yet => null
    const novPoint = dataset.points.find((p) => p.monthKey === '2025-11');
    expect(novPoint).toBeDefined();
    expect(novPoint?.[`pct_${rafi.id}`]).toBe(100);
    expect(novPoint?.[`completed_${rafi.id}`]).toBe(2);
    expect(novPoint?.[`scheduled_${rafi.id}`]).toBe(2);
    expect(novPoint?.[`pct_${zara.id}`]).toBeNull();
    expect(novPoint?.[`scheduled_${zara.id}`]).toBeNull();

    // Zara's birth month (2026-04): 2/2 => 100%, while Rafi has 3/13 => 23%
    const aprPoint = dataset.points.find((p) => p.monthKey === '2026-04');
    expect(aprPoint).toBeDefined();
    expect(aprPoint?.[`pct_${zara.id}`]).toBe(100);
    expect(aprPoint?.[`completed_${rafi.id}`]).toBe(3);
    expect(aprPoint?.[`scheduled_${rafi.id}`]).toBeGreaterThan(3);

    // Current month (2026-06) marked clearly
    const junPoint = dataset.points.find((p) => p.monthKey === '2026-06');
    expect(junPoint?.isCurrentMonth).toBe(true);
    expect(junPoint?.isFuture).toBe(false);
    expect(junPoint?.familyCompleted).toBe(5);

    // Future scheduled month (2026-08): Rafi's 9m MR-1 rises scheduled count; actual completion is null
    const futurePoints = dataset.points.filter((p) => p.isFuture);
    expect(futurePoints.length).toBeGreaterThan(0);
    expect(futurePoints[0][`pct_${rafi.id}`]).toBeNull();
    expect(futurePoints[0][`completed_${rafi.id}`]).toBeNull();
    expect(futurePoints[0].familyScheduled).toBeGreaterThanOrEqual(
      junPoint?.familyScheduled ?? 0,
    );
  });

  it('supports full lifespan timeline horizon and Bangla month formatting', () => {
    const family = buildSampleFamily();
    const dataset = buildFamilyProgressSeries(family, {
      language: 'bn',
      horizon: 'full',
      dateOptions: { asOfDate: '2026-06-15' },
    });

    expect(dataset.points.length).toBeGreaterThan(4);
    const current = dataset.points.find((p) => p.monthKey === '2026-06');
    expect(current?.fullLabel).toContain('জুন');
    expect(current?.fullLabel).toContain('২০২৬');
  });
});

describe('FamilyProgressChart UI', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('renders Recharts visualization and allows switching metric, horizon, and focused member', async () => {
    const user = userEvent.setup();
    const family = buildSampleFamily();
    const { container } = renderChart(family);

    expect(screen.getByText(en['home.dashboard.progressChartTitle'])).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();

    // Member selector buttons show both members
    const rafiBtn = screen.getByRole('button', { name: /Rafi Ahmed/ });
    const zaraBtn = screen.getByRole('button', { name: /Zara Ahmed/ });
    expect(rafiBtn).toBeTruthy();
    expect(zaraBtn).toBeTruthy();

    // Switch to Doses metric
    const dosesBtn = screen.getByRole('button', { name: en['home.dashboard.progressMetricDoses'] });
    await user.click(dosesBtn);
    expect(dosesBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(en['home.dashboard.progressCompletedDoses'])).toBeTruthy();

    // Focus single member and back to all
    await user.click(zaraBtn);
    expect(zaraBtn.getAttribute('aria-pressed')).toBe('true');

    const allBtn = screen.getByRole('button', { name: en['home.dashboard.progressAllMembers'] });
    await user.click(allBtn);
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');

    // Toggle full timeline horizon
    const fullBtn = screen.getByRole('button', { name: en['home.dashboard.progressHorizonFull'] });
    await user.click(fullBtn);
    expect(fullBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('mounts cleanly inside FamilyDashboard in Bangla', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    const family = buildSampleFamily();
    render(
      <MemoryRouter>
        <ThemeProvider>
          <I18nProvider>
            <FamilyDashboard profiles={family} />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(bn['home.dashboard.progressChartTitle'])).toBeTruthy();
    expect(screen.getByRole('button', { name: bn['home.dashboard.progressMetricCoverage'] })).toBeTruthy();
  });
});
