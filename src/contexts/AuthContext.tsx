import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import type {
  AuthBackend,
  AuthResult,
  Family,
  FamilyMember,
  FamilyRole,
  UserProfile,
} from '../types/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { deleteAllFirebaseUserDocs, ensureFirebaseAccountDocs } from '../services/cloudSync';
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
  firebaseUser: FirebaseUser | null;
  family: Family | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  error: string | null;
  /** Which implementation is active. */
  backend: AuthBackend;
  /** `true` when cloud sync is available (Firebase Google Sign-In or Supabase configured). */
  cloudEnabled: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  getFirebaseIdToken: () => Promise<string | null>;
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
    message: 'Family sharing needs Supabase multi-member invites configured.',
  },
};

function firebaseUserToProfile(fbUser: FirebaseUser): UserProfile {
  const now = new Date().toISOString();
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    full_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Family Member',
    avatar_url: fbUser.photoURL || undefined,
    language_preference: 'en',
    email_verified: fbUser.emailVerified,
    created_at: fbUser.metadata.creationTime || now,
    updated_at: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), []);

  const [state, setState] = useState<AuthState>({
    user: null,
    userProfile: null,
    firebaseUser: null,
    family: null,
    familyMembers: [],
    loading: true,
    error: null,
    backend: supabaseConfigured ? 'supabase' : 'local',
    cloudEnabled: supabaseConfigured,
  });

  const setUser = useCallback((user: UserProfile | null, backendOverride?: AuthBackend) => {
    setState((previous) => {
      const nextBackend =
        backendOverride ?? (previous.firebaseUser ? 'firebase' : supabaseConfigured ? 'supabase' : 'local');
      return {
        ...previous,
        user,
        userProfile: user,
        backend: nextBackend,
        cloudEnabled: nextBackend !== 'local',
        loading: false,
        error: null,
      };
    });
  }, [supabaseConfigured]);

  // Restore local/Supabase session + subscribe to Firebase Auth.
  useEffect(() => {
    let cancelled = false;

    async function bootstrapLegacy() {
      if (!supabaseConfigured) {
        const local = localGetSession();
        if (!cancelled) {
          setState((previous) =>
            previous.firebaseUser
              ? previous
              : {
                  ...previous,
                  user: local,
                  userProfile: local,
                  backend: 'local',
                  cloudEnabled: false,
                  loading: false,
                },
          );
        }
        return;
      }
      try {
        const profile = await cloud.supabaseGetSession();
        if (!cancelled && profile) {
          setState((previous) =>
            previous.firebaseUser
              ? previous
              : {
                  ...previous,
                  user: profile,
                  userProfile: profile,
                  backend: 'supabase',
                  cloudEnabled: true,
                  loading: false,
                },
          );
          const { family, members } = await cloud.supabaseLoadFamily(profile.id);
          if (!cancelled) setState((prev) => ({ ...prev, family, familyMembers: members }));
        } else if (!cancelled) {
          setState((prev) => (prev.firebaseUser ? prev : { ...prev, loading: false }));
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

    void bootstrapLegacy();

    if (import.meta.env.MODE === 'test') {
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (cancelled) return;
      if (fbUser) {
        const profile = firebaseUserToProfile(fbUser);
        setState((previous) => ({
          ...previous,
          user: profile,
          userProfile: profile,
          firebaseUser: fbUser,
          backend: 'firebase',
          cloudEnabled: true,
          loading: false,
          error: null,
        }));
        void ensureFirebaseAccountDocs(fbUser).catch(() => {
          /* non-fatal offline bootstrap */
        });
      } else {
        setState((previous) => {
          if (previous.backend !== 'firebase') return previous;
          const fallbackLocal = supabaseConfigured ? null : localGetSession();
          return {
            ...previous,
            firebaseUser: null,
            user: fallbackLocal,
            userProfile: fallbackLocal,
            backend: supabaseConfigured ? 'supabase' : 'local',
            cloudEnabled: supabaseConfigured,
            loading: false,
          };
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [supabaseConfigured]);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const profile = firebaseUserToProfile(cred.user);
      setState((previous) => ({
        ...previous,
        user: profile,
        userProfile: profile,
        firebaseUser: cred.user,
        backend: 'firebase',
        cloudEnabled: true,
        loading: false,
        error: null,
      }));
      void ensureFirebaseAccountDocs(cred.user).catch(() => {
        /* non-fatal if offline */
      });
      return { error: null };
    } catch (error) {
      const errCode =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'google-auth-failed';
      const msg =
        errCode === 'auth/popup-closed-by-user'
          ? 'Google sign-in popup was closed before completing.'
          : error instanceof Error
            ? error.message
            : 'Google sign-in failed.';
      return { error: { code: errCode, message: msg } };
    }
  }, []);

  const getFirebaseIdToken = useCallback(async (): Promise<string | null> => {
    if (!state.firebaseUser) return null;
    try {
      return await state.firebaseUser.getIdToken();
    } catch {
      return null;
    }
  }, [state.firebaseUser]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      if (supabaseConfigured) {
        const result = await cloud.supabaseSignUp(email, password, fullName);
        if (result.user) setUser(result.user, 'supabase');
        return { error: result.error };
      }
      const result = await localSignUp(email, password, fullName);
      if (result.user) setUser(result.user, 'local');
      return {
        error: result.error
          ? {
              code: result.error,
              message: describeLocalError(result.error, result.user?.email ?? email),
            }
          : null,
      };
    },
    [supabaseConfigured, setUser],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (supabaseConfigured) {
        const result = await cloud.supabaseSignIn(email, password);
        if (result.user) setUser(result.user, 'supabase');
        return { error: result.error };
      }
      const result = await localSignIn(email, password);
      if (result.user) setUser(result.user, 'local');
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error, email) }
          : null,
      };
    },
    [supabaseConfigured, setUser],
  );

  const signOut = useCallback(async () => {
    if (state.firebaseUser) {
      await firebaseSignOut(auth);
    }
    if (supabaseConfigured) await cloud.supabaseSignOut();
    localSignOut();
    setState((previous) => ({
      ...previous,
      user: null,
      userProfile: null,
      firebaseUser: null,
      family: null,
      familyMembers: [],
      backend: supabaseConfigured ? 'supabase' : 'local',
      cloudEnabled: supabaseConfigured,
      loading: false,
      error: null,
    }));
  }, [state.firebaseUser, supabaseConfigured]);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (supabaseConfigured) return cloud.supabaseResetPassword(email);
      return {
        error: {
          code: 'local-mode',
          message:
            'Password reset emails need Supabase email auth. For Google Sign-In, manage your password through your Google Account.',
        },
      };
    },
    [supabaseConfigured],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      if (state.backend === 'firebase') {
        return {
          error: {
            code: 'google-managed',
            message: 'Your Google account password is managed securely in your Google Account settings.',
          },
        };
      }
      if (supabaseConfigured) return cloud.supabaseUpdatePassword(newPassword);
      const userId = state.user?.id;
      if (!userId) return { error: { code: 'no-session', message: 'You are signed out' } };
      const result = await localChangePassword(userId, currentPassword, newPassword);
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error) }
          : null,
      };
    },
    [state.backend, state.user?.id, supabaseConfigured],
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<AuthResult> => {
      const userId = state.user?.id;
      if (!userId) return { error: { code: 'no-session', message: 'You are signed out' } };

      if (state.backend === 'firebase' && state.user) {
        setUser({ ...state.user, ...updates, updated_at: new Date().toISOString() }, 'firebase');
        return { error: null };
      }

      if (supabaseConfigured) {
        const result = await cloud.supabaseUpdateProfile(userId, updates);
        if (result.user) setUser(result.user, 'supabase');
        return { error: result.error };
      }
      const result = await localUpdateProfile(userId, updates);
      if (result.user) setUser(result.user, 'local');
      return {
        error: result.error
          ? { code: result.error, message: describeLocalError(result.error) }
          : null,
      };
    },
    [setUser, state.backend, state.user, supabaseConfigured],
  );

  const refreshFamily = useCallback(async () => {
    if (!supabaseConfigured || !state.user || state.backend !== 'supabase') return;
    const { family, members } = await cloud.supabaseLoadFamily(state.user.id);
    setState((previous) => ({ ...previous, family, familyMembers: members }));
  }, [state.backend, state.user, supabaseConfigured]);

  const createFamily = useCallback(
    async (name: string) => {
      if (!supabaseConfigured || !state.user || state.backend !== 'supabase') {
        return { error: cloudDisabled.error?.message ?? null };
      }
      const result = await cloud.supabaseCreateFamily(name, state.user.id);
      await refreshFamily();
      return { error: result.error?.message ?? null, familyId: result.familyId };
    },
    [refreshFamily, state.backend, state.user, supabaseConfigured],
  );

  const inviteMember = useCallback(
    async (email: string, role: FamilyRole): Promise<AuthResult> => {
      if (!supabaseConfigured || !state.family) return cloudDisabled;
      const result = await cloud.supabaseInviteMember(state.family.id, email, role);
      await refreshFamily();
      return result;
    },
    [refreshFamily, state.family, supabaseConfigured],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<AuthResult> => {
      if (!supabaseConfigured) return cloudDisabled;
      const result = await cloud.supabaseRemoveMember(memberId);
      await refreshFamily();
      return result;
    },
    [refreshFamily, supabaseConfigured],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: FamilyRole): Promise<AuthResult> => {
      if (!supabaseConfigured) return cloudDisabled;
      const result = await cloud.supabaseUpdateMemberRole(memberId, role);
      await refreshFamily();
      return result;
    },
    [refreshFamily, supabaseConfigured],
  );

  const transferOwnership = useCallback(
    async (newOwnerId: string): Promise<AuthResult> => {
      if (!supabaseConfigured || !state.family || !state.user) return cloudDisabled;
      const result = await cloud.supabaseTransferOwnership(
        state.family.id,
        state.user.id,
        newOwnerId,
      );
      await refreshFamily();
      return result;
    },
    [refreshFamily, state.family, state.user, supabaseConfigured],
  );

  const deleteAccount = useCallback(async () => {
    if (state.firebaseUser) {
      const fbUser = state.firebaseUser;
      try {
        const token = await fbUser.getIdToken();
        await fetch('/api/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
      } catch {
        /* ignore offline token/network errors */
      }

      await deleteAllFirebaseUserDocs(fbUser.uid).catch(() => undefined);

      try {
        await fbUser.delete();
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
        if (code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(fbUser, googleAuthProvider);
          await fbUser.delete();
        } else {
          throw err;
        }
      }
      await signOut().catch(() => undefined);
      return;
    }

    if (supabaseConfigured) {
      await signOut();
      return;
    }
    if (state.user) await localDeleteAccount(state.user.id);
    setUser(null, 'local');
  }, [setUser, signOut, state.firebaseUser, state.user, supabaseConfigured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      getFirebaseIdToken,
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
      signInWithGoogle,
      getFirebaseIdToken,
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

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
