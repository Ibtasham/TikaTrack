import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { issuePassport, upsertPassport } from '../lib/digitalPassport';
import { addDays, startOfToday, toISODate } from '../lib/format';
import {
  DEFAULT_REMINDER_PREFERENCES,
  generateReminders,
  saveReminderPreferences,
  saveReminders,
} from '../lib/intelligentReminders';
import { createProfile, recordDose } from '../lib/profileStore';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';
import type { Profile } from '../types';

/**
 * Whole-app smoke test, second pass: a *populated* device.
 *
 * `smoke.test.tsx` renders every route against empty storage, which is the
 * first-run experience. This file renders the same routes with a member, a
 * recorded dose, derived reminders and an issued passport already on the device
 * — the state in which the calendar export, sharing, the printable card, the QR
 * scanner and the record-aware assistant exist at all. Those are the features
 * most likely to throw only at runtime (context lookups, optional fields,
 * schedule arithmetic over real data) and least likely to be caught by a unit
 * test of the pure logic underneath them.
 */
const ERROR_MARKER = 'TikaTrack hit an unexpected error';
const en = translations.en;

/** ~4 months old: several doses recorded or due, several still ahead. */
const DOB = toISODate(addDays(startOfToday(), -120));
const MEMBER = 'Ayesha Rahman';

function seedFamily(): Profile[] {
  const created = createProfile({
    name: MEMBER,
    dateOfBirth: DOB,
    relationship: 'child',
    gender: 'female',
  });
  if (!created.profile) throw new Error(`seed profile rejected: ${created.error}`);

  const profiles = recordDose([created.profile], created.profile.id, 'bcg', {
    date: toISODate(addDays(startOfToday(), -100)),
    centre: 'Dhaka Medical College Hospital',
    doseNumber: 1,
  });
  writeJSON(STORAGE_KEYS.profiles, profiles);

  // Reminders are derived, never typed in: generate them the way the app does.
  saveReminderPreferences(DEFAULT_REMINDER_PREFERENCES);
  saveReminders(
    generateReminders(
      created.profile.id,
      DOB,
      profiles[0].records ?? {},
      DEFAULT_REMINDER_PREFERENCES,
    ),
  );

  return profiles;
}

async function seedPassport(profiles: Profile[]): Promise<void> {
  const result = await issuePassport({ profile: profiles[0] });
  if (!result.passport) throw new Error(`seed passport failed: ${result.error}`);

  const { passport } = result;
  upsertPassport({
    id: passport.id,
    profileId: passport.profileId,
    memberName: passport.memberName,
    dateOfBirth: passport.dateOfBirth,
    issuedAt: passport.issuedAt,
    payload: passport.payload,
    algorithm: passport.algorithm,
  });
}

function renderAt(path: string) {
  // BrowserRouter reads window.location on mount, so set it first.
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('app smoke test with a populated device', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    await seedPassport(seedFamily());
  });

  it('/tracker offers the per-member actions and the family calendar export', async () => {
    renderAt('/tracker');

    await waitFor(() => expect(screen.getAllByText(MEMBER).length).toBeGreaterThan(0));
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();

    // MemberActions, rendered under the stats for the selected member.
    expect(screen.getByRole('button', { name: en['common.actions.calendar'] })).toBeTruthy();
    expect(screen.getByRole('button', { name: en['common.actions.share'] })).toBeTruthy();
    expect(screen.getByRole('button', { name: en['tracker.card.button'] })).toBeTruthy();

    // The family-wide export lives in the page toolbar, not in the component.
    const family = screen.getByRole('button', { name: en['tracker.calendar.family'] });
    expect(family.hasAttribute('disabled')).toBe(false);
  });

  it('/reminders can export the list it is showing', async () => {
    renderAt('/reminders');

    // Lazy route: wait for Suspense to resolve, then assert the export is live.
    const button = await screen.findByRole(
      'button',
      { name: en['reminders.calendar.button'] },
      { timeout: 5000 },
    );
    // Enabled means the derived reminder list is non-empty — the export button
    // is the only control on the page that depends on that.
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });

  it('/tikabot adds the saved record to an answer about timing', async () => {
    const user = userEvent.setup();
    renderAt('/tikabot');

    const selector = await screen.findByLabelText(en['tikabot.context.about']);
    await user.selectOptions(selector, screen.getByRole('option', { name: MEMBER }));

    await user.type(
      screen.getByLabelText(en['tikabot.inputPlaceholder']),
      'When is my child due for the next dose?',
    );
    await user.click(screen.getByRole('button', { name: en['tikabot.send'] }));

    // The bot "types" for 320 ms before answering; wait for the answer, then for
    // the record panel that must accompany it.
    expect(
      await screen.findByText(en['tikabot.context.title'], undefined, { timeout: 4000 }),
    ).toBeTruthy();
    expect(screen.getByText(en['tikabot.context.source'])).toBeTruthy();
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();

    // The member's own data, not the corpus: the name appears in the block's
    // heading line, which is derived from the DOB rather than quoted from a doc.
    expect(screen.getAllByText(new RegExp(MEMBER)).length).toBeGreaterThan(0);
  });

  it('/tikabot leaves a general answer alone when no member is selected', async () => {
    const user = userEvent.setup();
    renderAt('/tikabot');

    // Default is "General questions"; ask something the corpus does cover.
    await screen.findByLabelText(en['tikabot.context.about']);
    await user.type(screen.getByLabelText(en['tikabot.inputPlaceholder']), 'What is BCG?');
    await user.click(screen.getByRole('button', { name: en['tikabot.send'] }));

    await waitFor(() => expect(screen.queryByText(en['tikabot.thinking'])).toBeNull(), {
      timeout: 4000,
    });
    expect(screen.queryByText(en['tikabot.context.title'])).toBeNull();
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });

  it('/passport shows the issued certificate, the share action and the scanner', async () => {
    renderAt('/passport');

    const share = await screen.findByRole(
      'button',
      { name: en['passport.share.button'] },
      { timeout: 5000 },
    );
    expect(share).toBeTruthy();
    expect(screen.getAllByText(MEMBER).length).toBeGreaterThan(0);

    // The scanner renders even without a camera: the photo-upload path is the one
    // that works for a printed card, and jsdom has no getUserMedia at all.
    expect(screen.getByText(en['passport.scanner.title'])).toBeTruthy();
    expect(screen.getByText(en['passport.scanner.upload'])).toBeTruthy();
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });

  it('/analytics and /privacy still render with real data on the device', async () => {
    renderAt('/analytics');
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull(), { timeout: 5000 });
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();

    renderAt('/privacy');
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull(), { timeout: 5000 });
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
    // The offline-copy section reports storage rather than promising a number.
    expect(screen.getByText(en['privacy.offline.title'])).toBeTruthy();
  });
});
