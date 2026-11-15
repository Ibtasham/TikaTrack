import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthBackend,
  AuthResult,
  Family,
  FamilyMember,
  FamilyRole,
  UserProfile,
} from '../types/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  localChangePassword,
  localDeleteAccount,
  localGetSession,
  localSignIn,
  localSignOut,
  localSignUp,
  localUpdateProfile,
} from '../lib/localAuth';
import * as cloud from '../lib/auth/supabaseAuth';

interface AuthState {
  user: UserProfile | null;
  /** Kept for backwards compatibility with the Supabase user object shape. */
  userProfile: UserProfile | null;
  family: Family | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  error: string | null;
  /** Which implementation is active. */
  backend: AuthBackend;
  /** `true` when cloud sync is available (Supabase configured). */
  cloudEnabled: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<AuthResult>;
  createFamily: (name: string) => Promise<{ error: string | null; familyId?: string }>;
  inviteMember: (email: string, role: FamilyRole) => Promise<AuthResult>;
  removeMember: (memberId: string) => Promise<AuthResult>;
  updateMemberRole: (memberId: string, role: FamilyRole) => Promise<AuthResult>;
  transferOwnership: (newOwnerId: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

const cloudDisabled: AuthResult = {
  error: {
    code: 'cloud-disabled',
    message: 'Family sharing needs cloud sync. Add your Supabase keys to .env.local to enable it.',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = useMemo(() => isSupabaseConfigured(), []);
  const backend: AuthBackend = cloudEnabled ? 'supabase' : 'local';

  const [state, setState] = useState<AuthState>({
    user: null,
    userProfile: null,
    family: null,
    familyMembers: [],
    loading: true,
    error: null,
    backend,
    cloudEnabled,
  });

  const setUser = useCallback((user: UserProfile | null) => {
    setState((previous) => ({ ...previous, user, userProfile: user, loading: false, error: null }));
  }, []);

  // Restore the session on boot.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!cloudEnabled) {
        const local = localGetSession();
        if (!cancelled) setUser(local);
        return;
      }
      try {
        const profile = await cloud.supabaseGetSession();
        if (!cancelled && profile) {
          setUser(profile);
          const { family, members } = await cloud.supabaseLoadFamily(profile.id);
          if (!cancelled) setState((prev) => ({ ...prev, family, familyMembers: members }));
        } else if (!cancelled) {
          setUser(null);
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Could not restore your session',
          }));
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, setUser]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      if (cloudEnabled) {
        const result = await cloud.supabaseSignUp(email, password, fullName);
        if (result.user) setUser(result.user);
        return { error: result.error };
      }
      const result = await localSignUp(email, password, fullName);
      if (result.user) setUser(result.user);
      return {
        error: result.error
          ? {
              code: result.error,
              message: describeLocalError(result.error, result.user?.email ?? email),
            }
          : null,
      };
    },
    [cloudEnabled, setUser],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (cloudEnabled) {
        const result = await cloud.supabaseSignIn(email, password);
        if (result.user) setUser(result.user);
        return { error: result.error };
      }
      const result = await localSignIn(email, password);
      if (result.user) setUser(result.user);
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error, email) }
          : null,
      };
    },
    [cloudEnabled, setUser],
  );

  const signOut = useCallback(async () => {
    if (cloudEnabled) await cloud.supabaseSignOut();
    else localSignOut();
    setState((previous) => ({
      ...previous,
      user: null,
      userProfile: null,
      family: null,
      familyMembers: [],
      loading: false,
      error: null,
    }));
  }, [cloudEnabled]);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (cloudEnabled) return cloud.supabaseResetPassword(email);
      return {
        error: {
          code: 'local-mode',
          message:
            'Password reset emails need cloud sync. In local mode, sign in with your stored password or create a new account.',
        },
      };
    },
    [cloudEnabled],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      if (cloudEnabled) return cloud.supabaseUpdatePassword(newPassword);
      const userId = state.user?.id;
      if (!userId) return { error: { code: 'no-session', message: 'You are signed out' } };
      const result = await localChangePassword(userId, currentPassword, newPassword);
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error) }
          : null,
      };
    },
    [cloudEnabled, state.user?.id],
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<AuthResult> => {
      const userId = state.user?.id;
      if (!userId) return { error: { code: 'no-session', message: 'You are signed out' } };

      if (cloudEnabled) {
        const result = await cloud.supabaseUpdateProfile(userId, updates);
        if (result.user) setUser(result.user);
        return { error: result.error };
      }
      const result = await localUpdateProfile(userId, updates);
      if (result.user) setUser(result.user);
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error) }
          : null,
      };
    },
    [cloudEnabled, setUser, state.user?.id],
  );

  const refreshFamily = useCallback(async () => {
    if (!cloudEnabled || !state.user) return;
    const { family, members } = await cloud.supabaseLoadFamily(state.user.id);
    setState((previous) => ({ ...previous, family, familyMembers: members }));
  }, [cloudEnabled, state.user]);

  const createFamily = useCallback(
    async (name: string) => {
      if (!cloudEnabled || !state.user) return { error: cloudDisabled.error?.message ?? null };
      const result = await cloud.supabaseCreateFamily(name, state.user.id);
      await refreshFamily();
      return { error: result.error?.message ?? null, familyId: result.familyId };
    },
    [cloudEnabled, refreshFamily, state.user],
  );

  const inviteMember = useCallback(
    async (email: string, role: FamilyRole): Promise<AuthResult> => {
      if (!cloudEnabled || !state.family) return cloudDisabled;
      const result = await cloud.supabaseInviteMember(state.family.id, email, role);
      await refreshFamily();
      return result;
    },
    [cloudEnabled, refreshFamily, state.family],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<AuthResult> => {
      if (!cloudEnabled) return cloudDisabled;
      const result = await cloud.supabaseRemoveMember(memberId);
      await refreshFamily();
      return result;
    },
    [cloudEnabled, refreshFamily],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: FamilyRole): Promise<AuthResult> => {
      if (!cloudEnabled) return cloudDisabled;
      const result = await cloud.supabaseUpdateMemberRole(memberId, role);
      await refreshFamily();
      return result;
    },
    [cloudEnabled, refreshFamily],
  );

  const transferOwnership = useCallback(
    async (newOwnerId: string): Promise<AuthResult> => {
      if (!cloudEnabled || !state.family || !state.user) return cloudDisabled;
      const result = await cloud.supabaseTransferOwnership(
        state.family.id,
        state.user.id,
        newOwnerId,
      );
      await refreshFamily();
      return result;
    },
    [cloudEnabled, refreshFamily, state.family, state.user],
  );

  const deleteAccount = useCallback(async () => {
    if (cloudEnabled) {
      await signOut();
      return;
    }
    if (state.user) await localDeleteAccount(state.user.id);
    setUser(null);
  }, [cloudEnabled, setUser, signOut, state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signOut,
      resetPassword,
      changePassword,
      updateProfile,
      createFamily,
      inviteMember,
      removeMember,
      updateMemberRole,
      transferOwnership,
      deleteAccount,
      refreshFamily,
    }),
    [
      state,
      signUp,
      signIn,
      signOut,
      resetPassword,
      changePassword,
      updateProfile,
      createFamily,
      inviteMember,
      removeMember,
      updateMemberRole,
      transferOwnership,
      deleteAccount,
      refreshFamily,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function describeLocalError(code: string, email = ''): string {
  switch (code) {
    case 'invalid-email':
      return 'That does not look like a valid email address.';
    case 'weak-password':
      return 'Passwords need at least 8 characters.';
    case 'email-taken':
      return `${email || 'That email'} already has an account on this device. Try signing in.`;
    case 'invalid-credentials':
      return 'Email and password do not match an account on this device.';
    case 'no-session':
      return 'You are signed out.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
