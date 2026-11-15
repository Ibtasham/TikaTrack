import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assessPasswordStrength,
  hashPassword,
  localChangePassword,
  localDeleteAccount,
  localGetSession,
  localSignIn,
  localSignOut,
  localSignUp,
  localUpdateProfile,
  localUserCount,
  MIN_PASSWORD_LENGTH,
  validateEmail,
} from '../lib/localAuth';

const USERS_KEY = 'tikatrack.local-users';
const SESSION_KEY = 'tikatrack.local-session';
const EMAIL = 'ayesha@example.com';
const PASSWORD = 'Str0ng-Pass!';

function storedUsers(): Array<Record<string, unknown>> {
  return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
}

/** Drop `crypto.subtle` to simulate an insecure origin (plain HTTP). */
function simulateInsecureContext(): void {
  const native = globalThis.crypto;
  vi.stubGlobal('crypto', {
    getRandomValues: native.getRandomValues.bind(native),
    randomUUID: native.randomUUID?.bind(native),
  });
  expect(typeof crypto.subtle).toBe('undefined');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('validateEmail', () => {
  it.each([
    ['ayesha@example.com', true],
    ['name+tag@example.com', true],
    ['a@b.co', true],
    ['  padded@example.com  ', true],
    ['no-at-sign', false],
    ['a@b', false],
    ['a b@example.com', false],
    ['', false],
    ['@example.com', false],
  ])('validates %s as %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});

describe('assessPasswordStrength', () => {
  it('requires at least 8 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it('scores an empty password as empty', () => {
    expect(assessPasswordStrength('')).toEqual({ score: 0, label: 'empty', hints: [] });
  });

  it('scores progressively stronger passwords', () => {
    expect(assessPasswordStrength('abcdefgh')).toMatchObject({
      score: 1,
      label: 'weak',
      hints: ['case', 'number', 'symbol'],
    });
    expect(assessPasswordStrength('Abcdefgh')).toMatchObject({ score: 2, label: 'fair' });
    expect(assessPasswordStrength('Abcdefg1')).toMatchObject({ score: 3, label: 'good' });
    expect(assessPasswordStrength('Abcdefg1!')).toMatchObject({
      score: 4,
      label: 'strong',
      hints: [],
    });
  });

  it('flags a too-short password even when it is complex', () => {
    expect(assessPasswordStrength('A1!')).toMatchObject({
      hints: expect.arrayContaining(['length']),
    });
  });
});

describe('hashPassword', () => {
  it('matches a reference SHA-256 of salt:password', async () => {
    const expected = createHash('sha256').update('deadbeef:hunter2', 'utf8').digest('hex');
    await expect(hashPassword('hunter2', 'deadbeef')).resolves.toBe(expected);
  });

  it('is deterministic and salt-sensitive', async () => {
    const a = await hashPassword(PASSWORD, 'salt-one');
    const b = await hashPassword(PASSWORD, 'salt-one');
    const c = await hashPassword(PASSWORD, 'salt-two');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('localSignUp', () => {
  it('rejects an invalid email without storing anything', async () => {
    const result = await localSignUp('not-an-email', PASSWORD, 'Ayesha');
    expect(result).toEqual({ user: null, error: 'invalid-email' });
    expect(localUserCount()).toBe(0);
  });

  it('rejects a password below the minimum length', async () => {
    const result = await localSignUp(EMAIL, 'short', 'Ayesha');
    expect(result).toEqual({ user: null, error: 'weak-password' });
    expect(localUserCount()).toBe(0);
  });

  it('creates an account, starts a session and never exposes secrets', async () => {
    const result = await localSignUp(EMAIL, PASSWORD, 'Ayesha Rahman');

    expect(result.error).toBeNull();
    expect(result.user).toMatchObject({ email: EMAIL, full_name: 'Ayesha Rahman' });
    expect(result.user?.id).toBeTruthy();
    // publicUser() must strip both secret fields.
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('passwordSalt');

    expect(localUserCount()).toBe(1);
    expect(localGetSession()?.email).toBe(EMAIL);

    const [stored] = storedUsers();
    expect(stored.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
  });

  it('normalises the email and derives a name when none is given', async () => {
    const result = await localSignUp('  Ayesha@Example.COM ', PASSWORD, '   ');
    expect(result.user?.email).toBe('ayesha@example.com');
    expect(result.user?.full_name).toBe('ayesha');
  });

  it('refuses a duplicate email', async () => {
    await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    const second = await localSignUp(EMAIL.toUpperCase(), PASSWORD, 'Someone Else');
    expect(second).toEqual({ user: null, error: 'email-taken' });
    expect(localUserCount()).toBe(1);
  });

  it('keeps accounts usable when SubtleCrypto is unavailable', async () => {
    // Regression: sign-up used to store a *random* hash when `crypto.subtle`
    // was missing, so the account could never be signed into again.
    simulateInsecureContext();

    const signUp = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    expect(signUp.error).toBeNull();

    const signIn = await localSignIn(EMAIL, PASSWORD);
    expect(signIn.error).toBeNull();
    expect(signIn.user?.email).toBe(EMAIL);

    await expect(localSignIn(EMAIL, 'wrong-password')).resolves.toMatchObject({
      error: 'invalid-credentials',
    });
  });
});

describe('localSignIn / localSignOut / sessions', () => {
  beforeEach(async () => {
    await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    localSignOut();
  });

  it('rejects an unknown email', async () => {
    await expect(localSignIn('nobody@example.com', PASSWORD)).resolves.toEqual({
      user: null,
      error: 'invalid-credentials',
    });
  });

  it('rejects a wrong password', async () => {
    await expect(localSignIn(EMAIL, 'wrong-password')).resolves.toEqual({
      user: null,
      error: 'invalid-credentials',
    });
    expect(localGetSession()).toBeNull();
  });

  it('accepts the right password and is case-insensitive about the email', async () => {
    const result = await localSignIn(EMAIL.toUpperCase(), PASSWORD);
    expect(result.error).toBeNull();
    expect(result.user?.email).toBe(EMAIL);
    expect(localGetSession()?.id).toBe(result.user?.id);
  });

  it('clears the session on sign-out', async () => {
    await localSignIn(EMAIL, PASSWORD);
    expect(localGetSession()).not.toBeNull();
    localSignOut();
    expect(localGetSession()).toBeNull();
  });

  it('expires the session after 30 days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    await localSignIn(EMAIL, PASSWORD);

    vi.setSystemTime(new Date('2026-03-30T12:00:00Z')); // 29 days
    expect(localGetSession()?.email).toBe(EMAIL);

    vi.setSystemTime(new Date('2026-04-01T12:00:00Z')); // 31 days
    expect(localGetSession()).toBeNull();
    // The stale session is removed, not just ignored.
    expect(JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')).toBeNull();
  });

  it('survives corrupt stored data', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(USERS_KEY, '{not json');
    expect(localUserCount()).toBe(0);
    expect(localGetSession()).toBeNull();
  });

  it('ignores stored entries that are not user objects', () => {
    localStorage.setItem(USERS_KEY, JSON.stringify([null, 42, { nope: true }]));
    expect(localUserCount()).toBe(0);
  });
});

describe('localUpdateProfile', () => {
  it('updates the allowed fields and bumps updated_at', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
    const { user } = await localSignUp(EMAIL, PASSWORD, 'Ayesha');

    vi.setSystemTime(new Date('2026-03-02T11:22:33Z'));
    const result = await localUpdateProfile(user!.id, {
      full_name: 'Ayesha R.',
      language_preference: 'bn',
    });

    expect(result.error).toBeNull();
    expect(result.user).toMatchObject({ full_name: 'Ayesha R.', language_preference: 'bn' });
    // The returned object stays free of secrets while the stored record keeps them.
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(storedUsers()[0].passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedUsers()[0].created_at).toBe('2026-03-01T10:00:00.000Z');
    expect(storedUsers()[0].updated_at).toBe('2026-03-02T11:22:33.000Z');
  });

  it('reports no-session for an unknown user id', async () => {
    await expect(localUpdateProfile('missing', { full_name: 'x' })).resolves.toEqual({
      user: null,
      error: 'no-session',
    });
  });
});

describe('localChangePassword', () => {
  it('requires the current password', async () => {
    const { user } = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    const result = await localChangePassword(user!.id, 'not-my-password', 'An0ther-Pass!');
    expect(result).toEqual({ user: null, error: 'invalid-credentials' });
    // The original password still works.
    await expect(localSignIn(EMAIL, PASSWORD)).resolves.toMatchObject({ error: null });
  });

  it('rejects a new password below the minimum length', async () => {
    const { user } = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    await expect(localChangePassword(user!.id, PASSWORD, 'short')).resolves.toEqual({
      user: null,
      error: 'weak-password',
    });
  });

  it('rotates the salt and swaps which password works', async () => {
    const { user } = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    const before = storedUsers()[0];

    const result = await localChangePassword(user!.id, PASSWORD, 'An0ther-Pass!');
    expect(result.error).toBeNull();

    const after = storedUsers()[0];
    expect(after.passwordSalt).not.toBe(before.passwordSalt);
    expect(after.passwordHash).not.toBe(before.passwordHash);

    await expect(localSignIn(EMAIL, 'An0ther-Pass!')).resolves.toMatchObject({ error: null });
    await expect(localSignIn(EMAIL, PASSWORD)).resolves.toMatchObject({
      error: 'invalid-credentials',
    });
  });

  it('reports no-session for an unknown user id', async () => {
    await expect(localChangePassword('missing', 'x', 'An0ther-Pass!')).resolves.toEqual({
      user: null,
      error: 'no-session',
    });
  });
});

describe('localDeleteAccount', () => {
  it('removes the account and ends the session', async () => {
    const { user } = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    expect(localUserCount()).toBe(1);

    await localDeleteAccount(user!.id);

    expect(localUserCount()).toBe(0);
    expect(localGetSession()).toBeNull();
    await expect(localSignIn(EMAIL, PASSWORD)).resolves.toMatchObject({
      error: 'invalid-credentials',
    });
  });

  it('leaves other accounts alone', async () => {
    const first = await localSignUp(EMAIL, PASSWORD, 'Ayesha');
    await localSignUp('rahim@example.com', PASSWORD, 'Rahim');

    await localDeleteAccount(first.user!.id);

    expect(localUserCount()).toBe(1);
    expect(storedUsers()[0].email).toBe('rahim@example.com');
  });
});
