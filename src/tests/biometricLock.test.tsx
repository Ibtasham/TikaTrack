import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import {
  _resetBiometricSessionForTests,
  base64UrlEncode,
  derToP1363Signature,
  enrollBiometricPasskey,
  enrollPinOnlyVault,
  getVaultSessionSnapshot,
  isPassportVaultLocked,
  loadBiometricVault,
  lockBiometricSession,
  parseAuthenticatorDataFlags,
  verifyAssertionData,
  verifyBackupPin,
  verifyBiometricUnlock,
} from '../lib/biometricLock';
import { issuePassport, loadPassports, upsertPassport } from '../lib/digitalPassport';
import { addDays, startOfToday, toISODate } from '../lib/format';
import { localSignUp } from '../lib/localAuth';
import { createProfile, recordDose } from '../lib/profileStore';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';

const en = translations.en;

function p1363ToDer(sig: Uint8Array): Uint8Array {
  const half = sig.length / 2;
  const trimInt = (slice: Uint8Array): Uint8Array => {
    let i = 0;
    while (i < slice.length - 1 && slice[i] === 0) i += 1;
    const trimmed = slice.subarray(i);
    if (trimmed[0] & 0x80) {
      const out = new Uint8Array(trimmed.length + 1);
      out[0] = 0;
      out.set(trimmed, 1);
      return out;
    }
    return trimmed;
  };
  const r = trimInt(sig.subarray(0, half));
  const s = trimInt(sig.subarray(half));
  const der = new Uint8Array(6 + r.length + s.length);
  der[0] = 0x30;
  der[1] = 4 + r.length + s.length;
  der[2] = 0x02;
  der[3] = r.length;
  der.set(r, 4);
  der[4 + r.length] = 0x02;
  der[5 + r.length] = s.length;
  der.set(s, 6 + r.length);
  return der;
}

async function buildSignedAssertion(params: {
  privateKey: CryptoKey;
  challengeB64: string;
  origin: string;
  rpId: string;
  flagsByte?: number;
}) {
  const clientJson = JSON.stringify({
    type: 'webauthn.get',
    challenge: params.challengeB64,
    origin: params.origin,
  });
  const clientDataJSON = new TextEncoder().encode(clientJson);
  const rpHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(params.rpId)),
  );
  const authData = new Uint8Array(37);
  authData.set(rpHash, 0);
  authData[32] = params.flagsByte ?? 0x05; // UP (0x01) + UV (0x04)
  authData[36] = 1; // signCount = 1

  const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataJSON));
  const signedBytes = new Uint8Array(authData.length + clientHash.length);
  signedBytes.set(authData, 0);
  signedBytes.set(clientHash, authData.length);

  const rawSig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, params.privateKey, signedBytes),
  );
  const derSig = p1363ToDer(rawSig);

  return { clientDataJSON, authData, derSig, rawSig };
}

async function seedPassportInStorage() {
  const dob = toISODate(addDays(startOfToday(), -240));
  const created = createProfile({
    name: 'Ayaan Rahman',
    dateOfBirth: dob,
    relationship: 'child',
    gender: 'male',
  });
  if (!created.profile) throw new Error('Expected test profile');
  const profiles = recordDose([created.profile], created.profile.id, 'bcg', {
    date: toISODate(addDays(startOfToday(), -230)),
    centre: 'Dhaka Medical College EPI',
    doseNumber: 1,
  });
  writeJSON(STORAGE_KEYS.profiles, profiles);

  const issued = await issuePassport({ profile: profiles[0] });
  if (!issued.passport) throw new Error('Expected passport');
  upsertPassport({
    id: issued.passport.id,
    profileId: profiles[0].id,
    memberName: issued.passport.memberName,
    dateOfBirth: issued.passport.dateOfBirth,
    issuedAt: issued.passport.issuedAt,
    payload: issued.passport.payload,
    algorithm: issued.passport.algorithm,
  });
  return profiles[0];
}

function installMockWebAuthn(keyPair: CryptoKeyPair, spkiB64: string, flagsByte = 0x05) {
  const credentialId = new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]);

  vi.stubGlobal('PublicKeyCredential', {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(async () => true),
  });

  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });

  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: {
      create: vi.fn(async () => ({
        id: base64UrlEncode(credentialId),
        rawId: credentialId.buffer,
        type: 'public-key',
        response: {
          getPublicKey: () => Uint8Array.from(atob(spkiB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)).buffer,
          getPublicKeyAlgorithm: () => -7,
        },
      })),
      get: vi.fn(async (options?: CredentialRequestOptions) => {
        const challenge = new Uint8Array((options?.publicKey?.challenge as ArrayBuffer) ?? new ArrayBuffer(32));
        const challengeB64 = base64UrlEncode(challenge);
        const rpId = options?.publicKey?.rpId || window.location.hostname || 'localhost';
        const signed = await buildSignedAssertion({
          privateKey: keyPair.privateKey,
          challengeB64,
          origin: window.location.origin,
          rpId,
          flagsByte,
        });
        return {
          id: base64UrlEncode(credentialId),
          rawId: credentialId.buffer,
          type: 'public-key',
          response: {
            clientDataJSON: signed.clientDataJSON.buffer,
            authenticatorData: signed.authData.buffer,
            signature: signed.derSig.buffer,
          },
        };
      }),
    },
  });
}

