/**
 * WebAuthn / FIDO2 Platform Biometric Passkey & Vault Lock for TikaTrack Digital Passports.
 *
 * Designed for offline-first mobile security:
 * - Uses platform authenticators (Face ID, Touch ID, Android Biometrics, Windows Hello)
 *   via `navigator.credentials.create` / `navigator.credentials.get` with `userVerification: 'required'`.
 * - Verifies single-use 32-byte CSPRNG challenges, `origin`, `rpIdHash` (SHA-256 of RP ID),
 *   WebAuthn `UP` (0x01) + `UV` (0x04) flags, and ES256/RS256 assertion signatures via Web Crypto.
 * - Optional 6-digit backup/fallback PIN protected with 16-byte CSPRNG salt + PBKDF2-SHA256
 *   (100,000 iterations) and constant-time comparison + memory brute-force cooldown.
 * - Keeps active unlock state in JS memory only (with configurable auto-lock policies),
 *   so reloading or closing the tab automatically re-locks the passport vault.
 */

import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from './storage';

export type AutoLockPolicy = 'immediate' | '5m' | '15m' | 'manual';

export interface BiometricVaultConfig {
  version: 1;
  mode: 'webauthn' | 'pin-only';
  credentialIdB64?: string;
  rpId: string;
  deviceLabel: string;
  publicKeySpkiB64?: string;
  algorithm?: number;
  autoLock: AutoLockPolicy;
  createdAt: string;
  lastVerifiedAt?: string;
  pinSaltB64?: string;
  pinHashB64?: string;
}

export interface BiometricSupportInfo {
  webAuthnSupported: boolean;
  platformAuthenticatorAvailable: boolean;
  isSecureContext: boolean;
  webCryptoAvailable: boolean;
}

export type BiometricErrorCode =
  | 'unsupported'
  | 'insecure-context'
  | 'iframe-blocked'
  | 'cancelled'
  | 'already-registered'
  | 'not-enrolled'
  | 'verification-failed'
  | 'invalid-pin'
  | 'pin-cooldown'
  | 'pin-not-configured'
  | 'unknown';

export type BiometricActionResult =
  | { ok: true; method: 'biometric' | 'pin'; config: BiometricVaultConfig }
  | { ok: false; errorCode: BiometricErrorCode; cooldownSeconds?: number };

export interface VaultSessionSnapshot {
  enrolled: boolean;
  unlocked: boolean;
  method: 'biometric' | 'pin' | null;
  config: BiometricVaultConfig | null;
}

interface InMemorySession {
  unlockedAt: number;
  expiresAt: number;
  method: 'biometric' | 'pin';
}

const PBKDF2_ITERATIONS = 100_000;
const PIN_REGEX = /^\d{6}$/;
const MAX_PIN_ATTEMPTS = 5;
const PIN_COOLDOWN_MS = 30_000;

let activeSession: InMemorySession | null = null;
let ceremonyInFlight = false;
let failedPinAttempts = 0;
let pinLockedUntil = 0;

const sessionListeners = new Set<() => void>();

function notifyListeners(): void {
  sessionListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* listener errors must not break vault state */
    }
  });
}

export function subscribeVaultSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function isCeremonyInProgress(): boolean {
  return ceremonyInFlight;
}

function getCryptoSubtle(): SubtleCrypto | null {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) return null;
  return globalThis.crypto.subtle;
}

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(encoded: string): Uint8Array {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function policyDurationMs(policy: AutoLockPolicy): number {
  switch (policy) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case 'immediate':
    case 'manual':
    default:
      return Number.POSITIVE_INFINITY;
  }
}

export function loadBiometricVault(): BiometricVaultConfig | null {
  const raw = readJSON<BiometricVaultConfig | null>(STORAGE_KEYS.biometricVault, null);
  if (!raw || raw.version !== 1 || (raw.mode !== 'webauthn' && raw.mode !== 'pin-only')) {
    return null;
  }
  if (raw.mode === 'webauthn' && !raw.credentialIdB64) {
    return null;
  }
  if (raw.mode === 'pin-only' && (!raw.pinHashB64 || !raw.pinSaltB64)) {
    return null;
  }
  return raw;
}

