/**
 * Offline-first authentication.
 *
 * TikaTrack works with zero configuration: when `VITE_SUPABASE_URL` is absent
 * the app uses this local implementation, which keeps accounts on the device.
 * When Supabase *is* configured, `AuthContext` transparently switches to the
 * cloud adapter instead — the rest of the app never knows the difference.
 *
 * Passwords are never stored. They are salted and hashed with SHA-256 — Web
 * Crypto where available, the portable implementation in `lib/sha256` when it is
 * not (SubtleCrypto is missing outside a secure context, e.g. plain HTTP on a
 * clinic LAN). The digest only ever leaves the browser if the user turns on
 * Supabase sync themselves.
 */

import { createId } from './id';
import { sha256HexAsync, toHex } from './sha256';
import { readJSON, STORAGE_PREFIX, writeJSON } from './storage';
import type { UserProfile } from '../types/auth';

const USERS_KEY = `${STORAGE_PREFIX}local-users`;
const SESSION_KEY = `${STORAGE_PREFIX}local-session`;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface StoredLocalUser extends UserProfile {
  passwordSalt: string;
  passwordHash: string;
}

export type LocalAuthErrorCode =
  | 'invalid-email'
  | 'weak-password'
  | 'email-taken'
  | 'invalid-credentials'
  | 'no-session'
  | 'unsupported';

export interface LocalAuthResult {
  user: UserProfile | null;
  error: LocalAuthErrorCode | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

/** Constant-time-ish comparison to avoid trivial timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function loadUsers(): StoredLocalUser[] {
  return readJSON<StoredLocalUser[]>(USERS_KEY, []).filter(
    (user) => user && typeof user.email === 'string',
  );
}

function saveUsers(users: StoredLocalUser[]): void {
  writeJSON(USERS_KEY, users);
}

/** Strip secrets before handing a user object to the UI. */
export function publicUser(user: StoredLocalUser): UserProfile {
  const { passwordHash: _hash, passwordSalt: _salt, ...rest } = user;
  return rest;
}

/**
 * Salted SHA-256 digest of a password.
 *
 * Always resolves to a real digest: when SubtleCrypto is unavailable the
 * portable implementation is used, so an account created on an insecure origin
 * can still be signed into. (The old `null` return silently stored a random
 * hash instead, which made sign-in permanently impossible.)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256HexAsync(`${salt}:${password}`);
}

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
  hints: string[];
}

/** Lightweight password meter used by the sign-up form. */
export function assessPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'empty', hints: [] };
  const hints: string[] = [];
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  else hints.push('length');
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else hints.push('case');
  if (/\d/.test(password)) score += 1;
  else hints.push('number');
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else hints.push('symbol');

  const labels: PasswordStrength['label'][] = ['empty', 'weak', 'fair', 'good', 'strong'];
  return { score: score as PasswordStrength['score'], label: labels[score], hints };
}

export async function localSignUp(
  email: string,
  password: string,
  fullName: string,
): Promise<LocalAuthResult> {
  const normalised = email.trim().toLowerCase();
  if (!validateEmail(normalised)) return { user: null, error: 'invalid-email' };
  if (password.length < MIN_PASSWORD_LENGTH) return { user: null, error: 'weak-password' };

  const users = loadUsers();
  if (users.some((user) => user.email === normalised)) {
    return { user: null, error: 'email-taken' };
  }

  const salt = toHex(randomBytes(16));
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  const stored: StoredLocalUser = {
    id: createId('user'),
    email: normalised,
    full_name: fullName.trim() || normalised.split('@')[0],
    language_preference: 'en',
    email_verified: false,
    created_at: now,
    updated_at: now,
    passwordSalt: salt,
    passwordHash,
  };

  users.push(stored);
  saveUsers(users);
  writeSession(stored.id);
  return { user: publicUser(stored), error: null };
}

export async function localSignIn(email: string, password: string): Promise<LocalAuthResult> {
  const normalised = email.trim().toLowerCase();
  const users = loadUsers();
  const match = users.find((user) => user.email === normalised);
  if (!match) return { user: null, error: 'invalid-credentials' };

  const digest = await hashPassword(password, match.passwordSalt);
  if (!safeEqual(digest, match.passwordHash)) {
    return { user: null, error: 'invalid-credentials' };
  }

  writeSession(match.id);
  return { user: publicUser(match), error: null };
}

interface StoredSession {
  userId: string;
  expiresAt: number;
}

function writeSession(userId: string): void {
  writeJSON(SESSION_KEY, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  } satisfies StoredSession);
}

export function localSignOut(): void {
  writeJSON(SESSION_KEY, null);
}

export function localGetSession(): UserProfile | null {
  const session = readJSON<StoredSession | null>(SESSION_KEY, null);
  if (!session || !session.userId) return null;
  if (session.expiresAt < Date.now()) {
    localSignOut();
    return null;
  }
  const user = loadUsers().find((candidate) => candidate.id === session.userId);
  return user ? publicUser(user) : null;
}

export async function localUpdateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'language_preference' | 'phone' | 'avatar_url'>>,
): Promise<LocalAuthResult> {
  const users = loadUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return { user: null, error: 'no-session' };

  users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
  saveUsers(users);
  return { user: publicUser(users[index]), error: null };
}

export async function localChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<LocalAuthResult> {
  const users = loadUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return { user: null, error: 'no-session' };
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { user: null, error: 'weak-password' };

  const existing = users[index];
  const digest = await hashPassword(currentPassword, existing.passwordSalt);
  if (!safeEqual(digest, existing.passwordHash)) {
    return { user: null, error: 'invalid-credentials' };
  }

  const salt = toHex(randomBytes(16));
  const passwordHash = await hashPassword(newPassword, salt);
  users[index] = {
    ...existing,
    passwordSalt: salt,
    passwordHash,
    updated_at: new Date().toISOString(),
  };
  saveUsers(users);
  return { user: publicUser(users[index]), error: null };
}

/** Number of locally registered accounts — surfaced on the Privacy page. */
export function localUserCount(): number {
  return loadUsers().length;
}

export async function localDeleteAccount(userId: string): Promise<void> {
  saveUsers(loadUsers().filter((user) => user.id !== userId));
  localSignOut();
}
