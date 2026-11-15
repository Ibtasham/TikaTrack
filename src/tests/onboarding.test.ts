import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dismissOnboarding,
  isOnboardingDismissed,
  moveStep,
  ONBOARDING_STEPS,
  shouldShowOnboarding,
} from '../lib/onboarding';
import { clearAllTikaTrackData, STORAGE_KEYS } from '../lib/storage';

/**
 * The tour is shown once, to people who have not been here before. Both halves
 * of that sentence are load-bearing: showing it twice is annoying, and showing
 * it to someone who has just restored a backup tells them to do something they
 * have already done.
 */
describe('onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('greets a first-time visitor with no records', () => {
    expect(isOnboardingDismissed()).toBe(false);
    expect(shouldShowOnboarding(0)).toBe(true);
  });

  it('stays quiet once the tour has been finished or skipped', () => {
    expect(dismissOnboarding()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.onboardingDismissed)).toBe('dismissed');
    expect(isOnboardingDismissed()).toBe(true);
    expect(shouldShowOnboarding(0)).toBe(false);
  });

  it('stays quiet on a device that already holds records', () => {
    expect(shouldShowOnboarding(1)).toBe(false);
    expect(shouldShowOnboarding(4)).toBe(false);
  });

  it('comes back after "erase everything", because that user is starting over', () => {
    dismissOnboarding();
    expect(shouldShowOnboarding(0)).toBe(false);

    clearAllTikaTrackData();

    expect(isOnboardingDismissed()).toBe(false);
    expect(shouldShowOnboarding(0)).toBe(true);
  });

  it('ignores a corrupt flag rather than treating it as "seen"', () => {
    localStorage.setItem(STORAGE_KEYS.onboardingDismissed, 'true');
    expect(isOnboardingDismissed()).toBe(false);
    expect(shouldShowOnboarding(0)).toBe(true);
  });

  it('reports failure when storage is unavailable, and does not throw', () => {
    // Private browsing: the tour is hidden for the session and simply returns on
    // the next visit, which is the honest outcome.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(dismissOnboarding()).toBe(false);
    expect(isOnboardingDismissed()).toBe(false);
  });

  it('clamps stepping instead of wrapping around the tour', () => {
    const last = ONBOARDING_STEPS.length - 1;

    expect(moveStep(0, -1)).toBe(0);
    expect(moveStep(0, 1)).toBe(1);
    expect(moveStep(last, 1)).toBe(last);
    expect(moveStep(1, 5)).toBe(last);
    expect(moveStep(1, -5)).toBe(0);
  });

  it('treats a nonsense position as the first step', () => {
    expect(moveStep(Number.NaN, 1)).toBe(0);
    expect(moveStep(1, Number.NaN)).toBe(0);
    expect(moveStep(0.4, 0)).toBe(0);
    expect(moveStep(0.6, 0)).toBe(1);
  });

  it('tours in the order the UI renders: trust, then instruction, then offline', () => {
    expect(ONBOARDING_STEPS).toEqual(['privacy', 'start', 'everywhere']);
  });
});