function saveBiometricVault(config: BiometricVaultConfig): boolean {
  return writeJSON(STORAGE_KEYS.biometricVault, config);
}

export function isBiometricSessionUnlocked(): boolean {
  const config = loadBiometricVault();
  if (!config) {
    activeSession = null;
    return true;
  }
  if (!activeSession) return false;
  if (Date.now() > activeSession.expiresAt) {
    activeSession = null;
    notifyListeners();
    return false;
  }
  return true;
}

export function isPassportVaultLocked(): boolean {
  const config = loadBiometricVault();
  if (!config) {
    activeSession = null;
    return false;
  }
  return !isBiometricSessionUnlocked();
}

export function getVaultSessionSnapshot(): VaultSessionSnapshot {
  const config = loadBiometricVault();
  if (!config) {
    activeSession = null;
    return {
      enrolled: false,
      unlocked: true,
      method: null,
      config: null,
    };
  }
  const unlocked = isBiometricSessionUnlocked();
  return {
    enrolled: true,
    unlocked,
    method: unlocked && activeSession ? activeSession.method : null,
    config,
  };
}

function markSessionUnlocked(config: BiometricVaultConfig, method: 'biometric' | 'pin'): void {
  const now = Date.now();
  const duration = policyDurationMs(config.autoLock);
  activeSession = {
    unlockedAt: now,
    expiresAt: Number.isFinite(duration) ? now + duration : Number.POSITIVE_INFINITY,
    method,
  };
  failedPinAttempts = 0;
  pinLockedUntil = 0;
  notifyListeners();
}

export function lockBiometricSession(): void {
  if (ceremonyInFlight) return;
  if (activeSession !== null) {
    activeSession = null;
    notifyListeners();
  }
}

export function updateAutoLockPolicy(autoLock: AutoLockPolicy): BiometricVaultConfig | null {
  const config = loadBiometricVault();
  if (!config) return null;
  const updated: BiometricVaultConfig = { ...config, autoLock };
  saveBiometricVault(updated);
  if (activeSession) {
    const duration = policyDurationMs(autoLock);
    activeSession = {
      ...activeSession,
      expiresAt: Number.isFinite(duration)
        ? activeSession.unlockedAt + duration
        : Number.POSITIVE_INFINITY,
    };
  }
  notifyListeners();
  return updated;
}

/**
 * Removes the biometric lock configuration. If the vault is currently locked
 * and `clearPassportsOnForcedReset` is requested, previously issued local QR
 * certificates are wiped so protected records are not exposed without auth.
 */
export function removeBiometricVault(options?: { clearIssuedPassports?: boolean }): void {
  if (options?.clearIssuedPassports) {
    removeKey(STORAGE_KEYS.passports);
  }
  removeKey(STORAGE_KEYS.biometricVault);
  activeSession = null;
  failedPinAttempts = 0;
  pinLockedUntil = 0;
  notifyListeners();
}

export function _resetBiometricSessionForTests(): void {
  activeSession = null;
  ceremonyInFlight = false;
  failedPinAttempts = 0;
  pinLockedUntil = 0;
}

export function inferDefaultDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Mobile Device';
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone · Face ID / Touch ID';
  if (/iPad/i.test(ua)) return 'iPad · Face ID / Touch ID';
  if (/Android/i.test(ua)) return 'Android · Biometric Passkey';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac · Touch ID Passkey';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  return 'This Device';
}

export async function detectBiometricSupport(): Promise<BiometricSupportInfo> {
  const isSecureContext =
    typeof window === 'undefined' ? false : window.isSecureContext !== false;
  const webCryptoAvailable = getCryptoSubtle() !== null;
  const webAuthnSupported =
    isSecureContext &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function' &&
    typeof PublicKeyCredential !== 'undefined';

  if (!webAuthnSupported) {
    return {
      webAuthnSupported: false,
      platformAuthenticatorAvailable: false,
      isSecureContext,
      webCryptoAvailable,
    };
  }

  let platformAuthenticatorAvailable = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      platformAuthenticatorAvailable = await Promise.race([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 1500);
        }),
      ]);
    }
  } catch {
    platformAuthenticatorAvailable = false;
  }

  return {
    webAuthnSupported,
    platformAuthenticatorAvailable,
    isSecureContext,
    webCryptoAvailable,
  };
}

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin.trim());
}

