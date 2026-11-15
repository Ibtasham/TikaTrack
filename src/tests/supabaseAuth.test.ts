import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as cloud from '../lib/auth/supabaseAuth';
import { getSupabase } from '../lib/supabase';

// The adapter talks to Supabase through `getSupabase()`; mocking that module
// keeps these tests offline and lets us script the responses.
vi.mock('../lib/supabase', () => ({ getSupabase: vi.fn() }));

const mockGetSupabase = vi.mocked(getSupabase);

type Result = { data?: unknown; error?: { message: string } | null };
interface Call {
  table: string;
  ops: string[];
  args: unknown[];
}

/**
 * A chainable, thenable stand-in for the Supabase query builder. Results are
 * queued per table and consumed in order, so a test can script "the first
 * select returns X, the insert fails with Y".
 */
function createHarness(queues: Record<string, Result[]> = {}) {
  const calls: Call[] = [];

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from(table: string) {
      const call: Call = { table, ops: [], args: [] };
      calls.push(call);
      const queue = queues[table] ?? [];

      const builder: Record<string, unknown> = {
        then(onFulfilled?: (value: Result) => unknown, onRejected?: (reason: unknown) => unknown) {
          const value = queue.length > 0 ? (queue.shift() as Result) : { data: null, error: null };
          return Promise.resolve(value).then(onFulfilled, onRejected);
        },
      };
      for (const op of [
        'select',
        'eq',
        'insert',
        'update',
        'upsert',
        'delete',
        'single',
        'maybeSingle',
        'order',
      ]) {
        builder[op] = (...args: unknown[]) => {
          call.ops.push(op);
          call.args.push(...args);
          return builder;
        };
      }
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, auth: client.auth, calls };
}

const PROFILE = {
  id: 'user-1',
  email: 'ayesha@example.com',
  full_name: 'Ayesha Rahman',
  language_preference: 'en' as const,
  email_verified: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const SESSION_USER = {
  id: 'user-1',
  email: 'ayesha@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('local-only mode (no Supabase client)', () => {
  beforeEach(() => {
    mockGetSupabase.mockResolvedValue(null);
  });

  it('returns no session', async () => {
    await expect(cloud.supabaseGetSession()).resolves.toBeNull();
  });

  it('reports "unconfigured" from the account operations', async () => {
    const expected = { user: null, error: { code: 'unconfigured', message: 'Supabase is off' } };
    await expect(cloud.supabaseSignUp('a@b.com', 'password1', 'A')).resolves.toEqual(expected);
    await expect(cloud.supabaseSignIn('a@b.com', 'password1')).resolves.toEqual(expected);
    await expect(cloud.supabaseUpdateProfile('user-1', { full_name: 'x' })).resolves.toEqual(
      expected,
    );
    await expect(cloud.supabaseCreateFamily('Family', 'user-1')).resolves.toEqual({
      error: { code: 'unconfigured', message: 'Supabase is off' },
    });
  });

  it('reports a plain message from the family operations', async () => {
    const expected = {
      error: { code: 'error', message: 'Supabase is not configured' },
    };
    await expect(cloud.supabaseResetPassword('a@b.com')).resolves.toEqual(expected);
    await expect(cloud.supabaseUpdatePassword('password1')).resolves.toEqual(expected);
    await expect(cloud.supabaseInviteMember('f1', 'a@b.com', 'parent')).resolves.toEqual(expected);
    await expect(cloud.supabaseRemoveMember('m1')).resolves.toEqual(expected);
    await expect(cloud.supabaseUpdateMemberRole('m1', 'viewer')).resolves.toEqual(expected);
    await expect(cloud.supabaseTransferOwnership('f1', 'u1', 'u2')).resolves.toEqual(expected);
  });

  it('treats sign-out as a no-op success', async () => {
    await expect(cloud.supabaseSignOut()).resolves.toEqual({ error: null });
  });

  it('returns an empty family', async () => {
    await expect(cloud.supabaseLoadFamily('user-1')).resolves.toEqual({
      family: null,
      members: [],
    });
  });
});

