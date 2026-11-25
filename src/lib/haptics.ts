/**
 * Subtle Tactile Haptics (Vibration API)
 *
 * Uses `navigator.vibrate(...)` with progressive enhancement:
 * - No-ops cleanly on browsers without Vibration API support (desktop, iOS Safari, jsdom).
 * - Never throws if blocked prior to user activation.
 * - Respects an explicit user toggle persisted in localStorage.
 */

export type HapticFeedbackKind = 'toggle' | 'success' | 'remove' | 'milestone';

export const HAPTICS_ENABLED_STORAGE_KEY = 'tikatrack.haptics.enabled';

/**
 * Duration / pulse patterns in milliseconds — intentionally subtle and crisp.
 */
export const HAPTIC_PATTERNS: Record<HapticFeedbackKind, number | number[]> = {
  toggle: 12,
  success: [14, 40, 22],
  remove: 18,
  milestone: [16, 45, 16, 45, 28],
};

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function isHapticsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const raw = localStorage.getItem(HAPTICS_ENABLED_STORAGE_KEY);
    if (raw === 'false' || raw === '0') return false;
    return true;
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HAPTICS_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors in private mode
  }
}

export function triggerHaptic(kind: HapticFeedbackKind = 'toggle'): boolean {
  if (!isHapticsEnabled() || !isHapticsSupported()) return false;
  try {
    return Boolean(navigator.vibrate(HAPTIC_PATTERNS[kind]));
  } catch {
    return false;
  }
}
