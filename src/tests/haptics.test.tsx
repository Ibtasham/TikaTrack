import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { DoseRecorder } from '../components/DoseRecorder';
import SmartTracker from '../components/SmartTracker';
import { ProfilesProvider } from '../contexts/ProfilesContext';
import { ToastProvider } from '../contexts/ToastContext';
import { I18nProvider } from '../i18n';
import {
  HAPTIC_PATTERNS,
  isHapticsEnabled,
  isHapticsSupported,
  setHapticsEnabled,
  triggerHaptic,
} from '../lib/haptics';
import { createProfile } from '../lib/profileStore';
import {
  DEFAULT_REMINDER_PREFERENCES,
  saveReminders,
  type Reminder,
} from '../lib/intelligentReminders';
import { STORAGE_KEYS } from '../lib/storage';
import RemindersPage from '../pages/RemindersPage';
import type { Profile } from '../types';

function installVibrateMock(impl: () => boolean = () => true) {
  const vibrate = vi.fn(impl);
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrate,
    configurable: true,
  });
  return vibrate;
}

function removeVibrateMock() {
  Object.defineProperty(navigator, 'vibrate', {
    value: undefined,
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  removeVibrateMock();
  vi.restoreAllMocks();
});

describe('Vibration API haptics utility', () => {
  it('detects support cleanly and triggers subtle patterns for toggles and completions', () => {
    removeVibrateMock();
    expect(isHapticsSupported()).toBe(false);
    expect(triggerHaptic('success')).toBe(false);

    const vibrate = installVibrateMock();
    expect(isHapticsSupported()).toBe(true);

    expect(triggerHaptic('toggle')).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.toggle);

    expect(triggerHaptic('success')).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.success);

    expect(triggerHaptic('remove')).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.remove);

    expect(triggerHaptic('milestone')).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.milestone);
  });

  it('respects user disable toggle and never throws if navigator.vibrate rejects', () => {
    const throwingVibrate = installVibrateMock(() => {
      throw new Error('Blocked');
    });
    expect(triggerHaptic('success')).toBe(false);
    expect(throwingVibrate).toHaveBeenCalledTimes(1);

    const okVibrate = installVibrateMock();
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(triggerHaptic('success')).toBe(false);
    expect(okVibrate).not.toHaveBeenCalled();

    setHapticsEnabled(true);
    expect(isHapticsEnabled()).toBe(true);
    expect(triggerHaptic('toggle')).toBe(true);
    expect(okVibrate).toHaveBeenCalledTimes(1);
  });
});

describe('Tactile feedback on vaccination status toggles & task completions', () => {
  it('triggers milestone vibration when recording a single-dose vaccine via DoseRecorder', async () => {
    const user = userEvent.setup();
    const vibrate = installVibrateMock();
    const created = createProfile({ name: 'Ayaan', dateOfBirth: '2026-01-01' });
    const profile = created.profile!;
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify([profile]));

    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <ProfilesProvider>
              <DoseRecorder profile={profile} defaultOpen />
            </ProfilesProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    await user.selectOptions(document.getElementById('dose-vaccine') as HTMLSelectElement, 'bcg');
    await user.selectOptions(document.getElementById('dose-number') as HTMLSelectElement, '1');
    await user.click(screen.getByRole('button', { name: 'Save dose' }));

    await waitFor(() => {
      expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.milestone);
    });
  });

  it('toggles a scheduled vaccination dose from Next EPI visit checklist with subtle haptic pulse', async () => {
    const user = userEvent.setup();
    const vibrate = installVibrateMock();
    const today = new Date().toISOString().slice(0, 10);
    const created = createProfile({ name: 'Baby Sara', dateOfBirth: today });
    const profiles: Profile[] = [created.profile!];
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));

    function Wrapper() {
      const setProfiles = () => undefined;
      return <SmartTracker profiles={profiles} setProfiles={setProfiles} />;
    }

    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <ProfilesProvider>
              <Wrapper />
            </ProfilesProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    const quickButtons = await screen.findAllByRole('button', { name: 'Mark given' });
    expect(quickButtons.length).toBeGreaterThan(0);

    await user.click(quickButtons[0]);

    await waitFor(() => {
      expect(vibrate).toHaveBeenCalled();
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || '[]') as Profile[];
    expect(stored[0].events?.length).toBeGreaterThan(0);
  });

  it('triggers haptics when completing a reminder task and toggles preference cleanly', async () => {
    const user = userEvent.setup();
    const vibrate = installVibrateMock();
    const dob = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const created = createProfile({ name: 'Nora', dateOfBirth: dob });
    const profile = created.profile!;
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify([profile]));

    const dueReminder: Reminder = {
      id: 'rem-haptic-1',
      profileId: profile.id,
      vaccineId: 'bcg',
      doseNumber: 1,
      scheduledDoseId: 'bcg-1',
      doseLabel: { en: 'BCG', bn: 'বিসিজি' },
      scheduledDate: dob,
      reminderDate: dob,
      reminderType: 'on-due',
      daysBefore: 0,
      sent: false,
      acknowledged: false,
    };
    saveReminders([dueReminder]);
    localStorage.setItem('tikatrack-reminder-preferences', JSON.stringify(DEFAULT_REMINDER_PREFERENCES));

    render(
      <MemoryRouter>
        <I18nProvider>
          <ToastProvider>
            <ProfilesProvider>
              <RemindersPage />
            </ProfilesProvider>
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>,
    );

    const dismissBtn = await screen.findByRole('button', { name: 'Dismiss' });
    await user.click(dismissBtn);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.toggle);

    // Disable tactile feedback preference and verify further saves stop vibrating
    const hapticsToggle = screen.getByRole('checkbox', { name: /Tactile vibration feedback/i });
    expect(hapticsToggle).toBeChecked();
    await user.click(hapticsToggle);
    expect(hapticsToggle).not.toBeChecked();

    vibrate.mockClear();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(vibrate).not.toHaveBeenCalled();
  });
});