describe('supabaseGetSession', () => {
  it('returns null when there is no session', async () => {
    const { client } = createHarness();
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseGetSession()).resolves.toBeNull();
  });

  it('loads the stored profile for the signed-in user', async () => {
    const { client, auth, calls } = createHarness({ user_profiles: [{ data: PROFILE }] });
    auth.getSession.mockResolvedValue({ data: { session: { user: SESSION_USER } } });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseGetSession()).resolves.toEqual(PROFILE);
    expect(calls[0]).toMatchObject({ table: 'user_profiles' });
    expect(calls[0].ops).toEqual(['select', 'eq', 'maybeSingle']);
    expect(calls[0].args).toContain('user-1');
  });

  it('synthesises a minimal profile when the row does not exist yet', async () => {
    const { client, auth } = createHarness({ user_profiles: [{ data: null }] });
    auth.getSession.mockResolvedValue({ data: { session: { user: SESSION_USER } } });
    mockGetSupabase.mockResolvedValue(client);

    const profile = await cloud.supabaseGetSession();
    expect(profile).toMatchObject({
      id: 'user-1',
      email: 'ayesha@example.com',
      full_name: 'ayesha', // derived from the email local-part
      language_preference: 'en',
      email_verified: false,
    });
    expect(profile?.created_at).toBeTruthy();
  });
});

describe('supabaseSignUp', () => {
  it('creates the profile row and returns the loaded user', async () => {
    // Two responses for user_profiles: the upsert, then loadProfile's select.
    const { client, auth, calls } = createHarness({
      user_profiles: [{ data: null }, { data: PROFILE }],
    });
    auth.signUp.mockResolvedValue({ data: { user: SESSION_USER }, error: null });
    mockGetSupabase.mockResolvedValue(client);

    const result = await cloud.supabaseSignUp(' Ayesha@Example.com ', 'password1', 'Ayesha Rahman');

    expect(result.error).toBeNull();
    expect(result.user).toEqual(PROFILE);
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: ' Ayesha@Example.com ', password: 'password1' }),
    );
    // The profile row is upserted with the normalised email.
    expect(calls[0].ops).toContain('upsert');
    expect(calls[0].args[0]).toMatchObject({
      id: 'user-1',
      email: 'ayesha@example.com',
      full_name: 'Ayesha Rahman',
      email_verified: true,
    });
  });

  it('asks Supabase to redirect back to the app, including the base path', async () => {
    const { client, auth } = createHarness();
    auth.signUp.mockResolvedValue({ data: { user: null }, error: null });
    mockGetSupabase.mockResolvedValue(client);

    await cloud.supabaseSignUp('a@b.com', 'password1', 'A');

    const call = auth.signUp.mock.calls[0][0] as {
      email: string;
      options: { emailRedirectTo: string };
    };
    // Regression: this used to hard-code `<origin>/auth`, which is wrong on a
    // sub-path deploy (GitHub Pages project sites).
    expect(call.options.emailRedirectTo).toBe(`${window.location.origin}/auth?mode=verify`);
    expect(call.email).toBe('a@b.com');
  });

  it('maps a sign-up failure to a typed error', async () => {
    const { client, auth } = createHarness();
    auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password should be at least 6 characters' },
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseSignUp('a@b.com', 'x', 'A')).resolves.toEqual({
      user: null,
      error: { code: 'signup', message: 'Password should be at least 6 characters' },
    });
  });
});

describe('supabaseSignIn', () => {
  it('returns the profile on success', async () => {
    const { client, auth } = createHarness({ user_profiles: [{ data: PROFILE }] });
    auth.signInWithPassword.mockResolvedValue({ data: { user: SESSION_USER }, error: null });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseSignIn('ayesha@example.com', 'password1')).resolves.toEqual({
      user: PROFILE,
      error: null,
    });
  });

  it('maps invalid credentials', async () => {
    const { client, auth } = createHarness();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseSignIn('ayesha@example.com', 'wrong')).resolves.toEqual({
      user: null,
      error: { code: 'signin', message: 'Invalid login credentials' },
    });
  });
});

