/**
 * Auth domain types, shared by the local and Supabase implementations.
 */

export type FamilyRole = 'owner' | 'parent' | 'caregiver' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  language_preference: 'en' | 'bn';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  invited_at: string;
  joined_at?: string;
  user_profile?: UserProfile;
}

/** Where the current session lives. */
export type AuthBackend = 'local' | 'supabase' | 'firebase';

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResult {
  error: AuthError | null;
}
