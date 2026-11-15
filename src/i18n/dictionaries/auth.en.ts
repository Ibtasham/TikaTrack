/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'auth.login.title': 'Welcome Back',
  'auth.login.subtitle': "Sign in to continue tracking your family's vaccinations",
  'auth.signup.title': 'Create Account',
  'auth.signup.subtitle': 'Join TikaTrack to protect your family',
  'auth.reset.title': 'Reset Password',
  'auth.reset.subtitle': 'Enter your email to receive a password reset link',
  'auth.email': 'Email Address',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.fullName': 'Full Name',
  'auth.submit.login': 'Sign In',
  'auth.submit.signup': 'Create Account',
  'auth.submit.reset': 'Send Reset Link',
  'auth.switch.signup': "Don't have an account? Sign up",
  'auth.switch.login': 'Already have an account? Sign in',
  'auth.switch.reset': 'Forgot password? Reset it',
  'auth.switch.back': 'Back to sign in',
  'auth.error.invalid': 'Invalid email or password',
  'auth.error.exists': 'Email already registered',
  'auth.error.mismatch': 'Passwords do not match',
  'auth.error.weak': 'Password is too weak',
  'auth.success.reset': 'Password reset link sent to your email',
  'auth.success.signup': 'Account created! Please check your email to verify',
  'auth.privacy': 'Your data is encrypted and secure',
  'auth.optional.title': 'Optional account',
  'auth.optional.body':
    'TikaTrack works fully without an account — everything stays in this browser. Create one only if you want to sync the same data across devices.',
  'auth.localMode': 'Local mode — data stays on this device',
  'auth.cloudMode': 'Cloud sync — connected to {0}',
  'auth.cloudNotConfigured':
    'Cloud sync is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it.',
  'auth.signedInAs': 'Signed in as {0}',
  'auth.localAccountNotice':
    'This is a local account. Your password is hashed in this browser and never sent anywhere — which also means there is no recovery if you forget it. Export a backup.',
  'auth.passwordStrength': 'Password strength',
  'auth.strength.weak': 'Weak',
  'auth.strength.fair': 'Fair',
  'auth.strength.good': 'Good',
  'auth.strength.strong': 'Strong',
  'auth.family.title': 'Family sharing',
  'auth.family.body':
    'Family sharing needs cloud sync. Configure Supabase, then create a family and invite members.',
  'auth.family.create': 'Create a family',
  'auth.family.name': 'Family name',
  'auth.family.members': 'Members',
  'auth.family.invite': 'Invite by email',
  'auth.family.role.owner': 'Owner',
  'auth.family.role.parent': 'Parent',
  'auth.family.role.caregiver': 'Caregiver',
  'auth.family.role.viewer': 'Viewer',
  'auth.signedOut': 'You are signed out.',
  'auth.error.required': 'Please fill in every field.',
  'auth.family.you': 'you',
  'auth.hidePassword': 'Hide password',
  'auth.showPassword': 'Show password',
  'auth.passwordChanged': 'Password updated',
};