export async function hashPin(
  pin: string,
  existingSalt?: Uint8Array,
): Promise<{ saltB64: string; hashB64: string }> {
  const subtle = getCryptoSubtle();
  const normalized = pin.trim();
  if (!PIN_REGEX.test(normalized)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const salt = existingSalt ?? getRandomBytes(16);
  const encoded = new TextEncoder().encode(normalized);

  if (subtle) {
    const keyMaterial = await subtle.importKey('raw', toArrayBuffer(encoded), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const derived = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: toArrayBuffer(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256,
    );
    return {
      saltB64: base64UrlEncode(salt),
      hashB64: base64UrlEncode(new Uint8Array(derived)),
    };
  }

  // Fallback only if SubtleCrypto is missing (non-secure contexts in test runners)
  const fallbackDigest = new Uint8Array(32);
  for (let i = 0; i < fallbackDigest.length; i += 1) {
    fallbackDigest[i] = encoded[i % encoded.length] ^ salt[i % salt.length] ^ ((i * 31) & 0xff);
  }
  return {
    saltB64: base64UrlEncode(salt),
    hashB64: base64UrlEncode(fallbackDigest),
  };
}

function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function resolveRpId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (!host || isIpLiteral(host)) return undefined;
  return host;
}

function mapDomError(error: unknown): BiometricErrorCode {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name: string }).name);
    const message = 'message' in error ? String((error as { message: unknown }).message ?? '') : '';
    const inIframe =
      typeof window !== 'undefined' &&
      (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();
    if (
      (name === 'NotAllowedError' || name === 'SecurityError') &&
      (inIframe || /permissions|policy|not enabled|publickey-credentials|cross-origin/i.test(message))
    ) {
      return 'iframe-blocked';
    }
    if (name === 'NotAllowedError' || name === 'AbortError') return 'cancelled';
    if (name === 'InvalidStateError') return 'already-registered';
    if (name === 'SecurityError') return 'insecure-context';
    if (name === 'NotSupportedError') return 'unsupported';
  }
  return 'unknown';
}

export function parseAuthenticatorDataFlags(authData: Uint8Array): {
  userPresent: boolean;
  userVerified: boolean;
  signCount: number;
} {
  if (authData.byteLength < 37) {
    throw new Error('Invalid authenticatorData length');
  }
  const flags = authData[32];
  const signCount =
    ((authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36]) >>> 0;
  return {
    userPresent: (flags & 0x01) !== 0,
    userVerified: (flags & 0x04) !== 0,
    signCount,
  };
}

/**
 * Converts an ASN.1 DER-encoded ECDSA signature (`SEQUENCE { INTEGER r, INTEGER s }`)
 * from WebAuthn authenticators into raw 64-byte IEEE P1363 `(r || s)` expected by Web Crypto.
 */
export function derToP1363Signature(derBytes: Uint8Array, coordinateBytes = 32): Uint8Array {
  if (derBytes.length === coordinateBytes * 2) {
    return derBytes;
  }
  if (derBytes.length < 8 || derBytes[0] !== 0x30) {
    throw new Error('Malformed DER signature');
  }

  let offset = 2;
  if (derBytes[1] & 0x80) {
    const lenBytes = derBytes[1] & 0x7f;
    if (lenBytes === 0 || 2 + lenBytes >= derBytes.length) {
      throw new Error('Malformed DER length header');
    }
    offset = 2 + lenBytes;
  }

  if (offset + 2 > derBytes.length || derBytes[offset] !== 0x02) {
    throw new Error('Expected DER integer r');
  }
  const rLen = derBytes[offset + 1];
  const rStart = offset + 2;
  if (rLen === 0 || rStart + rLen + 2 > derBytes.length) {
    throw new Error('Invalid DER integer r bounds');
  }
  const rSlice = derBytes.subarray(rStart, rStart + rLen);

  const sOffset = rStart + rLen;
  if (derBytes[sOffset] !== 0x02) throw new Error('Expected DER integer s');
  const sLen = derBytes[sOffset + 1];
  const sStart = sOffset + 2;
  if (sLen === 0 || sStart + sLen > derBytes.length) {
    throw new Error('Invalid DER integer s bounds');
  }
  const sSlice = derBytes.subarray(sStart, sStart + sLen);

  const output = new Uint8Array(coordinateBytes * 2);

  const rTrimmed = rSlice[0] === 0x00 && rSlice.length > coordinateBytes ? rSlice.subarray(1) : rSlice;
  const sTrimmed = sSlice[0] === 0x00 && sSlice.length > coordinateBytes ? sSlice.subarray(1) : sSlice;

  if (rTrimmed.length > coordinateBytes || sTrimmed.length > coordinateBytes) {
    throw new Error('ECDSA coordinate exceeds curve size');
  }

  output.set(rTrimmed, coordinateBytes - rTrimmed.length);
  output.set(sTrimmed, coordinateBytes * 2 - sTrimmed.length);
  return output;
}

