import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Database,
  Download,
  HardDrive,
  KeyRound,
  LogOut,
  Monitor,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  WifiOff,
} from 'lucide-react';

import { ThemeAppearanceCard } from '../components/ThemePicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { downloadJSON } from '../lib/exporters';
import { todayISO } from '../lib/format';
import { buildExport } from '../lib/profileStore';
import { getSupabaseProjectLabel } from '../lib/supabase';
import { clearAllTikaTrackData, estimateStorageUsage } from '../lib/storage';
import { assessPasswordStrength, type PasswordStrength } from '../lib/localAuth';
import {
  clearOfflineCache,
  formatBytes,
  getStorageEstimate,
  isServiceWorkerSupported,
  unregisterServiceWorker,
} from '../lib/serviceWorker';

const STRENGTH_KEYS = {
  empty: 'auth.strength.weak',
  weak: 'auth.strength.weak',
  fair: 'auth.strength.fair',
  good: 'auth.strength.good',
  strong: 'auth.strength.strong',
} as const satisfies Record<PasswordStrength['label'], string>;

/**
 * `/privacy` — account, data and security controls.
 *
 * This is the page that makes the "your data never leaves your device" claim
 * checkable: it shows exactly what is stored, how big it is, and offers a
 * one-click export and a one-click erase.
 */
