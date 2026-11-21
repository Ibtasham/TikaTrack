export const OPEN_COMMAND_PALETTE_EVENT = 'tikatrack:open-command-palette';

/** Open the global bilingual Command Palette from anywhere in the app. */
export function openCommandPalette(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}