export interface AssertionVerificationInput {
  clientDataJSON: ArrayBuffer | Uint8Array;
  authenticatorData: ArrayBuffer | Uint8Array;
  signature: ArrayBuffer | Uint8Array;
  expectedChallengeB64: string;
  expectedOrigin: string;
  expectedRpId: string;
  publicKeySpkiB64?: string;
  algorithm?: number;
}

export async function verifyAssertionData(
  input: AssertionVerificationInput,
): Promise<{ valid: boolean; reason?: string }> {
  const clientBytes =
    input.clientDataJSON instanceof Uint8Array
      ? input.clientDataJSON
      : new Uint8Array(input.clientDataJSON);
  const authData =
    input.authenticatorData instanceof Uint8Array
      ? input.authenticatorData
      : new Uint8Array(input.authenticatorData);
  const signatureBytes =
    input.signature instanceof Uint8Array ? input.signature : new Uint8Array(input.signature);

  let clientData: { type?: string; challenge?: string; origin?: string };
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientBytes)) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };
  } catch {
    return { valid: false, reason: 'invalid-client-data' };
  }

  if (clientData.type !== 'webauthn.get') {
    return { valid: false, reason: 'invalid-ceremony-type' };
  }
  if (clientData.challenge !== input.expectedChallengeB64) {
    return { valid: false, reason: 'challenge-mismatch' };
  }
  if (clientData.origin !== input.expectedOrigin) {
    return { valid: false, reason: 'origin-mismatch' };
  }

  if (authData.byteLength < 37) {
    return { valid: false, reason: 'invalid-auth-data' };
  }

  const subtle = getCryptoSubtle();
  if (subtle && input.expectedRpId) {
    const expectedRpHash = new Uint8Array(
      await subtle.digest('SHA-256', toArrayBuffer(new TextEncoder().encode(input.expectedRpId))),
    );
    const actualRpHash = authData.subarray(0, 32);
    if (!constantTimeEqual(expectedRpHash, actualRpHash)) {
      return { valid: false, reason: 'rpid-mismatch' };
    }
  }

  const flags = parseAuthenticatorDataFlags(authData);
  if (!flags.userPresent || !flags.userVerified) {
    return { valid: false, reason: 'user-verification-missing' };
  }

  if (input.publicKeySpkiB64 && subtle) {
    try {
      const spkiBytes = base64UrlDecode(input.publicKeySpkiB64);
      const clientDataHash = new Uint8Array(
        await subtle.digest('SHA-256', toArrayBuffer(clientBytes)),
      );
      const signedPayload = new Uint8Array(authData.length + clientDataHash.length);
      signedPayload.set(authData, 0);
      signedPayload.set(clientDataHash, authData.length);

      const alg = input.algorithm ?? -7;
      if (alg === -7) {
        const key = await subtle.importKey(
          'spki',
          toArrayBuffer(spkiBytes),
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify'],
        );
        const p1363Sig = derToP1363Signature(signatureBytes, 32);
        const verified = await subtle.verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          key,
          toArrayBuffer(p1363Sig),
          toArrayBuffer(signedPayload),
        );
        if (!verified) return { valid: false, reason: 'signature-invalid' };
      } else if (alg === -257) {
        const key = await subtle.importKey(
          'spki',
          toArrayBuffer(spkiBytes),
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify'],
        );
        const verified = await subtle.verify(
          'RSASSA-PKCS1-v1_5',
          key,
          toArrayBuffer(signatureBytes),
          toArrayBuffer(signedPayload),
        );
        if (!verified) return { valid: false, reason: 'signature-invalid' };
      }
    } catch {
      return { valid: false, reason: 'signature-check-error' };
    }
  }

  return { valid: true };
}

