import { useEffect, useState } from 'react';
import {
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  Unlock,
} from 'lucide-react';

import { ConfirmDialog } from './ui/ConfirmDialog';
import { useOptionalToast } from '../contexts/ToastContext';
import { useBiometricVaultState } from '../hooks';
import { useI18n } from '../i18n';
import {
  enrollBiometricPasskey,
  enrollPinOnlyVault,
  inferDefaultDeviceLabel,
  isValidPin,
  lockBiometricSession,
  removeBiometricVault,
  updateAutoLockPolicy,
  verifyBackupPin,
  verifyBiometricUnlock,
  type AutoLockPolicy,
  type BiometricActionResult,
  type BiometricErrorCode,
} from '../lib/biometricLock';
import { formatDate } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

function describeError(
  t: (key: string, ...args: Array<string | number>) => string,
  code: BiometricErrorCode,
  cooldownSeconds?: number,
): string {
  switch (code) {
    case 'cancelled':
      return t('passport.biometric.error.cancelled');
    case 'iframe-blocked':
      return t('passport.biometric.error.iframeBlocked');
    case 'unsupported':
      return t('passport.biometric.error.unsupported');
    case 'insecure-context':
      return t('passport.biometric.error.insecure');
    case 'verification-failed':
      return t('passport.biometric.error.verificationFailed');
    case 'invalid-pin':
      return t('passport.biometric.error.invalidPin');
    case 'pin-cooldown':
      return t('passport.biometric.error.cooldown', cooldownSeconds ?? 30);
    default:
      return t('passport.biometric.error.generic');
  }
}

export interface PassportSecurityCardProps {
  memberDisplayName?: string;
}

/**
 * Compact security management panel for `/passport` allowing mobile users to
 * enroll WebAuthn Platform Passkeys (Face ID / Touch ID / Fingerprint) or a
 * salted 6-digit backup PIN, adjust auto-lock timing, and lock on demand.
 */