export default function PrivacyPage() {
  const { t, language } = useI18n();
  const { user, backend, cloudEnabled, signOut, changePassword, deleteAccount } = useAuth();
  const { profiles, importJSON } = useProfiles();
  const toast = useToast();

  const isBangla = language === 'bn';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmErase, setConfirmErase] = useState(false);

  // Browser storage in use, so "delete my data" can show what it is deleting.
  const [offlineUsage, setOfflineUsage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStorageEstimate().then((estimate) => {
      if (!cancelled) setOfflineUsage(estimate ? formatBytes(estimate.usage) : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClearOffline = async () => {
    const cachesRemoved = await clearOfflineCache();
    const unregistered = await unregisterServiceWorker();
    if (cachesRemoved === 0 && !unregistered) {
      toast.info(t('privacy.offline.unavailable'));
      return;
    }
    setOfflineUsage(null);
    toast.success(t('privacy.offline.cleared'));
  };
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // One row per administered dose. Counting `records` keys instead would
  // under-report every multi-dose series (the map holds one slot per vaccine).
  const doseCount = profiles.reduce((total, profile) => total + (profile.events?.length ?? 0), 0);
  const usage = estimateStorageUsage();
  const usageKb = (usage.bytes / 1024).toFixed(usage.bytes < 10240 ? 1 : 0);
  const strength = newPassword ? assessPasswordStrength(newPassword) : null;

  const handleExport = () => {
    const stamp = todayISO();
    downloadJSON(`tikatrack-backup-${stamp}.json`, buildExport(profiles));
    toast.success(t('privacy.export'), t('common.actions.download'));
  };

  const handleImportFile = async (file: File) => {
    const raw = await file.text();
    const result = importJSON(raw);
    if (result.ok) {
      toast.success(t('tracker.import.merged', result.added, result.added + result.merged));
    } else {
      toast.error(t('tracker.import.invalid'), result.reason);
    }
  };

  const handleEraseLocal = () => {
    setConfirmErase(false);
    const removed = clearAllTikaTrackData();
    toast.success(t('tracker.danger.done'), t('common.label.results', removed));
    // Storage is gone; reload so every context re-initialises from an empty state
    // rather than holding stale in-memory copies.
    setTimeout(() => window.location.reload(), 600);
  };

  const handleDeleteAccount = async () => {
    setConfirmDeleteAccount(false);
    setBusy(true);
    try {
      await deleteAccount();
      toast.success(t('privacy.delete'), t('auth.signedOut'));
    } catch {
      toast.error(t('common.status.error'));
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.error.mismatch'));
      return;
    }
    setBusy(true);
    const result = await changePassword(currentPassword, newPassword);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success(t('privacy.password'), t('common.actions.save'));
  };

  return (
    <div className="page-shell max-w-4xl">
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className="eyebrow">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('nav.privacy')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('privacy.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('privacy.subtitle')}
        </p>
      </header>

      {/* --- Account ------------------------------------------------------- */}
      <section className="card-padded mt-8">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <UserCog className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('privacy.account')}
        </h2>

        {user ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt
                className={`text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('privacy.name')}
              </dt>
              <dd className="mt-1 font-medium text-neutral-900 dark:text-white">
                {user.full_name || '—'}
              </dd>
            </div>
            <div>
              <dt
                className={`text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('privacy.email')}
              </dt>
              <dd className="mt-1 break-all font-medium text-neutral-900 dark:text-white">
                {user.email}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <span className="status-inline text-neutral-700 dark:text-neutral-200">
                {backend === 'firebase' || backend === 'supabase' ? (
                  <Cloud className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                )}
                {backend === 'firebase'
                  ? t('auth.cloudMode', 'Google Cloud · Firebase')
                  : backend === 'supabase'
                    ? t('auth.cloudMode', getSupabaseProjectLabel())
                    : t('auth.localMode')}
              </span>
            </div>
          </dl>
        ) : (
          <p
            className={`mt-3 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('auth.optional.body')}
          </p>
        )}

        {backend === 'local' && user && (
          <p
            className={`mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('auth.localAccountNotice')}
          </p>
        )}
      </section>

      {/* --- Appearance & Themes ------------------------------------------ */}
      <ThemeAppearanceCard />

      {/* --- Data ---------------------------------------------------------- */}
      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}
        >
          <Database className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
          {t('privacy.data')}
        </h2>

        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--tt-border)] bg-[var(--tt-border)]">
          {[
            { label: t('tracker.title'), value: String(profiles.length) },
            { label: t('tracker.stats.doses'), value: String(doseCount) },
            { label: t('tracker.stats.storageKeys'), value: String(usage.keys) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--tt-card)] p-3.5 sm:p-4">
              <dd className="text-xl font-bold tabular-nums text-[var(--tt-accent)]">
                {value}
              </dd>
              <dt
                className={`mt-1 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase ${isBangla ? 'font-bangla' : ''}`}
              >
                {label}
              </dt>
            </div>
          ))}
        </dl>

        <p
          className={`mt-4 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('tracker.storage.usage', `${usageKb} KB`)} — {t('privacy.exportDesc')}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('privacy.export')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t('common.actions.import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              // Resetting lets the same file be chosen twice in a row.
              event.target.value = '';
            }}
          />
        </div>

        <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <h3
            className={`flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('tracker.danger.title')}
          </h3>
          <p
            className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.danger.body')}
          </p>
          <button type="button" className="btn-danger mt-4" onClick={() => setConfirmErase(true)}>
            {t('tracker.danger.button')}
          </button>
        </div>
      </section>

      {/* --- Security ------------------------------------------------------ */}
      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('privacy.security')}
        </h2>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p
              className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('privacy.sessions')}
            </p>
            <p className={`mt-1 ${isBangla ? 'font-bangla' : ''}`}>
              {cloudEnabled ? t('common.data.cloudSync') : t('common.data.localOnly')}
            </p>
          </div>
        </div>

        {user && backend !== 'firebase' && (
          <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={handleChangePassword}>
            <div>
              <label className="label" htmlFor="current-password">
                {t('auth.password')}
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className="input-field"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-password">
                {t('privacy.newPassword')}
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="input-field"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              {strength && (
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('auth.passwordStrength')}:{' '}
                  <span className="font-semibold">{t(STRENGTH_KEYS[strength.label])}</span>
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">
                {t('privacy.confirmPassword')}
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="input-field"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 sm:col-span-3">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? t('common.status.loading') : t('privacy.save')}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  await signOut();
                  toast.info(t('auth.signedOut'));
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t('common.actions.signOut')}
              </button>
            </div>
          </form>
        )}

        {user && backend === 'firebase' && (
          <div className="mt-4">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={async () => {
                await signOut();
                toast.info(t('auth.signedOut'));
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t('common.actions.signOut')}
            </button>
          </div>
        )}

        {user && (
          <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
            <h3
              className={`font-semibold text-red-700 dark:text-red-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('privacy.delete')}
            </h3>
            <p
              className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('privacy.deleteWarning')}
            </p>
            <button
              type="button"
              className="btn-danger mt-4"
              disabled={busy}
              onClick={() => setConfirmDeleteAccount(true)}
            >
              {t('privacy.delete')}
            </button>
          </div>
        )}
      </section>

      {/* --- Sharing ------------------------------------------------------- */}
      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <ShieldCheck
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          {t('privacy.sharing')}
        </h2>
        <p
          className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('privacy.sharingDesc')}
        </p>
        <p
          className={`mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          {cloudEnabled
            ? t(
                'auth.cloudMode',
                backend === 'firebase' ? 'Google Cloud · Firebase' : getSupabaseProjectLabel(),
              )
            : t('auth.cloudNotConfigured')}
        </p>
      </section>

      {/* --- Offline copy -------------------------------------------------- */}
      <section className="card-padded mt-5">
        <h2
          className={`flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          <WifiOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t('privacy.offline.title')}
        </h2>
        <p
          className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('privacy.offline.body')}
        </p>
        <p
          className={`mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          {offlineUsage === null
            ? t('privacy.offline.usageUnknown')
            : t('privacy.offline.usage', offlineUsage)}
        </p>
        {isServiceWorkerSupported() && (
          <button
            type="button"
            className="btn-ghost btn-sm mt-3"
            onClick={() => void handleClearOffline()}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('privacy.offline.clear')}
          </button>
        )}
      </section>

      <ConfirmDialog
        open={confirmErase}
        title={t('tracker.danger.title')}
        description={t('tracker.danger.body')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={handleEraseLocal}
        onCancel={() => setConfirmErase(false)}
      />

      <ConfirmDialog
        open={confirmDeleteAccount}
        title={t('privacy.delete')}
        description={t('privacy.deleteWarning')}
        confirmLabel={t('privacy.delete')}
        cancelLabel={t('privacy.cancel')}
        tone="danger"
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => setConfirmDeleteAccount(false)}
      />
    </div>
  );
}
