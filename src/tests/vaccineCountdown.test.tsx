import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VaccineCountdown } from '../components/VaccineCountdown';
import { ThemeProvider } from '../contexts/ThemeContext';
import { schedule } from '../data/vaccines';
import { I18nProvider, translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { addDays, toISODate } from '../lib/format';
import { createProfile, recordDose } from '../lib/profileStore';
import { buildVaccineCountdownState, selectPrimaryProfile } from '../lib/vaccineCountdown';
import type { Profile } from '../types';

const en = translations.en;
const bn = translations.bn;

function renderCountdown(profiles: Profile[]) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <I18nProvider>
          <VaccineCountdown profiles={profiles} />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('VaccineCountdown logic & component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects the relationship=self profile as primary, falling back to first profile', () => {
    expect(selectPrimaryProfile([])).toBeNull();

    const child = createProfile({
      name: 'Child One',
      dateOfBirth: '2025-06-01',
      relationship: 'child',
      gender: 'female',
    }).profile!;
    const self = createProfile({
      name: 'Self User',
      dateOfBirth: '1995-03-10',
      relationship: 'self',
      gender: 'male',
    }).profile!;

    expect(selectPrimaryProfile([child])?.id).toBe(child.id);
    expect(selectPrimaryProfile([child, self])?.id).toBe(self.id);
  });

  it('computes accurate live countdown for the next upcoming vaccine dose and ticks every second', () => {
    vi.useFakeTimers();
    const fixedNow = new Date(2026, 10, 25, 8, 30, 15); // 2026-11-25 08:30:15 local
    vi.setSystemTime(fixedNow);

    // Newborn born 2026-11-25 with birth doses recorded -> next milestone is 6 weeks (+42d = 2027-01-06)
    const dob = '2026-11-25';
    const child = createProfile({
      name: 'Zara Rahman',
      dateOfBirth: dob,
      relationship: 'child',
      gender: 'female',
    }).profile!;
    let list = recordDose([child], child.id, 'bcg', { date: dob, doseNumber: 1 });
    list = recordDose(list, child.id, 'opv', { date: dob, doseNumber: 1 });

    // Also include a sibling later in list to verify primary selection
    const selfUser = createProfile({
      name: 'Amina Rahman',
      dateOfBirth: dob,
      relationship: 'self',
      gender: 'female',
    }).profile!;
    let selfList = recordDose([selfUser], selfUser.id, 'bcg', { date: dob, doseNumber: 1 });
    selfList = recordDose(selfList, selfUser.id, 'opv', { date: dob, doseNumber: 1 });

    const state = buildVaccineCountdownState([...list, ...selfList], {
      now: fixedNow,
      asOfDate: '2026-11-25',
    });

    expect(state).not.toBeNull();
    expect(state?.profile.id).toBe(selfUser.id);
    expect(state?.isSelfDesignated).toBe(true);
    expect(state?.mode).toBe('upcoming');
    expect(state?.targetDose?.scheduledDate).toBe('2027-01-06');
    // 2026-11-25 08:30:15 -> 2027-01-06 09:00:00 = 42 days, 0 hours, 29 minutes, 45 seconds
    expect(state?.countdown.days).toBe(42);
    expect(state?.countdown.hours).toBe(0);
    expect(state?.countdown.minutes).toBe(29);
    expect(state?.countdown.seconds).toBe(45);
    expect(state?.sameDayDoses.length).toBeGreaterThanOrEqual(2);

    renderCountdown(list);

    expect(screen.getByTestId('vaccine-countdown')).toBeInTheDocument();
    expect(screen.getByText('Zara Rahman')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-days').textContent).toBe('42');
    expect(screen.getByTestId('countdown-hours').textContent).toBe('00');
    expect(screen.getByTestId('countdown-minutes').textContent).toBe('29');
    expect(screen.getByTestId('countdown-seconds').textContent).toBe('45');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('countdown-seconds').textContent).toBe('44');

    const recordLink = screen.getByRole('link', { name: en['home.dashboard.countdownRecordAction'] });
    expect(recordLink.getAttribute('href')).toContain('&action=record');
  });

  it('shows due-today state when the primary profile has an unrecorded dose due today', () => {
    const fixedNow = new Date(2026, 10, 25, 10, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const today = toISODate(fixedNow);
    const newborn = createProfile({
      name: 'Nora Islam',
      dateOfBirth: today,
      relationship: 'self',
      gender: 'female',
    }).profile!;

    renderCountdown([newborn]);

    expect(screen.getByText(en['home.dashboard.countdownDueTodayLabel'])).toBeInTheDocument();
    expect(screen.getByTestId('countdown-days').textContent).toBe('00');
    expect(screen.getByTestId('countdown-hours').textContent).toBe('00');
  });

  it('shows overdue-only review prompt when all scheduled doses are past due', () => {
    const adult = createProfile({
      name: 'Tariq Hasan',
      dateOfBirth: '1992-04-12',
      relationship: 'self',
      gender: 'male',
    }).profile!;

    renderCountdown([adult]);

    expect(
      screen.getByRole('link', { name: en['home.dashboard.reviewButton'] }).getAttribute('href'),
    ).toContain('view=catchup');
    expect(screen.queryByTestId('countdown-days')).toBeNull();
  });

  it('shows completion state when all scheduled EPI milestones are recorded and localizes into Bangla', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    const dob = toISODate(addDays(new Date(2005, 0, 1), 0));
    let profile = createProfile({
      name: 'মাহিমা আক্তার',
      dateOfBirth: dob,
      relationship: 'self',
      gender: 'female',
    }).profile!;

    const doseCounts: Record<string, number> = {};
    let list: Profile[] = [profile];
    for (const milestone of schedule) {
      const visitDate = toISODate(addDays(new Date(2005, 0, 1), milestone.ageDays));
      for (const v of milestone.vaccines) {
        const nextDoseNum = (doseCounts[v.id] ?? 0) + 1;
        doseCounts[v.id] = nextDoseNum;
        list = recordDose(list, profile.id, v.id, {
          date: visitDate,
          doseNumber: nextDoseNum,
        });
      }
    }
    profile = list[0];

    renderCountdown([profile]);

    expect(screen.getByText(bn['home.dashboard.countdownTitle'])).toBeInTheDocument();
    expect(screen.getByText(bn['home.dashboard.countdownCompleteTitle'])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: bn['home.dashboard.action.passport'] })).toBeInTheDocument();
  });
});
