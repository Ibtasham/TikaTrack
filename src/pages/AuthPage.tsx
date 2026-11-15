import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cloud,
  CloudOff,
  Crown,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import type { FamilyRole } from '../types/auth';
import { assessPasswordStrength, MIN_PASSWORD_LENGTH } from '../lib/localAuth';

type Mode = 'login' | 'signup' | 'reset';

const ROLES: FamilyRole[] = ['owner', 'parent', 'caregiver', 'viewer'];

/**
 * `/auth` — one route that is three forms when signed out and an account panel
 * when signed in.
 *
 * Signing in is genuinely optional: the whole app runs on localStorage without
 * it. That fact is stated up front rather than hidden behind a paywall-style
 * gate, because a vaccination tracker that refuses to work offline would be
 * useless exactly where connectivity is worst.
 */
export default function AuthPage() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';
  const toast = useToast();
  const navigate = useNavigate();
  const auth = useAuth();
  const {
    user,
    loading,
    backend,
    cloudEnabled,
    family,
    familyMembers,
    signUp,
    signIn,
    signOut,
    resetPassword,
    changePassword,
    createFamily,
    inviteMember,
    removeMember,
    updateMemberRole,
    transferOwnership,
    deleteAccount,
  } = auth;

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Account panel (signed-in) state.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Family state.
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyBusy, setFamilyBusy] = useState(false);

  const strength = useMemo(() => assessPasswordStrength(password), [password]);
  const strengthTone =
    strength.label === 'strong'
      ? 'text-emerald-600 dark:text-emerald-400'
      : strength.label === 'good'
        ? 'text-lime-600 dark:text-lime-400'
        : strength.label === 'fair'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';

  useEffect(() => {
    setFormError(null);
  }, [mode, email, password, confirm, fullName]);

  /** Translate a known local error code; otherwise show the message verbatim. */
  const describeError = useCallback(
    (error: { code: string; message: string } | null): string | null => {
      if (!error) return null;
      switch (error.code) {
        case 'invalid-email':
        case 'invalid-credentials':
          return t('auth.error.invalid');
        case 'weak-password':
          return t('auth.error.weak');
        case 'email-taken':
          return t('auth.error.exists');
        default:
          return error.message;
      }
    },
    [t],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (mode === 'reset') {
      if (!email.trim()) {
        setFormError(t('auth.error.required'));
        return;
      }
      setSubmitting(true);
      const result = await resetPassword(email.trim());
      setSubmitting(false);
      if (result.error) {
        setFormError(describeError(result.error));
      } else {
        toast.success(t('auth.success.reset'));
        setMode('login');
        setPassword('');
      }
      return;
    }

    if (!email.trim() || !password || (mode === 'signup' && !fullName.trim())) {
      setFormError(t('auth.error.required'));
      return;
    }
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setFormError(t('auth.error.weak'));
        return;
      }
      if (password !== confirm) {
        setFormError(t('auth.error.mismatch'));
        return;
      }
    }

    setSubmitting(true);
    const result =
      mode === 'signup'
        ? await signUp(email.trim(), password, fullName.trim())
        : await signIn(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setFormError(describeError(result.error));
      return;
    }
    toast.success(mode === 'signup' ? t('auth.success.signup') : t('auth.login.title'));
    setPassword('');
    setConfirm('');
    navigate('/tracker');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(t('auth.error.weak'));
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    if (result.error) {
      toast.error(describeError(result.error) ?? t('common.status.error'));
      return;
    }
    toast.success(t('auth.passwordChanged'));
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleSignOut = async () => {
    await signOut();
    setMode('login');
    toast.info(t('auth.signedOut'));
  };

  const handleCreateFamily = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!familyName.trim()) return;
    setFamilyBusy(true);
    const result = await createFamily(familyName.trim());
    setFamilyBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFamilyName('');
    toast.success(t('auth.family.create'));
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setFamilyBusy(true);
    const result = await inviteMember(inviteEmail.trim(), 'caregiver');
    setFamilyBusy(false);
    if (result.error) {
      toast.error(describeError(result.error) ?? t('common.status.error'));
      return;
    }
    setInviteEmail('');
    toast.success(t('auth.family.invite'));
  };

  /* ===================================================================== */
  /* Signed-out: the three forms                                            */
  /* ===================================================================== */
  if (!user) {
    const heading =
      mode === 'login'
        ? t('auth.login.title')
        : mode === 'signup'
          ? t('auth.signup.title')
          : t('auth.reset.title');
    const subheading =
      mode === 'login'
        ? t('auth.login.subtitle')
        : mode === 'signup'
          ? t('auth.signup.subtitle')
          : t('auth.reset.subtitle');

    return (
      <div className="page-shell max-w-md">
        <div className="card-padded">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            {cloudEnabled ? (
              <>
                <Cloud className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                {t('auth.cloudMode', backend === 'supabase' ? 'Supabase' : backend)}
              </>
            ) : (
              <>
                <HardDrive
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                {t('auth.localMode')}
              </>
            )}
          </div>

          <h1 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>{heading}</h1>
          <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>{subheading}</p>

          {!cloudEnabled && (
            <p
              className={`mt-4 rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('auth.optional.body')}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="auth-name">
                  {t('auth.fullName')}
                </label>
                <input
                  id="auth-name"
                  className="input-field"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="auth-email">
                {t('auth.email')}
              </label>
              <input
                id="auth-email"
                type="email"
                className="input-field"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="label" htmlFor="auth-password">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-11"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            strength.label === 'strong'
                              ? 'bg-emerald-500'
                              : strength.label === 'good'
                                ? 'bg-lime-500'
                                : strength.label === 'fair'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${(strength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${strengthTone}`}>
                        {strength.label === 'empty' ? '' : t(`auth.strength.${strength.label}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('auth.passwordStrength')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="auth-confirm">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
            )}

            {formError && (
              <p
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                {formError}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting || loading}>
              {submitting ? t('common.status.loading') : t(`auth.submit.${mode}`)}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm">
            {mode !== 'login' && (
              <button type="button" className="btn-link" onClick={() => setMode('login')}>
                {t('auth.switch.back')}
              </button>
            )}
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  className="btn-link block w-full"
                  onClick={() => setMode('signup')}
                >
                  {t('auth.switch.signup')}
                </button>
                <button
                  type="button"
                  className="btn-link block w-full"
                  onClick={() => setMode('reset')}
                >
                  {t('auth.switch.reset')}
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                className="btn-link block w-full"
                onClick={() => setMode('login')}
              >
                {t('auth.switch.login')}
              </button>
            )}
          </div>

          <p
            className={`mt-5 flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {cloudEnabled ? t('auth.privacy') : t('auth.localAccountNotice')}
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <Link to="/" className="btn-link">
            {t('common.actions.back')}
          </Link>
        </p>
      </div>
    );
  }

  /* ===================================================================== */
  /* Signed-in: account panel                                               */
  /* ===================================================================== */
  const isOwner = family?.owner_id === user.id;

  return (
    <div className="page-shell max-w-3xl">
      <header>
        <h1 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
          {t('auth.login.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('auth.signedInAs', user.full_name || user.email)}
        </p>
      </header>

      {/* Backend / storage notice */}
      <div className="card-padded mt-6">
        <div className="flex items-start gap-3">
          {cloudEnabled ? (
            <Cloud
              className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
              aria-hidden="true"
            />
          ) : (
            <CloudOff
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          )}
          <div>
            <p
              className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {cloudEnabled ? t('auth.cloudMode', 'Supabase') : t('auth.localMode')}
            </p>
            <p
              className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {cloudEnabled ? t('auth.privacy') : t('auth.localAccountNotice')}
            </p>
            <p
              className={`mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('privacy.password')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="current-password">
              {t('auth.password')}
            </label>
            <input
              id="current-password"
              type="password"
              className="input-field"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="new-password">
              {t('privacy.newPassword')}
            </label>
            <input
              id="new-password"
              type="password"
              className="input-field"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary mt-4">
          {t('common.actions.save')}
        </button>
      </form>

      {/* Family sharing */}
      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('auth.family.title')}
        </h2>

        {!cloudEnabled ? (
          <p
            className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('auth.family.body')}
          </p>
        ) : !family ? (
          <form onSubmit={handleCreateFamily} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <label className="label" htmlFor="family-name">
                {t('auth.family.name')}
              </label>
              <input
                id="family-name"
                className="input-field"
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={familyBusy || !familyName.trim()}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {t('auth.family.create')}
            </button>
          </form>
        ) : (
          <div className="mt-4">
            <p
              className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {family.name}
            </p>

            <ul className="mt-3 space-y-2">
              {familyMembers.map((member) => {
                const name =
                  member.user_profile?.full_name || member.user_profile?.email || member.user_id;
                const isSelf = member.user_id === user.id;
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
                  >
                    {member.role === 'owner' && (
                      <Crown
                        className="h-4 w-4 text-amber-500"
                        aria-label={t('auth.family.role.owner')}
                      />
                    )}
                    <span
                      className={`flex-1 text-sm text-neutral-800 dark:text-neutral-100 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {name}
                      {isSelf && (
                        <span className="text-neutral-400"> · {t('auth.family.you')}</span>
                      )}
                    </span>

                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      {t('auth.family.role.' + member.role)}
                    </label>
                    <select
                      id={`role-${member.id}`}
                      className="input-field w-auto py-1 text-sm"
                      value={member.role}
                      disabled={!isOwner || isSelf}
                      onChange={async (event) => {
                        const nextRole = event.target.value as FamilyRole;
                        if (nextRole === 'owner') {
                          await transferOwnership(member.user_id);
                        } else {
                          await updateMemberRole(member.id, nextRole);
                        }
                        toast.info(t('common.actions.save'));
                      }}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`auth.family.role.${role}`)}
                        </option>
                      ))}
                    </select>

                    {!isSelf && isOwner && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={async () => {
                          await removeMember(member.id);
                          toast.info(t('common.actions.delete'));
                        }}
                        aria-label={t('common.actions.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <form onSubmit={handleInvite} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label className="label" htmlFor="invite-email">
                  {t('auth.family.invite')}
                </label>
                <input
                  id="invite-email"
                  type="email"
                  className="input-field"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-secondary"
                disabled={familyBusy || !inviteEmail.trim()}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t('auth.family.invite')}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Sign out / delete */}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => void handleSignOut()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t('common.actions.signOut')}
        </button>
        <button
          type="button"
          className="btn-ghost text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('privacy.delete')}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('privacy.delete')}
        description={t('confirm.deleteProfile.body')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteAccount();
          toast.info(t('auth.signedOut'));
          setMode('login');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
