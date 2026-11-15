/**
 * Supabase client — created lazily and only when credentials exist.
 *
 * TikaTrack is offline-first: without `VITE_SUPABASE_URL` /
 * `VITE_SUPABASE_ANON_KEY` nothing is initialised, no network request is made
 * and the `@supabase/supabase-js` chunk is never even fetched (see the dynamic
 * import in `getSupabase()`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let attempted = false;

function readEnv(): { url: string; anonKey: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  return { url, anonKey };
}

/** `true` when both Supabase env vars are present and look plausible. */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readEnv();
  return /^https:\/\/.+/i.test(url) && anonKey.length > 20;
}

/**
 * Return the shared Supabase client, creating it on first use.
 * Resolves to `null` when the app is running in local-only mode.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (attempted) return client;
  attempted = true;
  if (!isSupabaseConfigured()) return null;

  const { url, anonKey } = readEnv();
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'tikatrack-auth-token',
    },
    global: {
      headers: { 'x-application-name': 'TikaTrack' },
    },
  });
  return client;
}

/** Human-readable label for the Privacy dashboard. */
export function getSupabaseProjectLabel(): string {
  const { url } = readEnv();
  if (!isSupabaseConfigured()) return 'not configured';
  try {
    return new URL(url).hostname;
  } catch {
    return 'configured';
  }
}
