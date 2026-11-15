import { afterEach, describe, expect, it, vi } from 'vitest';

const PROJECT_URL = 'https://abcdefghijklm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-key-material';

/** Load a fresh copy of the module: `getSupabase` memoises its first attempt. */
async function loadSupabase() {
  vi.resetModules();
  return import('../lib/supabase');
}

function stubEnv(url?: string, key?: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url ?? '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key ?? '');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('isSupabaseConfigured', () => {
  it('is false out of the box — the offline-first default', async () => {
    const { isSupabaseConfigured } = await loadSupabase();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('is false when only one of the two variables is set', async () => {
    const { isSupabaseConfigured } = await loadSupabase();

    stubEnv(PROJECT_URL, '');
    expect(isSupabaseConfigured()).toBe(false);

    stubEnv('', ANON_KEY);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('rejects a non-HTTPS project URL', async () => {
    const { isSupabaseConfigured } = await loadSupabase();
    stubEnv('http://abcdefghijklm.supabase.co', ANON_KEY);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('rejects a placeholder or implausibly short anon key', async () => {
    const { isSupabaseConfigured } = await loadSupabase();
    stubEnv(PROJECT_URL, 'your-anon-key');
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('is true when both values look plausible, ignoring stray whitespace', async () => {
    const { isSupabaseConfigured } = await loadSupabase();
    stubEnv(`  ${PROJECT_URL}  `, ` ${ANON_KEY} `);
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe('getSupabaseProjectLabel', () => {
  it('reports "not configured" in local mode', async () => {
    const { getSupabaseProjectLabel } = await loadSupabase();
    expect(getSupabaseProjectLabel()).toBe('not configured');
  });

  it('reports the project hostname in cloud mode', async () => {
    const { getSupabaseProjectLabel } = await loadSupabase();
    stubEnv(PROJECT_URL, ANON_KEY);
    expect(getSupabaseProjectLabel()).toBe('abcdefghijklm.supabase.co');
  });
});

describe('getSupabase', () => {
  it('resolves null and never touches the network in local mode', async () => {
    const { getSupabase } = await loadSupabase();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(getSupabase()).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps returning null on subsequent calls', async () => {
    const { getSupabase } = await loadSupabase();
    await expect(getSupabase()).resolves.toBeNull();
    await expect(getSupabase()).resolves.toBeNull();
  });
});
