import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ChildGrowthChart } from '../components/ChildGrowthChart';
import { ProfilesProvider } from '../contexts/ProfilesContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { WHO_HEIGHT_FOR_AGE, WHO_MAX_MONTHS, WHO_WEIGHT_FOR_AGE } from '../data/whoGrowthStandards';
import { I18nProvider, translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { addDays, startOfToday, toISODate } from '../lib/format';
import {
  addGrowthMeasurement,
  buildExport,
  createProfile,
  mergeImport,
  normaliseProfile,
  recordDoseEvent,
  removeGrowthMeasurement,
} from '../lib/profileStore';
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage';
import {
  ageInMonths,
  assessMeasurement,
  buildGrowthChartSeries,
  buildGrowthMeasurement,
  interpolateWhoBand,
  mapVaccinesToMonths,
  nearbyVaccinesForDate,
  recommendedAgeWindow,
  whoReferenceCurve,
} from '../lib/whoGrowth';
import type { Profile } from '../types';

const en = translations.en;

describe('WHO Child Growth Standards tables & pure calculations', () => {
  it('maintains strictly increasing percentiles across 0–60 months for boys and girls', () => {
    for (const table of [WHO_WEIGHT_FOR_AGE, WHO_HEIGHT_FOR_AGE]) {
      for (const sex of ['male', 'female'] as const) {
        const points = table[sex];
        expect(points[0].month).toBe(0);
        expect(points[points.length - 1].month).toBe(WHO_MAX_MONTHS);

        for (let i = 0; i < points.length; i += 1) {
          const p = points[i];
          expect(p.p3).toBeLessThan(p.p15);
          expect(p.p15).toBeLessThan(p.p50);
          expect(p.p50).toBeLessThan(p.p85);
          expect(p.p85).toBeLessThan(p.p97);
          if (i > 0) {
            expect(p.month).toBeGreaterThan(points[i - 1].month);
            expect(p.p50).toBeGreaterThan(points[i - 1].p50);
          }
        }
      }
    }
  });

  it('computes midpoint WHO curve when gender is other or unspecified', () => {
    const neutral = whoReferenceCurve('other', 'weight');
    const boys = WHO_WEIGHT_FOR_AGE.male;
    const girls = WHO_WEIGHT_FOR_AGE.female;

    expect(neutral).toHaveLength(boys.length);
    for (let i = 0; i < neutral.length; i += 1) {
      const expectedP50 = Math.round(((boys[i].p50 + girls[i].p50) / 2) * 10) / 10;
      expect(neutral[i].p50).toBe(expectedP50);
    }
    expect(whoReferenceCurve(undefined, 'height')).toEqual(whoReferenceCurve('other', 'height'));
  });

  it('interpolates intermediate months and returns null outside 0–60 months', () => {
    const m7_5 = interpolateWhoBand('male', 'weight', 7.5);
    expect(m7_5).not.toBeNull();
    // 6m boy median is 7.9, 9m boy median is 8.9 -> midpoint 8.4
    expect(m7_5?.p50).toBe(8.4);

    expect(interpolateWhoBand('female', 'height', -1)).toBeNull();
    expect(interpolateWhoBand('female', 'height', 61)).toBeNull();
  });

  it('classifies measurements into all five WHO percentile bands accurately', () => {
    // Girl at 12 months weight: p3=7.1, p15=7.9, p50=8.9, p85=10.1, p97=11.3
    expect(assessMeasurement('female', 'weight', 12, 6.5)?.band).toBe('below-p3');
    expect(assessMeasurement('female', 'weight', 12, 7.5)?.band).toBe('p3-p15');
    expect(assessMeasurement('female', 'weight', 12, 8.9)?.band).toBe('p15-p85');
    expect(assessMeasurement('female', 'weight', 12, 8.9)?.approxPercentile).toBe(50);
    expect(assessMeasurement('female', 'weight', 12, 10.6)?.band).toBe('p85-p97');
    expect(assessMeasurement('female', 'weight', 12, 12.2)?.band).toBe('above-p97');
    expect(assessMeasurement('female', 'weight', 65, 18.0)).toBeNull();
  });

  it('computes age in months safely and rejects pre-birth dates', () => {
    expect(ageInMonths('2024-01-01', '2024-01-01')).toBe(0);
    const oneYear = ageInMonths('2024-01-01', '2025-01-01');
    expect(oneYear).not.toBeNull();
    expect(oneYear!).toBeGreaterThan(11.9);
    expect(oneYear!).toBeLessThan(12.2);
    expect(ageInMonths('2024-05-01', '2024-04-01')).toBeNull();
  });

  it('validates growth inputs strictly against birth date, future dates, and physiological bounds', () => {
    const dob = '2024-01-15';
    expect(buildGrowthMeasurement(dob, { date: '' }).error).toBe('missing-date');
    expect(buildGrowthMeasurement(dob, { date: 'not-a-date' }).error).toBe('invalid-date');
    expect(buildGrowthMeasurement(dob, { date: '2099-01-01', weightKg: 7 }).error).toBe(
      'future-date',
    );
    expect(buildGrowthMeasurement(dob, { date: '2024-01-01', weightKg: 3.2 }).error).toBe(
      'before-birth',
    );
    expect(buildGrowthMeasurement(dob, { date: '2024-03-01' }).error).toBe('missing-measurement');
    expect(buildGrowthMeasurement(dob, { date: '2024-03-01', weightKg: 0.1 }).error).toBe(
      'invalid-weight',
    );
    expect(buildGrowthMeasurement(dob, { date: '2024-03-01', heightCm: 300 }).error).toBe(
      'invalid-height',
    );

    const valid = buildGrowthMeasurement(dob, {
      date: '2024-03-01',
      weightKg: '5.125',
      heightCm: '57.38',
      notes: ' 6-week EPI visit ',
    });
    expect(valid.error).toBeUndefined();
    expect(valid.measurement?.weightKg).toBe(5.13);
    expect(valid.measurement?.heightCm).toBe(57.4);
    expect(valid.measurement?.notes).toBe('6-week EPI visit');
  });

  it('combines WHO bands, child measurements, and vaccination markers into a unified Recharts series', () => {
    const created = createProfile({
      name: 'Rafi Ahmed',
      dateOfBirth: '2024-01-01',
      relationship: 'child',
      gender: 'male',
    });
    expect(created.profile).toBeTruthy();

    let profiles = [created.profile!];
    const dose1 = recordDoseEvent(profiles, created.profile!.id, {
      vaccineId: 'bcg',
      date: '2024-01-08',
      doseNumber: 1,
    });
    profiles = dose1.profiles;

    const dose2 = recordDoseEvent(profiles, created.profile!.id, {
      vaccineId: 'pentavalent',
      date: '2024-02-15',
      doseNumber: 1,
    });
    profiles = dose2.profiles;

    const g1 = addGrowthMeasurement(profiles, created.profile!.id, {
      date: '2024-02-15',
      weightKg: 4.9,
      heightCm: 56.2,
      notes: 'Measured before Penta-1',
    });
    expect(g1.error).toBeUndefined();
    profiles = g1.profiles;

    const member = profiles[0];
    const markers = mapVaccinesToMonths(member, 24);
    expect(markers).toHaveLength(2);
    expect(markers[0].label.en).toBe('BCG');

    const nearby = nearbyVaccinesForDate(member, '2024-02-15', 14);
    expect(nearby.map((v) => v.vaccineId)).toContain('pentavalent');

    const seriesWithVaccines = buildGrowthChartSeries(member, 'weight', 24, true);
    const measuredPoint = seriesWithVaccines.find((pt) => pt.measurementId === g1.measurement!.id);
    expect(measuredPoint).toBeTruthy();
    expect(measuredPoint?.childValue).toBe(4.9);
    expect(measuredPoint?.rangeOuter).toEqual([measuredPoint?.p3, measuredPoint?.p97]);
    expect(measuredPoint?.rangeInner).toEqual([measuredPoint?.p15, measuredPoint?.p85]);
    expect(measuredPoint?.vaccines?.some((v) => v.vaccineId === 'pentavalent')).toBe(true);
    expect(measuredPoint?.vaccinePinValue).toBe(4.9);

    const seriesWithoutVaccines = buildGrowthChartSeries(member, 'weight', 24, false);
    expect(seriesWithoutVaccines.every((pt) => !pt.vaccines)).toBe(true);
  });

  it('picks a sensible recommended age window for infants and toddlers', () => {
    const baby = createProfile({
      name: 'Baby',
      dateOfBirth: toISODate(addDays(startOfToday(), -90)),
      relationship: 'child',
    }).profile!;
    expect(recommendedAgeWindow(baby)).toBe(12);

    const toddler = createProfile({
      name: 'Toddler',
      dateOfBirth: toISODate(addDays(startOfToday(), -500)),
      relationship: 'child',
    }).profile!;
    expect(recommendedAgeWindow(toddler)).toBe(24);
  });
});

describe('profileStore growth persistence, normalisation, and backup merge', () => {
  it('persists, normalises, exports, merges, and removes growth measurements cleanly', () => {
    const created = createProfile({
      name: 'Nadia Islam',
      dateOfBirth: '2024-06-01',
      relationship: 'child',
      gender: 'female',
    });
    const base = created.profile!;
    const added1 = addGrowthMeasurement([base], base.id, {
      id: 'g-1',
      date: '2024-07-01',
      weightKg: 4.1,
      heightCm: 53.2,
    });
    const added2 = addGrowthMeasurement(added1.profiles, base.id, {
      id: 'g-2',
      date: '2024-09-01',
      weightKg: 5.7,
    });
    expect(added2.profiles[0].growth).toHaveLength(2);

    // Normalisation retains valid growth records and drops corrupt entries.
    const normalised = normaliseProfile({
      ...added2.profiles[0],
      growth: [
        ...(added2.profiles[0].growth ?? []),
        { id: 'bad-1', date: '2024-10-01', weightKg: 999 },
        { id: 'bad-2', date: 'invalid' },
      ],
    });
    expect(normalised?.growth).toHaveLength(2);

    // Export -> mergeImport preserves and deduplicates growth measurements alongside incoming ones.
    const incomingProfile: Profile = {
      ...added1.profiles[0],
      growth: [
        added1.profiles[0].growth![0],
        {
          id: 'g-3',
          date: '2024-12-01',
          weightKg: 7.4,
          heightCm: 66.0,
          createdAt: '2024-12-01T08:00:00.000Z',
        },
      ],
    };
    const exportedJson = JSON.stringify(buildExport([incomingProfile]));
    const merged = mergeImport(added2.profiles, exportedJson);
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.profiles[0].growth?.map((g) => g.id)).toEqual(['g-1', 'g-2', 'g-3']);
    }

    const afterRemove = removeGrowthMeasurement(added2.profiles, base.id, 'g-1');
    expect(afterRemove[0].growth?.map((g) => g.id)).toEqual(['g-2']);
  });
});