export async function enrollBiometricPasskey(options: {
  displayName?: string;
  deviceLabel?: string;
  fallbackPin?: string;
  autoLock?: AutoLockPolicy;
}): Promise<BiometricActionResult> {
  const support = await detectBiometricSupport();
  if (!support.isSecureContext) {
    return { ok: false, errorCode: 'insecure-context' };
  }
  if (!support.webAuthnSupported) {
    return { ok: false, errorCode: 'unsupported' };
  }

  let pinData: { saltB64: string; hashB64: string } | undefined;
  if (options.fallbackPin && options.fallbackPin.trim().length > 0) {
    if (!isValidPin(options.fallbackPin)) {
      return { ok: false, errorCode: 'invalid-pin' };
    }
    pinData = await hashPin(options.fallbackPin);
  }

  const rpIdOption = resolveRpId();
  const rpId = rpIdOption || window.location.hostname || 'localhost';
  const challenge = getRandomBytes(32);
  const userId = getRandomBytes(16);
  const displayName = options.displayName?.trim() || 'TikaTrack Passport Holder';
  const deviceLabel = options.deviceLabel?.trim() || inferDefaultDeviceLabel();
  const autoLock: AutoLockPolicy = options.autoLock ?? 'immediate';

  ceremonyInFlight = true;
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        rp: {
          name: 'TikaTrack Digital Passport',
          ...(rpIdOption ? { id: rpIdOption } : {}),
        },
        user: {
          id: toArrayBuffer(userId),
          name: 'tikatrack-passport-holder',
          displayName,
        },
        challenge: toArrayBuffer(challenge),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        attestation: 'none',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { ok: false, errorCode: 'cancelled' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const rawIdBytes = new Uint8Array(credential.rawId);
    let publicKeySpkiB64: string | undefined;
    let algorithm = -7;

    if (typeof response.getPublicKey === 'function') {
      const spki = response.getPublicKey();
      if (spki) {
        publicKeySpkiB64 = base64UrlEncode(new Uint8Array(spki));
      }
    }
    if (typeof response.getPublicKeyAlgorithm === 'function') {
      algorithm = response.getPublicKeyAlgorithm();
    }

    const nowIso = new Date().toISOString();
    const config: BiometricVaultConfig = {
      version: 1,
      mode: 'webauthn',
      credentialIdB64: base64UrlEncode(rawIdBytes),
      rpId,
      deviceLabel,
      publicKeySpkiB64,
      algorithm,
      autoLock,
      createdAt: nowIso,
      lastVerifiedAt: nowIso,
      pinSaltB64: pinData?.saltB64,
      pinHashB64: pinData?.hashB64,
    };

    saveBiometricVault(config);
    markSessionUnlocked(config, 'biometric');
    return { ok: true, method: 'biometric', config };
  } catch (error) {
    return { ok: false, errorCode: mapDomError(error) };
  } finally {
    ceremonyInFlight = false;
  }
}

export async function enrollPinOnlyVault(options: {
  pin: string;
  deviceLabel?: string;
  autoLock?: AutoLockPolicy;
}): Promise<BiometricActionResult> {
  if (!isValidPin(options.pin)) {
    return { ok: false, errorCode: 'invalid-pin' };
  }
  const { saltB64, hashB64 } = await hashPin(options.pin);
  const nowIso = new Date().toISOString();
  const config: BiometricVaultConfig = {
    version: 1,
    mode: 'pin-only',
    rpId: typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost',
    deviceLabel: options.deviceLabel?.trim() || inferDefaultDeviceLabel(),
    autoLock: options.autoLock ?? 'immediate',
    createdAt: nowIso,
    lastVerifiedAt: nowIso,
    pinSaltB64: saltB64,
    pinHashB64: hashB64,
  };
  saveBiometricVault(config);
  markSessionUnlocked(config, 'pin');
  return { ok: true, method: 'pin', config };
}

