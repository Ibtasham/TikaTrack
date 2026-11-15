import { readString, STORAGE_KEYS, writeString } from './storage';

/**
 * The welcome tour, in order.
 *
 * Three steps is a ceiling, not a target — a first-run carousel is the most
 * skipped UI there is, so each step has to answer a question a new user actually
 * has:
 *
 *   1. `privacy`    — "is my child's health data safe here?"
 *   2. `start`      — "what do I do first?"
 *   3. `everywhere` — "what happens when there is no signal at the clinic?"
 *
 * The order matters: trust before instruction. Asking someone to enter their
 * child's date of birth before telling them where it goes would be backwards.
 */
export const ONBOARDING_STEPS = ['privacy', 'start', 'everywhere'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Storage value. A string, not `true`, so a corrupt write cannot read as seen. */
const DISMISSED = 'dismissed';

/** `true` once the tour has been finished or skipped in this browser. */
export function isOnboardingDismissed(): boolean {
  return readString(STORAGE_KEYS.onboardingDismissed, '') === DISMISSED;
}

/**
 * Record that the tour was seen.
 *
 * Returns `false` when storage is unavailable (private browsing, a full quota).
 * The caller hides the tour for the session either way — showing it again on
 * every navigation would be worse than showing it again on the next visit.
 */
export function dismissOnboarding(): boolean {
  return writeString(STORAGE_KEYS.onboardingDismissed, DISMISSED);
}

/**
 * Whether to greet this visitor.
 *
 * Suppressed when the device already holds family records: a "start by adding a
 * member" tour is noise to someone who has just restored a backup or imported a
 * JSON file, and records are better evidence of a returning user than the flag.
 * The flag alone is not enough either, because "erase everything" on the Privacy
 * page clears it — correctly, since that user really is starting over.
 */
export function shouldShowOnboarding(
  profileCount: number,
  dismissed: boolean = isOnboardingDismissed(),
): boolean {
  if (dismissed) return false;
  return profileCount === 0;
}

/**
 * Step index after moving `delta` places, clamped to the tour.
 *
 * Clamping (rather than wrapping) is deliberate: a "Back" that loops to the last
 * step and a "Next" that loops to the first both feel like the UI lost track of
 * where it is.
 */
export function moveStep(index: number, delta: number): number {
  const last = ONBOARDING_STEPS.length - 1;
  if (!Number.isFinite(index) || !Number.isFinite(delta)) return 0;
  return Math.min(last, Math.max(0, Math.round(index + delta)));
}