describe('ChildGrowthChart UI component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  function renderChartForChild(): Profile {
    const dob = toISODate(addDays(startOfToday(), -180));
    const created = createProfile({
      name: 'Zara Khan',
      dateOfBirth: dob,
      relationship: 'child',
      gender: 'female',
    });
    const seeded = recordDoseEvent([created.profile!], created.profile!.id, {
      vaccineId: 'bcg',
      date: toISODate(addDays(startOfToday(), -170)),
      doseNumber: 1,
    });
    writeJSON(STORAGE_KEYS.profiles, seeded.profiles);

    render(
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <ProfilesProvider>
              <ChildGrowthChart />
            </ProfilesProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>,
    );

    return seeded.profiles[0];
  }

  it('logs a new growth measurement, renders summary KPIs and history row, and deletes behind confirmation', async () => {
    const user = userEvent.setup();
    const profile = renderChartForChild();

    expect(screen.getByText(en['growth.title'])).toBeTruthy();
    expect(screen.getByText(en['growth.empty.title'])).toBeTruthy();

    await user.click(screen.getByRole('button', { name: en['growth.log.firstButton'] }));

    const today = toISODate(startOfToday());
    fireEvent.change(document.getElementById('growth-date') as HTMLInputElement, {
      target: { value: today },
    });
    await user.type(document.getElementById('growth-weight') as HTMLInputElement, '7.4');
    await user.type(document.getElementById('growth-height') as HTMLInputElement, '65.8');
    await user.type(document.getElementById('growth-notes') as HTMLInputElement, '6m EPI checkup');
    await user.click(screen.getByRole('button', { name: en['growth.log.save'] }));

    await waitFor(() => expect(screen.getByText(en['growth.history.title'])).toBeTruthy());
    expect(profile.name).toBe('Zara Khan');
    expect(screen.queryByText(en['growth.empty.title'])).toBeNull();
    expect(screen.getAllByText(/7\.4/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/65\.8/).length).toBeGreaterThan(0);
    expect(screen.getByText('6m EPI checkup')).toBeTruthy();

    // Switch metric to Height / Length and verify chart controls respond cleanly.
    const heightTab = screen.getByRole('button', { name: en['growth.metric.height'] });
    await user.click(heightTab);
    expect(heightTab.getAttribute('aria-pressed')).toBe('true');

    // Verify localStorage persisted the measurement.
    const persisted = readJSON<Profile[]>(STORAGE_KEYS.profiles, []);
    expect(persisted[0].growth).toHaveLength(1);
    expect(persisted[0].growth?.[0]).toMatchObject({
      date: today,
      weightKg: 7.4,
      heightCm: 65.8,
      notes: '6m EPI checkup',
    });

    // Delete measurement via ConfirmDialog.
    const removeBtn = screen.getByRole('button', {
      name: new RegExp(`^${en['growth.history.remove']}`),
    });
    await user.click(removeBtn);

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: en['confirm.delete'] }));

    await waitFor(() => expect(screen.getByText(en['growth.empty.title'])).toBeTruthy());
    expect(readJSON<Profile[]>(STORAGE_KEYS.profiles, [])[0].growth).toHaveLength(0);
  });
});
