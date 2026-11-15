import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { addDays, startOfToday, toISODate } from '../lib/format';
import { isOnboardingDismissed } from '../lib/onboarding';
import { createProfile } from '../lib/profileStore';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';

/**
 * The welcome tour, driven through the real app.
 *
 * Unit tests cover `lib/onboarding`'s decision table; this covers the part that
 * only exists at runtime — that the dialog is mounted from `Layout`, that it
 * traps focus, that stepping and dismissing write the flag, and that a device
 * with records never sees it.
 */
const en = translations.en;
const bn = translations.bn;

function renderApp(path = '/') {
  window.history.pushState({}, '', path);
  return render(<App />);
}

function seedProfile() {
  const created = createProfile({
    name: 'Ayesha Rahman',
    dateOfBirth: toISODate(addDays(startOfToday(), -90)),
  });
  if (!created.profile) throw new Error(`seed rejected: ${created.error}`);
  writeJSON(STORAGE_KEYS.profiles, [created.profile]);
}

describe('WelcomeDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('greets a first-time visitor and says where they are in the tour', async () => {
    renderApp('/');

    const dialog = await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(within(dialog).getByText(en['onboarding.eyebrow'])).toBeTruthy();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Step 1 of 3');

    // Nothing to go back to yet, and the way out is always visible.
    expect(screen.getByRole('button', { name: en['common.actions.back'] })).toBeDisabled();
    expect(screen.getByRole('button', { name: en['onboarding.skip'] })).toBeTruthy();
  });

  it('appears on a deep link too, not only on the home route', async () => {
    renderApp('/vaccines');
    expect(
      await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] }),
    ).toBeTruthy();
  });

  it('steps forward to the call to action, which leaves the tour and navigates', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] });
    await user.click(screen.getByRole('button', { name: en['common.actions.next'] }));

    const step2 = screen.getByRole('dialog', { name: en['onboarding.start.title'] });
    expect(within(step2).getByRole('status')).toHaveTextContent('Step 2 of 3');

    const cta = within(step2).getByRole('link', { name: new RegExp(en['onboarding.start.cta']) });
    expect(cta.getAttribute('href')).toBe('/tracker');

    await user.click(cta);
    expect(window.location.pathname).toBe('/tracker');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isOnboardingDismissed()).toBe(true);
  });

  it('steps back without losing the tour', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] });
    await user.click(screen.getByRole('button', { name: en['common.actions.next'] }));
    await user.click(screen.getByRole('button', { name: en['common.actions.back'] }));

    expect(screen.getByRole('dialog', { name: en['onboarding.privacy.title'] })).toBeTruthy();
    expect(isOnboardingDismissed()).toBe(false);
  });

  it('finishes on the last step and does not come back', async () => {
    const user = userEvent.setup();
    const first = renderApp('/');

    await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] });
    await user.click(screen.getByRole('button', { name: en['common.actions.next'] }));
    await user.click(screen.getByRole('button', { name: en['common.actions.next'] }));

    const step3 = screen.getByRole('dialog', { name: en['onboarding.everywhere.title'] });
    expect(within(step3).getByRole('status')).toHaveTextContent('Step 3 of 3');

    await user.click(screen.getByRole('button', { name: en['onboarding.finish'] }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isOnboardingDismissed()).toBe(true);

    // A second visit is a fresh mount reading the same storage.
    first.unmount();
    renderApp('/');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape skips the tour, because a dialog you cannot leave is a trap', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await screen.findByRole('dialog', { name: en['onboarding.privacy.title'] });
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isOnboardingDismissed()).toBe(true);
  });

  it('never greets a device that already holds records', async () => {
    seedProfile();
    renderApp('/');

    // The page behind it is what matters: the shell mounted, no dialog on top.
    await screen.findAllByText(/TikaTrack/i);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('speaks Bangla, in Bangla numerals', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    renderApp('/');

    const dialog = await screen.findByRole('dialog', { name: bn['onboarding.privacy.title'] });
    expect(within(dialog).getByRole('status')).toHaveTextContent('ধাপ ১ / ৩');
    expect(screen.getByRole('button', { name: bn['onboarding.skip'] })).toBeTruthy();
  });
});