describe('supabaseSignOut / password flows', () => {
  it('signs out', async () => {
    const { client, auth } = createHarness();
    mockGetSupabase.mockResolvedValue(client);
    await expect(cloud.supabaseSignOut()).resolves.toEqual({ error: null });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('surfaces a sign-out failure', async () => {
    const { client, auth } = createHarness();
    auth.signOut.mockResolvedValue({ error: { message: 'session expired' } });
    mockGetSupabase.mockResolvedValue(client);
    await expect(cloud.supabaseSignOut()).resolves.toEqual({
      error: { code: 'error', message: 'session expired' },
    });
  });

  it('sends a password-reset email to a base-aware redirect URL', async () => {
    const { client, auth } = createHarness();
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseResetPassword('ayesha@example.com')).resolves.toEqual({
      error: null,
    });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ayesha@example.com', {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
  });

  it('updates the password', async () => {
    const { client, auth } = createHarness();
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseUpdatePassword('new-password')).resolves.toEqual({ error: null });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
  });

  it('maps a password-update failure', async () => {
    const { client, auth } = createHarness();
    auth.updateUser.mockResolvedValue({ error: { message: 'too weak' } });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseUpdatePassword('x')).resolves.toEqual({
      error: { code: 'error', message: 'too weak' },
    });
  });
});

describe('supabaseUpdateProfile', () => {
  it('stamps updated_at and returns the refreshed row', async () => {
    const { client, calls } = createHarness({ user_profiles: [{}, { data: PROFILE }] });
    mockGetSupabase.mockResolvedValue(client);

    const result = await cloud.supabaseUpdateProfile('user-1', { full_name: 'Ayesha R.' });

    expect(result.error).toBeNull();
    expect(result.user).toEqual(PROFILE);
    expect(calls[0].ops).toEqual(['update', 'eq']);
    expect(calls[0].args[0]).toMatchObject({ full_name: 'Ayesha R.' });
    expect((calls[0].args[0] as { updated_at: string }).updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps an update failure', async () => {
    const { client } = createHarness({ user_profiles: [{ error: { message: 'row locked' } }] });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseUpdateProfile('user-1', { full_name: 'x' })).resolves.toEqual({
      user: null,
      error: { code: 'update', message: 'row locked' },
    });
  });
});