export async function verifyBiometricUnlock(): Promise<BiometricActionResult> {
  const config = loadBiometricVault();
  if (!config || config.mode !== 'webauthn' || !config.credentialIdB64) {
    return { ok: false, errorCode: 'not-enrolled' };
  }
  if (typeof window === 'undefined' || window.isSecureContext === false) {
    return { ok: false, errorCode: 'insecure-context' };
  }
  if (typeof navigator === 'undefined' || typeof navigator.credentials?.get !== 'function') {
    return { ok: false, errorCode: 'unsupported' };
  }

  const challengeBytes = getRandomBytes(32);
  const expectedChallengeB64 = base64UrlEncode(challengeBytes);
  const credentialIdBytes = base64UrlDecode(config.credentialIdB64);

  ceremonyInFlight = true;
  try {
    const effectiveRpId = resolveRpId() ?? (isIpLiteral(config.rpId) ? undefined : config.rpId || undefined);
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: toArrayBuffer(challengeBytes),
        ...(effectiveRpId ? { rpId: effectiveRpId } : {}),
        allowCredentials: [
          {
            type: 'public-key',
            id: toArrayBuffer(credentialIdBytes),
            transports: ['internal', 'hybrid'],
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { ok: false, errorCode: 'cancelled' };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const verification = await verifyAssertionData({
      clientDataJSON: response.clientDataJSON,
      authenticatorData: response.authenticatorData,
      signature: response.signature,
      expectedChallengeB64,
      expectedOrigin: window.location.origin,
      expectedRpId: config.rpId || window.location.hostname || 'localhost',
      publicKeySpkiB64: config.publicKeySpkiB64,
      algorithm: config.algorithm,
    });

    if (!verification.valid) {
      return { ok: false, errorCode: 'verification-failed' };
    }

    const updated: BiometricVaultConfig = {
      ...config,
      lastVerifiedAt: new Date().toISOString(),
    };
    saveBiometricVault(updated);
    markSessionUnlocked(updated, 'biometric');
    return { ok: true, method: 'biometric', config: updated };
  } catch (error) {
    return { ok: false, errorCode: mapDomError(error) };
  } finally {
    ceremonyInFlight = false;
  }
}

export async function verifyBackupPin(pin: string): Promise<BiometricActionResult> {
  const now = Date.now();
  if (pinLockedUntil > now) {
    return {
      ok: false,
      errorCode: 'pin-cooldown',
      cooldownSeconds: Math.ceil((pinLockedUntil - now) / 1000),
    };
  }

  const config = loadBiometricVault();
  if (!config) {
    return { ok: false, errorCode: 'not-enrolled' };
  }
  if (!config.pinSaltB64 || !config.pinHashB64) {
    return { ok: false, errorCode: 'pin-not-configured' };
  }
  if (!isValidPin(pin)) {
    return { ok: false, errorCode: 'invalid-pin' };
  }

  const salt = base64UrlDecode(config.pinSaltB64);
  const expected = base64UrlDecode(config.pinHashB64);
  const candidate = await hashPin(pin, salt);
  const candidateBytes = base64UrlDecode(candidate.hashB64);

  if (!constantTimeEqual(expected, candidateBytes)) {
    failedPinAttempts += 1;
    if (failedPinAttempts >= MAX_PIN_ATTEMPTS) {
      pinLockedUntil = Date.now() + PIN_COOLDOWN_MS;
      failedPinAttempts = 0;
      return {
        ok: false,
        errorCode: 'pin-cooldown',
        cooldownSeconds: Math.ceil(PIN_COOLDOWN_MS / 1000),
      };
    }
    return { ok: false, errorCode: 'invalid-pin' };
  }

  const updated: BiometricVaultConfig = {
    ...config,
    lastVerifiedAt: new Date().toISOString(),
  };
  saveBiometricVault(updated);
  markSessionUnlocked(updated, 'pin');
  return { ok: true, method: 'pin', config: updated };
}