export function PassportSecurityCard({ memberDisplayName }: PassportSecurityCardProps) {
  const { t, language } = useI18n();
  const toast = useOptionalToast();
  const isBangla = language === 'bn';
  const { snapshot, support } = useBiometricVaultState();

  const [deviceLabel, setDeviceLabel] = useState(() => inferDefaultDeviceLabel());
  const [pinInput, setPinInput] = useState('');
  const [autoLock, setAutoLock] = useState<AutoLockPolicy>('immediate');
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [forcePinFallback, setForcePinFallback] = useState(false);

  const canUseHardwarePasskey =
    Boolean(support?.isSecureContext) &&
    Boolean(support?.webAuthnSupported) &&
    Boolean(support?.platformAuthenticatorAvailable);

  const handleEnrollPasskey = async () => {
    setInlineError(null);
    if (pinInput.trim() && !isValidPin(pinInput)) {
      setInlineError(t('passport.biometric.error.invalidPin'));
      return;
    }
    setBusy(true);
    const result = await enrollBiometricPasskey({
      displayName: memberDisplayName,
      deviceLabel,
      fallbackPin: pinInput.trim() || undefined,
      autoLock,
    });
    setBusy(false);

    if (!result.ok) {
      if (result.errorCode === 'iframe-blocked' || result.errorCode === 'unsupported') {
        setForcePinFallback(true);
      }
      setInlineError(describeError(t, result.errorCode, result.cooldownSeconds));
      return;
    }
    setForcePinFallback(false);
    setPinInput('');
    triggerHaptic('success');
    toast?.success(t('passport.biometric.enrolledToast'));
  };

  const handleEnrollPinOnly = async () => {
    setInlineError(null);
    if (!isValidPin(pinInput)) {
      setInlineError(t('passport.biometric.error.invalidPin'));
      return;
    }
    setBusy(true);
    const result = await enrollPinOnlyVault({
      pin: pinInput,
      deviceLabel,
      autoLock,
    });
    setBusy(false);

    if (!result.ok) {
      setInlineError(describeError(t, result.errorCode, result.cooldownSeconds));
      return;
    }
    setPinInput('');
    triggerHaptic('success');
    toast?.success(t('passport.biometric.enrolledToast'));
  };

  const handleVerifyAgain = async () => {
    setInlineError(null);
    setBusy(true);
    const result = await verifyBiometricUnlock();
    setBusy(false);
    if (!result.ok) {
      setInlineError(describeError(t, result.errorCode, result.cooldownSeconds));
      return;
    }
    triggerHaptic('success');
    toast?.success(t('passport.biometric.unlockedToast'));
  };

  const statusBadge = !snapshot.enrolled ? (
    <span className="badge-neutral">{t('passport.biometric.status.off')}</span>
  ) : snapshot.unlocked ? (
    <span className="badge-done">{t('passport.biometric.status.protected')}</span>
  ) : (
    <span className="badge-due">{t('passport.biometric.status.locked')}</span>
  );

  return (
    <section
      aria-labelledby="biometric-security-heading"
      className="card-padded mt-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="biometric-security-heading"
            className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Fingerprint
              className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span>{t('passport.biometric.title')}</span>
          </h2>
          <p
            className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('passport.biometric.subtitle')}
          </p>
        </div>
        {statusBadge}
      </div>

      {!snapshot.enrolled ? (
        <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {support && (
            <p
              className={`flex items-center gap-2 text-xs font-medium ${
                canUseHardwarePasskey
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-300'
              } ${isBangla ? 'font-bangla' : ''}`}
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {!support.isSecureContext
                ? t('passport.biometric.insecureContext')
                : canUseHardwarePasskey
                  ? t('passport.biometric.supportedReady')
                  : t('passport.biometric.unsupportedPin')}
            </p>
          )}

          <div>
            <label className="label" htmlFor="biometric-device-label">
              {t('passport.biometric.deviceLabel')}
            </label>
            <input
              id="biometric-device-label"
              type="text"
              maxLength={48}
              className="input-field"
              placeholder={t('passport.biometric.devicePlaceholder')}
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="biometric-setup-pin">
              {canUseHardwarePasskey && !forcePinFallback
                ? t('passport.biometric.backupPinLabel')
                : t('passport.biometric.pinOnlyLabel')}
            </label>
            <input
              id="biometric-setup-pin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="off"
              className="input-field font-mono tracking-widest tabular-nums"
              placeholder={t('passport.biometric.backupPinPlaceholder')}
              value={pinInput}
              onChange={(event) => {
                setPinInput(event.target.value.replace(/\D/g, '').slice(0, 6));
                setInlineError(null);
              }}
            />
            <p
              className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('passport.biometric.pinHint')}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="biometric-setup-autolock">
              {t('passport.biometric.autoLockLabel')}
            </label>
            <select
              id="biometric-setup-autolock"
              className="input-field"
              value={autoLock}
              onChange={(event) => setAutoLock(event.target.value as AutoLockPolicy)}
            >
              <option value="immediate">{t('passport.biometric.autoLock.immediate')}</option>
              <option value="5m">{t('passport.biometric.autoLock.5m')}</option>
              <option value="15m">{t('passport.biometric.autoLock.15m')}</option>
              <option value="manual">{t('passport.biometric.autoLock.manual')}</option>
            </select>
          </div>

          {inlineError && (
            <p
              role="alert"
              className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
            >
              {inlineError}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            {canUseHardwarePasskey && (
              <button
                type="button"
                className="btn-primary whitespace-nowrap shrink-0"
                disabled={busy}
                onClick={() => void handleEnrollPasskey()}
              >
                <Fingerprint className="h-4 w-4" aria-hidden="true" />
                <span>{t('passport.biometric.enablePasskey')}</span>
              </button>
            )}
            {(!canUseHardwarePasskey || forcePinFallback) && (
              <button
                type="button"
                className={`${canUseHardwarePasskey ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap shrink-0`}
                disabled={busy || pinInput.length !== 6}
                onClick={() => void handleEnrollPinOnly()}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>{t('passport.biometric.enablePinOnly')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <div className="surface-subtle flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {snapshot.config?.deviceLabel}
            </span>
            {snapshot.config?.lastVerifiedAt && (
              <span className="text-neutral-500 tabular-nums dark:text-neutral-400">
                {t(
                  'passport.biometric.lastVerified',
                  formatDate(snapshot.config.lastVerifiedAt, language),
                )}
              </span>
            )}
          </div>

          {snapshot.unlocked ? (
            <>
              <div>
                <label className="label" htmlFor="biometric-autolock">
                  {t('passport.biometric.autoLockLabel')}
                </label>
                <select
                  id="biometric-autolock"
                  className="input-field"
                  value={snapshot.config?.autoLock ?? 'immediate'}
                  onChange={(event) => {
                    updateAutoLockPolicy(event.target.value as AutoLockPolicy);
                    toast?.info(t('common.actions.save'));
                  }}
                >
                  <option value="immediate">{t('passport.biometric.autoLock.immediate')}</option>
                  <option value="5m">{t('passport.biometric.autoLock.5m')}</option>
                  <option value="15m">{t('passport.biometric.autoLock.15m')}</option>
                  <option value="manual">{t('passport.biometric.autoLock.manual')}</option>
                </select>
              </div>

              {inlineError && (
                <p
                  role="alert"
                  className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {inlineError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                  onClick={() => {
                    lockBiometricSession();
                    toast?.info(t('passport.biometric.lockedToast'));
                  }}
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('passport.biometric.lockNow')}</span>
                </button>
                {snapshot.config?.mode === 'webauthn' && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm whitespace-nowrap shrink-0"
                    disabled={busy}
                    onClick={() => void handleVerifyAgain()}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('passport.biometric.testVerify')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
                  onClick={() => setConfirmDisable(true)}
                >
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('passport.biometric.disable')}</span>
                </button>
              </div>
            </>
          ) : (
            <p
              className={`text-xs text-amber-800 dark:text-amber-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('passport.biometric.lockedBanner')}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDisable}
        title={t('passport.biometric.disableTitle')}
        description={t('passport.biometric.disableBody')}
        confirmLabel={t('passport.biometric.disableConfirm')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={() => {
          removeBiometricVault({ clearIssuedPassports: false });
          setConfirmDisable(false);
          toast?.info(t('passport.biometric.removedToast'));
        }}
        onCancel={() => setConfirmDisable(false)}
      />
    </section>
  );
}

export interface PassportLockGateProps {
  onPassportsCleared?: () => void;
}

/**
 * Full certificate privacy gate displayed in place of the QR SVG, holder DOB,
 * immunization ledger, and export controls whenever the biometric vault is locked.
 */
export function PassportLockGate({ onPassportsCleared }: PassportLockGateProps) {
  const { t, language } = useI18n();
  const toast = useOptionalToast();
  const isBangla = language === 'bn';
  const { snapshot } = useBiometricVaultState();

  const [busy, setBusy] = useState(false);
  const [showPinForm, setShowPinForm] = useState(() => snapshot.config?.mode === 'pin-only');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (snapshot.config?.mode === 'pin-only') {
      setShowPinForm(true);
    }
  }, [snapshot.config?.mode]);

  const hasWebAuthn = snapshot.config?.mode === 'webauthn';
  const hasPin = Boolean(snapshot.config?.pinHashB64 && snapshot.config?.pinSaltB64);

  const handleActionResult = (result: BiometricActionResult) => {
    if (result.ok) {
      setError(null);
      setPin('');
      triggerHaptic('success');
      toast?.success(t('passport.biometric.unlockedToast'));
      return;
    }
    if (result.errorCode === 'invalid-pin') {
      setError(
        isValidPin(pin)
          ? t('passport.biometric.error.pinMismatch')
          : t('passport.biometric.error.invalidPin'),
      );
      return;
    }
    if (result.errorCode === 'iframe-blocked' && hasPin) {
      setShowPinForm(true);
    }
    setError(describeError(t, result.errorCode, result.cooldownSeconds));
  };

  const handleBiometricUnlock = async () => {
    setError(null);
    setBusy(true);
    const result = await verifyBiometricUnlock();
    setBusy(false);
    handleActionResult(result);
  };

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await verifyBackupPin(pin);
    setBusy(false);
    handleActionResult(result);
  };

  return (
    <div
      data-testid="passport-lock-gate"
      className="card-padded flex min-h-80 flex-col justify-between border-emerald-200/80 dark:border-emerald-900/60"
    >
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                className={`text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('passport.biometric.gateTitle')}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {snapshot.config?.deviceLabel}
              </p>
            </div>
          </div>
          <span className="badge-due">{t('passport.biometric.status.locked')}</span>
        </div>

        <p
          className={`mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('passport.biometric.gateBody')}
        </p>

        {/* Masked preview skeleton so layout preserves passport card footprint without revealing PHI */}
        <div
          aria-hidden="true"
          className="surface-subtle mt-5 grid grid-cols-[minmax(0,1fr)_84px] items-center gap-4 p-4 select-none"
        >
          <div className="space-y-2.5">
            <div className="h-3.5 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-48 rounded bg-neutral-200/75 dark:bg-neutral-800/80" />
            <div className="h-3 w-28 rounded bg-neutral-200/75 dark:bg-neutral-800/80" />
          </div>
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <ShieldCheck className="h-6 w-6 text-neutral-300 dark:text-neutral-600" />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className={`mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
          >
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {hasWebAuthn && (
            <button
              type="button"
              className="btn-primary w-full whitespace-nowrap shrink-0"
              disabled={busy}
              onClick={() => void handleBiometricUnlock()}
            >
              <Unlock className="h-4 w-4" aria-hidden="true" />
              <span>{t('passport.biometric.gateUnlock')}</span>
            </button>
          )}

          {hasPin && !showPinForm && (
            <button
              type="button"
              className="btn-secondary w-full whitespace-nowrap shrink-0"
              onClick={() => setShowPinForm(true)}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>{t('passport.biometric.gateUsePin')}</span>
            </button>
          )}

          {hasPin && showPinForm && (
            <form
              onSubmit={(event) => void handlePinSubmit(event)}
              className="surface-subtle space-y-3 p-3.5"
            >
              <label className="label mb-1" htmlFor="passport-unlock-pin">
                {t('passport.biometric.gateUsePin')}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="passport-unlock-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="off"
                  className="input-field min-w-0 flex-1 font-mono tracking-widest tabular-nums"
                  placeholder={t('passport.biometric.gatePinPlaceholder')}
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary whitespace-nowrap shrink-0"
                  disabled={busy || pin.length !== 6}
                >
                  <Unlock className="h-4 w-4" aria-hidden="true" />
                  <span>{t('passport.biometric.gatePinSubmit')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <button
          type="button"
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
          onClick={() => setConfirmReset(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('passport.biometric.gateReset')}</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t('passport.biometric.resetTitle')}
        description={t('passport.biometric.resetBody')}
        confirmLabel={t('passport.biometric.resetConfirm')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={() => {
          removeBiometricVault({ clearIssuedPassports: true });
          onPassportsCleared?.();
          setConfirmReset(false);
          toast?.info(t('passport.biometric.removedToast'));
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