describe('WebAuthn Biometric Passport Lock', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    _resetBiometricSessionForTests();
    vi.restoreAllMocks();
  });

  it('converts ASN.1 DER ECDSA signatures to IEEE P1363 and parses authenticatorData flags', () => {
    const raw = new Uint8Array(64);
    raw[0] = 0x91; // high bit set so DER adds 0x00 padding
    raw[31] = 0x12;
    raw[32] = 0x84;
    raw[63] = 0x77;

    const der = p1363ToDer(raw);
    const roundTrip = derToP1363Signature(der, 32);
    expect(Array.from(roundTrip)).toEqual(Array.from(raw));

    const authData = new Uint8Array(37);
    authData[32] = 0x05; // UP + UV
    authData[36] = 42;
    const parsed = parseAuthenticatorDataFlags(authData);
    expect(parsed.userPresent).toBe(true);
    expect(parsed.userVerified).toBe(true);
    expect(parsed.signCount).toBe(42);
  });

  it('verifies valid ECDSA P-256 WebAuthn assertions and rejects tampered challenge, origin, rpIdHash, or missing UV flag', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );

    const challengeB64 = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    const signed = await buildSignedAssertion({
      privateKey: keyPair.privateKey,
      challengeB64,
      origin: 'https://tikatrack.app',
      rpId: 'tikatrack.app',
    });

    const validResult = await verifyAssertionData({
      clientDataJSON: signed.clientDataJSON,
      authenticatorData: signed.authData,
      signature: signed.derSig,
      expectedChallengeB64: challengeB64,
      expectedOrigin: 'https://tikatrack.app',
      expectedRpId: 'tikatrack.app',
      publicKeySpkiB64: spkiB64,
      algorithm: -7,
    });
    expect(validResult.valid).toBe(true);

    const badChallenge = await verifyAssertionData({
      clientDataJSON: signed.clientDataJSON,
      authenticatorData: signed.authData,
      signature: signed.derSig,
      expectedChallengeB64: 'different-challenge',
      expectedOrigin: 'https://tikatrack.app',
      expectedRpId: 'tikatrack.app',
      publicKeySpkiB64: spkiB64,
    });
    expect(badChallenge.valid).toBe(false);
    expect(badChallenge.reason).toBe('challenge-mismatch');

    const badOrigin = await verifyAssertionData({
      clientDataJSON: signed.clientDataJSON,
      authenticatorData: signed.authData,
      signature: signed.derSig,
      expectedChallengeB64: challengeB64,
      expectedOrigin: 'https://evil.example',
      expectedRpId: 'tikatrack.app',
      publicKeySpkiB64: spkiB64,
    });
    expect(badOrigin.valid).toBe(false);
    expect(badOrigin.reason).toBe('origin-mismatch');

    const badRp = await verifyAssertionData({
      clientDataJSON: signed.clientDataJSON,
      authenticatorData: signed.authData,
      signature: signed.derSig,
      expectedChallengeB64: challengeB64,
      expectedOrigin: 'https://tikatrack.app',
      expectedRpId: 'other-domain.app',
      publicKeySpkiB64: spkiB64,
    });
    expect(badRp.valid).toBe(false);
    expect(badRp.reason).toBe('rpid-mismatch');

    const noUvSigned = await buildSignedAssertion({
      privateKey: keyPair.privateKey,
      challengeB64,
      origin: 'https://tikatrack.app',
      rpId: 'tikatrack.app',
      flagsByte: 0x01, // UP only, missing UV
    });
    const noUv = await verifyAssertionData({
      clientDataJSON: noUvSigned.clientDataJSON,
      authenticatorData: noUvSigned.authData,
      signature: noUvSigned.derSig,
      expectedChallengeB64: challengeB64,
      expectedOrigin: 'https://tikatrack.app',
      expectedRpId: 'tikatrack.app',
      publicKeySpkiB64: spkiB64,
    });
    expect(noUv.valid).toBe(false);
    expect(noUv.reason).toBe('user-verification-missing');

    const tamperedSig = new Uint8Array(signed.derSig);
    tamperedSig[tamperedSig.length - 1] ^= 0xff;
    const badSig = await verifyAssertionData({
      clientDataJSON: signed.clientDataJSON,
      authenticatorData: signed.authData,
      signature: tamperedSig,
      expectedChallengeB64: challengeB64,
      expectedOrigin: 'https://tikatrack.app',
      expectedRpId: 'tikatrack.app',
      publicKeySpkiB64: spkiB64,
    });
    expect(badSig.valid).toBe(false);
    expect(badSig.reason).toBe('signature-invalid');
  });

  it('enforces PBKDF2-SHA256 6-digit PIN verification and rate-limits after 5 failures', async () => {
    const enrolled = await enrollPinOnlyVault({
      pin: '246810',
      deviceLabel: 'Test Phone',
      autoLock: 'immediate',
    });
    expect(enrolled.ok).toBe(true);
    expect(loadBiometricVault()?.pinHashB64).toBeTruthy();
    expect(loadBiometricVault()?.pinHashB64).not.toContain('246810');

    lockBiometricSession();
    expect(isPassportVaultLocked()).toBe(true);

    const unlockOk = await verifyBackupPin('246810');
    expect(unlockOk.ok).toBe(true);
    expect(isPassportVaultLocked()).toBe(false);

    lockBiometricSession();
    for (let i = 0; i < 4; i += 1) {
      const fail = await verifyBackupPin('000000');
      expect(fail.ok).toBe(false);
      if (!fail.ok) expect(fail.errorCode).toBe('invalid-pin');
    }
    const fifth = await verifyBackupPin('000000');
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) {
      expect(fifth.errorCode).toBe('pin-cooldown');
      expect(fifth.cooldownSeconds).toBeGreaterThan(0);
    }
  });

  it('enrolls platform passkey, locks session, unlocks via WebAuthn assertion, and handles user cancellation', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );
    installMockWebAuthn(keyPair, spkiB64);

    const enrolled = await enrollBiometricPasskey({
      displayName: 'Ayaan Rahman',
      deviceLabel: 'Pixel 8 Pro',
      fallbackPin: '135790',
    });
    expect(enrolled.ok).toBe(true);
    expect(isPassportVaultLocked()).toBe(false);

    lockBiometricSession();
    expect(isPassportVaultLocked()).toBe(true);

    const unlocked = await verifyBiometricUnlock();
    expect(unlocked.ok).toBe(true);
    expect(isPassportVaultLocked()).toBe(false);

    lockBiometricSession();
    vi.spyOn(navigator.credentials, 'get').mockRejectedValueOnce(
      new DOMException('User cancelled prompt', 'NotAllowedError'),
    );
    const cancelled = await verifyBiometricUnlock();
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.errorCode).toBe('cancelled');
    expect(isPassportVaultLocked()).toBe(true);
  });

  it('gates PassportPage QR certificate behind PassportLockGate and unlocks via Face ID / Fingerprint', async () => {
    const user = userEvent.setup();
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );
    installMockWebAuthn(keyPair, spkiB64);

    await seedPassportInStorage();

    window.history.pushState({}, '', '/passport');
    render(<App />);

    // Initially unenrolled -> certificate is visible and Enable Biometric Lock is shown
    expect(
      await screen.findByRole('button', { name: en['passport.download.passportPdf'] }),
    ).toBeTruthy();
    const enableBtn = await screen.findByRole('button', {
      name: en['passport.biometric.enablePasskey'],
    });
    await user.click(enableBtn);

    // Enrolled -> Lock Passport button appears (both in quick header & security card)
    const lockBtns = await screen.findAllByRole('button', {
      name: en['passport.biometric.lockNow'],
    });
    expect(lockBtns.length).toBeGreaterThanOrEqual(1);
    await user.click(lockBtns[0]);

    // Locked -> gate replaces QR certificate and moves first on mobile screens
    const gate = await screen.findByTestId('passport-lock-gate');
    expect(gate).toBeTruthy();
    expect(gate.parentElement?.className).toContain('order-first');
    expect(screen.queryByRole('button', { name: en['passport.download.passportPdf'] })).toBeNull();

    // Unlock with biometrics -> certificate & PDF download return
    const unlockBtn = screen.getByRole('button', {
      name: en['passport.biometric.gateUnlock'],
    });
    await user.click(unlockBtn);

    expect(
      await screen.findByRole('button', { name: en['passport.download.passportPdf'] }),
    ).toBeTruthy();
    expect(screen.queryByTestId('passport-lock-gate')).toBeNull();
  });

  it('allows resetting locked vault with ConfirmDialog and clears issued QR cache safely', async () => {
    const user = userEvent.setup();
    await seedPassportInStorage();
    expect(loadPassports()).toHaveLength(1);

    await enrollPinOnlyVault({ pin: '998877', deviceLabel: 'iPhone 15' });
    lockBiometricSession();

    window.history.pushState({}, '', '/passport');
    render(<App />);

    expect(await screen.findByTestId('passport-lock-gate')).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: en['passport.biometric.gateReset'] }),
    );
    await user.click(
      await screen.findByRole('button', { name: en['passport.biometric.resetConfirm'] }),
    );

    await waitFor(() => {
      expect(loadPassports()).toHaveLength(0);
      expect(loadBiometricVault()).toBeNull();
    });
  });

  it('offers 1-tap biometric passport unlock card on /auth when a passkey is enrolled', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );
    installMockWebAuthn(keyPair, spkiB64);

    await enrollBiometricPasskey({ deviceLabel: 'Pixel 9' });
    lockBiometricSession();

    window.history.pushState({}, '', '/auth');
    render(<App />);

    expect(
      await screen.findByRole('button', { name: en['auth.biometric.unlockPassport'] }),
    ).toBeTruthy();
  });

  it('rejects malformed/truncated ASN.1 DER signatures and clears stale memory sessions on storage wipe', async () => {
    // Truncated r length
    expect(() =>
      derToP1363Signature(new Uint8Array([0x30, 0x08, 0x02, 0x20, 0x01, 0x02, 0x03, 0x04]), 32),
    ).toThrow(/Invalid DER integer r bounds/);

    // Truncated s length
    expect(() =>
      derToP1363Signature(
        new Uint8Array([0x30, 0x08, 0x02, 0x02, 0x01, 0x02, 0x02, 0x20, 0x03]),
        32,
      ),
    ).toThrow(/Invalid DER integer s bounds/);

    // Enroll PIN vault (unlocks activeSession in memory), then wipe storage externally
    const enrolled = await enrollPinOnlyVault({ pin: '112233', deviceLabel: 'Wipe Test' });
    expect(enrolled.ok).toBe(true);
    expect(getVaultSessionSnapshot().unlocked).toBe(true);

    localStorage.clear();
    expect(getVaultSessionSnapshot().enrolled).toBe(false);
    expect(isPassportVaultLocked()).toBe(false);

    // Re-enroll another vault and verify previous in-memory session does not bleed across
    await enrollPinOnlyVault({ pin: '445566', deviceLabel: 'Fresh Vault' });
    lockBiometricSession();
    expect(isPassportVaultLocked()).toBe(true);
  });

  it('detects iframe-blocked WebAuthn errors and exposes inline 6-digit PIN enrollment fallback on /passport', async () => {
    const user = userEvent.setup();
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );
    installMockWebAuthn(keyPair, spkiB64);

    vi.spyOn(navigator.credentials, 'create').mockRejectedValueOnce(
      new DOMException(
        "The 'publickey-credentials-create' feature is not enabled in this document by permissions policy.",
        'NotAllowedError',
      ),
    );

    await seedPassportInStorage();
    window.history.pushState({}, '', '/passport');
    render(<App />);

    const enablePasskeyBtn = await screen.findByRole('button', {
      name: en['passport.biometric.enablePasskey'],
    });
    await user.click(enablePasskeyBtn);

    expect(await screen.findByText(en['passport.biometric.error.iframeBlocked'])).toBeTruthy();

    const pinButton = await screen.findByRole('button', {
      name: en['passport.biometric.enablePinOnly'],
    });
    expect((pinButton as HTMLButtonElement).disabled).toBe(true);

    const pinInput = screen.getByLabelText(en['passport.biometric.pinOnlyLabel']);
    await user.type(pinInput, '654321');
    expect((pinButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(pinButton);
    await waitFor(() => {
      expect(loadBiometricVault()?.mode).toBe('pin-only');
    });
  });

  it('surfaces biometric unlock errors visibly via toast when signed in on /auth', async () => {
    const user = userEvent.setup();
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const spkiB64 = base64UrlEncode(
      new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey)),
    );
    installMockWebAuthn(keyPair, spkiB64);

    await localSignUp('parent@example.com', 'SafePass123!', 'Parent User');
    await enrollBiometricPasskey({ deviceLabel: 'Pixel 9' });
    lockBiometricSession();

    vi.spyOn(navigator.credentials, 'get').mockRejectedValueOnce(
      new DOMException('Permissions Policy blocked credentials', 'NotAllowedError'),
    );

    window.history.pushState({}, '', '/auth');
    render(<App />);

    const unlockBtn = await screen.findByRole('button', {
      name: en['auth.biometric.unlockPassport'],
    });
    await user.click(unlockBtn);

    expect(await screen.findByText(en['passport.biometric.error.iframeBlocked'])).toBeTruthy();
  });
});
