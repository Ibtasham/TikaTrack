/**
 * Supabase-backed auth adapter.
 *
 * Every function resolves to `null` when Supabase is not configured, so the
 * caller can fall back to local auth without branching everywhere.
 */

import { getSupabase } from '../supabase';
import type { AuthResult, Family, FamilyMember, FamilyRole, UserProfile } from '../../types/auth';

function toResult(message: string | null | undefined, code = 'error'): AuthResult {
  return { error: message ? { code, message } : null };
}

/**
 * Absolute URL Supabase should send its verification / password-reset emails to.
 *
 * Built from Vite's base path so a sub-path deploy (a GitHub Pages project site)
 * lands back inside the app instead of at the host root. Whichever URL this
 * produces must also be on the allow-list in Supabase → Auth → URL Configuration.
 */
function authCallbackUrl(mode: 'verify' | 'reset'): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}auth?mode=${mode}`;
}

export async function supabaseGetSession(): Promise<UserProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return loadProfile(supabase, session.user.id, session.user.email ?? '');
}

async function loadProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  userId: string,
  email: string,
): Promise<UserProfile> {
  const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
  const now = new Date().toISOString();
  return (
    (data as UserProfile | null) ?? {
      id: userId,
      email,
      full_name: email.split('@')[0],
      language_preference: 'en',
      email_verified: false,
      created_at: now,
      updated_at: now,
    }
  );
}

export async function supabaseSignUp(
  email: string,
  password: string,
  fullName: string,
): Promise<{ user: UserProfile | null } & AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return { user: null, error: { code: 'unconfigured', message: 'Supabase is off' } };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: authCallbackUrl('verify'),
    },
  });
  if (error || !data.user)
    return { user: null, error: { code: 'signup', message: error?.message ?? '' } };

  await supabase.from('user_profiles').upsert({
    id: data.user.id,
    email: data.user.email ?? email,
    full_name: fullName,
    language_preference: 'en',
    email_verified: Boolean(data.user.email_confirmed_at),
  });

  const user = await loadProfile(supabase, data.user.id, data.user.email ?? email);
  return { user, error: null };
}

export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<{ user: UserProfile | null } & AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return { user: null, error: { code: 'unconfigured', message: 'Supabase is off' } };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { user: null, error: { code: 'signin', message: error?.message ?? 'Sign-in failed' } };
  }
  const user = await loadProfile(supabase, data.user.id, data.user.email ?? email);
  return { user, error: null };
}

export async function supabaseSignOut(): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult(null);
  const { error } = await supabase.auth.signOut();
  return toResult(error?.message);
}

export async function supabaseResetPassword(email: string): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl('reset'),
  });
  return toResult(error?.message);
}

export async function supabaseUpdatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return toResult(error?.message);
}

export async function supabaseUpdateProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<{ user: UserProfile | null } & AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return { user: null, error: { code: 'unconfigured', message: 'Supabase is off' } };

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { user: null, error: { code: 'update', message: error.message } };

  const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
  return { user: (data as UserProfile | null) ?? null, error: null };
}

export async function supabaseLoadFamily(userId: string): Promise<{
  family: Family | null;
  members: FamilyMember[];
}> {
  const supabase = await getSupabase();
  if (!supabase) return { family: null, members: [] };

  const { data: membership } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership?.families) return { family: null, members: [] };
  const family = membership.families as Family;

  const { data: members } = await supabase
    .from('family_members')
    .select('*, user_profiles(*)')
    .eq('family_id', family.id);

  return { family, members: (members as FamilyMember[] | null) ?? [] };
}

export async function supabaseCreateFamily(
  name: string,
  ownerId: string,
): Promise<{ familyId?: string } & AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return { error: { code: 'unconfigured', message: 'Supabase is off' } };

  const { data: family, error } = await supabase
    .from('families')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) return { error: { code: 'create-family', message: error.message } };

  const { error: memberError } = await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: ownerId,
    role: 'owner',
    joined_at: new Date().toISOString(),
  });
  if (memberError) return { error: { code: 'create-member', message: memberError.message } };

  return { familyId: family.id as string, error: null };
}

export async function supabaseInviteMember(
  familyId: string,
  email: string,
  role: FamilyRole,
): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');

  const { data: invitee } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (!invitee) return toResult('No TikaTrack account uses that email yet', 'not-found');

  const { data: existing } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId)
    .eq('user_id', invitee.id)
    .maybeSingle();
  if (existing) return toResult('That person is already a member', 'duplicate');

  const { error } = await supabase.from('family_members').insert({
    family_id: familyId,
    user_id: invitee.id,
    role,
    invited_at: new Date().toISOString(),
  });
  return toResult(error?.message);
}

export async function supabaseRemoveMember(memberId: string): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');
  const { error } = await supabase.from('family_members').delete().eq('id', memberId);
  return toResult(error?.message);
}

export async function supabaseUpdateMemberRole(
  memberId: string,
  role: FamilyRole,
): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');
  const { error } = await supabase.from('family_members').update({ role }).eq('id', memberId);
  return toResult(error?.message);
}

export async function supabaseTransferOwnership(
  familyId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return toResult('Supabase is not configured');

  const { error: familyError } = await supabase
    .from('families')
    .update({ owner_id: newOwnerId })
    .eq('id', familyId);
  if (familyError) return toResult(familyError.message);

  const { error: demoteError } = await supabase
    .from('family_members')
    .update({ role: 'parent' })
    .eq('family_id', familyId)
    .eq('user_id', currentOwnerId);
  if (demoteError) return toResult(demoteError.message);

  const { error: promoteError } = await supabase
    .from('family_members')
    .update({ role: 'owner' })
    .eq('family_id', familyId)
    .eq('user_id', newOwnerId);
  return toResult(promoteError?.message);
}