describe('family operations', () => {
  const FAMILY = { id: 'fam-1', name: 'Rahman', owner_id: 'user-1' };

  it('returns no family when the user has no membership', async () => {
    const { client } = createHarness({ family_members: [{ data: null }] });
    mockGetSupabase.mockResolvedValue(client);
    await expect(cloud.supabaseLoadFamily('user-1')).resolves.toEqual({
      family: null,
      members: [],
    });
  });

  it('loads the family and its members', async () => {
    const members = [{ id: 'm1', family_id: 'fam-1', user_id: 'user-1', role: 'owner' }];
    const { client, calls } = createHarness({
      family_members: [{ data: { id: 'm1', families: FAMILY } }, { data: members }],
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseLoadFamily('user-1')).resolves.toEqual({
      family: FAMILY,
      members,
    });
    expect(calls.map((c) => c.table)).toEqual(['family_members', 'family_members']);
  });

  it('creates a family and seats the owner', async () => {
    const { client, calls } = createHarness({
      families: [{ data: FAMILY }],
      family_members: [{}],
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseCreateFamily('Rahman', 'user-1')).resolves.toEqual({
      familyId: 'fam-1',
      error: null,
    });
    expect(calls[0].args[0]).toEqual({ name: 'Rahman', owner_id: 'user-1' });
    expect(calls[1].args[0]).toMatchObject({
      family_id: 'fam-1',
      user_id: 'user-1',
      role: 'owner',
    });
  });

  it('maps family creation failures', async () => {
    const { client } = createHarness({ families: [{ error: { message: 'duplicate name' } }] });
    mockGetSupabase.mockResolvedValue(client);
    await expect(cloud.supabaseCreateFamily('Rahman', 'user-1')).resolves.toEqual({
      error: { code: 'create-family', message: 'duplicate name' },
    });
  });

  it('maps owner-membership failures', async () => {
    const { client } = createHarness({
      families: [{ data: FAMILY }],
      family_members: [{ error: { message: 'rls denied' } }],
    });
    mockGetSupabase.mockResolvedValue(client);
    await expect(cloud.supabaseCreateFamily('Rahman', 'user-1')).resolves.toEqual({
      error: { code: 'create-member', message: 'rls denied' },
    });
  });

  it('invites an existing user by lower-cased email', async () => {
    const { client, calls } = createHarness({
      user_profiles: [{ data: { id: 'user-2' } }],
      family_members: [{ data: null }, {}],
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(
      cloud.supabaseInviteMember('fam-1', ' Rahim@Example.com ', 'parent'),
    ).resolves.toEqual({ error: null });
    expect(calls[0].args).toContain('rahim@example.com');
    expect(calls[2].args[0]).toMatchObject({
      family_id: 'fam-1',
      user_id: 'user-2',
      role: 'parent',
    });
  });

  it('refuses to invite an email with no account', async () => {
    const { client } = createHarness({ user_profiles: [{ data: null }] });
    mockGetSupabase.mockResolvedValue(client);

    await expect(
      cloud.supabaseInviteMember('fam-1', 'nobody@example.com', 'viewer'),
    ).resolves.toEqual({
      error: {
        code: 'not-found',
        message: 'No TikaTrack account uses that email yet',
      },
    });
  });

  it('refuses a duplicate membership', async () => {
    const { client } = createHarness({
      user_profiles: [{ data: { id: 'user-2' } }],
      family_members: [{ data: { id: 'existing' } }],
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(
      cloud.supabaseInviteMember('fam-1', 'rahim@example.com', 'parent'),
    ).resolves.toEqual({
      error: { code: 'duplicate', message: 'That person is already a member' },
    });
  });

  it('removes a member', async () => {
    const { client, calls } = createHarness({ family_members: [{}] });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseRemoveMember('m1')).resolves.toEqual({ error: null });
    expect(calls[0].ops).toEqual(['delete', 'eq']);
    expect(calls[0].args).toEqual(['id', 'm1']);
  });

  it('changes a member role', async () => {
    const { client, calls } = createHarness({ family_members: [{}] });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseUpdateMemberRole('m1', 'caregiver')).resolves.toEqual({
      error: null,
    });
    expect(calls[0].args[0]).toEqual({ role: 'caregiver' });
  });

  it('transfers ownership in three steps', async () => {
    const { client, calls } = createHarness({ families: [{}], family_members: [{}, {}] });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseTransferOwnership('fam-1', 'user-1', 'user-2')).resolves.toEqual({
      error: null,
    });
    expect(calls[0].args[0]).toEqual({ owner_id: 'user-2' });
    expect(calls[1].args[0]).toEqual({ role: 'parent' }); // old owner demoted
    expect(calls[2].args[0]).toEqual({ role: 'owner' }); // new owner promoted
  });

  it('stops at the first failing step of a transfer', async () => {
    const { client, calls } = createHarness({
      families: [{ error: { message: 'not allowed' } }],
    });
    mockGetSupabase.mockResolvedValue(client);

    await expect(cloud.supabaseTransferOwnership('fam-1', 'user-1', 'user-2')).resolves.toEqual({
      error: { code: 'error', message: 'not allowed' },
    });
    expect(calls).toHaveLength(1); // the membership updates never ran
  });
});
