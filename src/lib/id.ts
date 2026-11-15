/**
 * Identifier generation.
 *
 * Uses `crypto.randomUUID()` where available and falls back to a
 * time+random composite so IDs stay unique in older browsers and in jsdom.
 */

let counter = 0;

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/** A collision-resistant id, e.g. `p-3f9c1a2b-…`. */
export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${randomHex(8)}`;
}

export const createProfileId = () => createId('profile');
export const createMessageId = () => createId('msg');
export const createPassportId = () => createId('passport');

/** Short human-friendly code, e.g. `TT-4F7K-9Q2M`. */
export function createShortCode(groups = 3, groupLength = 4): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  const bytes = new Uint8Array(groups * groupLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  const parts: string[] = [];
  for (let g = 0; g < groups; g += 1) {
    parts.push(chars.slice(g * groupLength, (g + 1) * groupLength).join(''));
  }
  return ['TT', ...parts].join('-');
}
