/**
 * Digital vaccination passport.
 *
 * A "passport" is a compact, tamper-evident text payload that fits inside a QR
 * code. It is generated **on the device** and verified **on the device** — no
 * server, no account, no network call.
 *
 * ## Threat model (read this before "improving" the crypto)
 *
 * There is no signing authority in a static web app: any secret shipped in the
 * bundle is public, so this is **not** a forge-proof credential and the UI says
 * so explicitly. What it genuinely provides is:
 *
 *   1. **Integrity** — a scan error, a truncated screenshot or a hand-edited
 *      payload is detected and rejected.
 *   2. **Device binding** — the checksum is keyed with a per-device secret held
 *      in localStorage, so a certificate minted on one phone does not verify on
 *      another. That defeats the naive attack of pasting someone else's
 *      certificate into your own app, at the cost of an honest limitation the UI
 *      must disclose: clearing site data invalidates previously issued
 *      certificates.
 *
 * The payload is deliberately short so the symbol stays at a low QR version and
 * remains scannable off a cracked phone screen in daylight.
 */

import type { Profile } from '../types';
import { migrateLegacyRecords } from './doseLedger';
import { createId } from './id';
import { generateQR, qrToSVG, type QRCode } from './qr';
import {
  isStorageAvailable,
  readString,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  writeString,
} from './storage';

/**
 * Bumped whenever the payload layout changes.
 *
 * v2 adds the **dose number** to every encoded dose. v1 could only say "this
 * vaccine, on this date", so a certificate could not distinguish OPV-1 from
 * OPV-3 — with a dose-level ledger it must.
 */
export const PASSPORT_FORMAT_VERSION = 2;

/** Versions this build can still verify. Certificates already issued keep working. */
export const SUPPORTED_PASSPORT_FORMAT_VERSIONS: readonly number[] = [1, 2];

export const PAYLOAD_PREFIX = `TIKAPASS${PASSPORT_FORMAT_VERSION}`;

const FIELD_SEPARATOR = '|';
const RECORD_SEPARATOR = ',';
const VALUE_SEPARATOR = ':';
/** Encoded in place of a dose number the record never held. Never guessed. */
const UNKNOWN_DOSE = '?';

const MAX_NAME_LENGTH = 48;
const MAX_NOTE_LENGTH = 24;
const MAX_DOSES = 12;

export interface PassportDose {
  /** Vaccine identifier from `src/data`. */
  vaccineId: string;
  /**
   * 1-based position in the series, or `null` when the record does not say —
   * encoded as `?`. A migrated 2.x dose is usually `null`.
   */
  doseNumber: number | null;
  /** ISO date the dose was given (`YYYY-MM-DD`). */
  date: string;
  /** Free-text note, truncated to keep the QR symbol small. */
  note?: string;
}

export interface Passport {
  id: string;
  profileId: string;
  memberName: string;
  dateOfBirth: string;
  doses: PassportDose[];
  /**
   * Doses left out of the QR symbol because it would not fit (a full national
   * series is longer than 287 bytes allows). Not part of the signed payload —
   * it exists so the UI can say out loud that the code is not the whole record.
   */
  omittedDoses?: number;
  /** Doses in the ledger when this certificate was issued. */
  totalDoses?: number;
  /** ISO timestamp of when the certificate was generated. */
  issuedAt: string;
  /** Keyed checksum over every other field. */
  signature: string;
  /** Which checksum algorithm produced `signature`. */
  algorithm: SignatureAlgorithm;
  /** The exact string that was encoded into the QR code. */
  payload: string;
}

export type SignatureAlgorithm = 'hmac-sha256' | 'fnv1a-32';

export type PassportVerification =
  | { status: 'valid'; passport: Passport; warnings: PassportWarning[] }
  | { status: 'tampered'; reason: string }
  | { status: 'invalid'; reason: string }
  | { status: 'unsupported-version'; reason: string };

/** Caveats the UI should show next to a certificate. */
export type PassportWarning =
  | 'weak-algorithm'
  | 'no-key'
  /** Some doses did not fit in the symbol; the printed card and backup hold them. */
  | 'truncated'
  /** Free-text notes were dropped to make the symbol fit. */
  | 'notes-dropped';

export interface StoredPassport {
  id: string;
  profileId: string;
  memberName: string;
  dateOfBirth: string;
  issuedAt: string;
  payload: string;
  algorithm: SignatureAlgorithm;
  svg?: string;
  /** Carried so a stored certificate can still disclose what it left out. */
  omittedDoses?: number;
  totalDoses?: number;
}

// ---------------------------------------------------------------------------
// Device key
// ---------------------------------------------------------------------------

const DEVICE_KEY_STORAGE_KEY = `${STORAGE_PREFIX}device-key`;

/** Random base64url text. Avoids `crypto.randomUUID`, which insecure contexts lack. */
function randomToken(bytes = 24): string {
  const buffer = new Uint8Array(bytes);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < buffer.length; i += 1) buffer[i] = Math.floor(Math.random() * 256);
  }
  let binary = '';
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The per-device signing key, created once and stored in localStorage.
 *
 * Returns `null` when storage is unavailable (private browsing); callers surface
 * that as "this certificate cannot be verified later on this device".
 */
export function getDeviceKey(): string | null {
  if (!isStorageAvailable()) return null;
  const existing = readString(DEVICE_KEY_STORAGE_KEY, '');
  if (existing.length >= 16) return existing;
  const created = randomToken();
  writeString(DEVICE_KEY_STORAGE_KEY, created);
  return created;
}

// ---------------------------------------------------------------------------
// Checksums
// ---------------------------------------------------------------------------

function toBytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  return Uint8Array.from(unescape(encodeURIComponent(text)), (char) => char.charCodeAt(0));
}

function base64Url(buffer: Uint8Array): string {
  let binary = '';
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Length of an FNV-1a signature in base36, so `parsePassportPayload` can tell algorithms apart. */
const FNV_SIGNATURE_LENGTH = 7;

/**
 * FNV-1a (32-bit) rendered in base36. Used only where SubtleCrypto is
 * unavailable — that is, on plain `http://` origins other than localhost.
 */
function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (const byte of toBytes(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(36).padStart(FNV_SIGNATURE_LENGTH, '0').slice(-FNV_SIGNATURE_LENGTH);
}

async function hmacSha256(text: string, key: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const cryptoKey = await subtle.importKey(
      'raw',
      toBytes(key) as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signed = await subtle.sign('HMAC', cryptoKey, toBytes(text) as unknown as BufferSource);
    // 48 bits is ample for tamper detection and keeps the payload short.
    return base64Url(new Uint8Array(signed)).slice(0, 8);
  } catch {
    return null;
  }
}

/** Sign `payload`, preferring HMAC-SHA256 and falling back to FNV-1a. */
export async function signPayload(
  payload: string,
): Promise<{ signature: string; algorithm: SignatureAlgorithm }> {
  const key = getDeviceKey();
  if (key) {
    const signature = await hmacSha256(payload, key);
    if (signature) return { signature, algorithm: 'hmac-sha256' };
  }
  return { signature: fnv1a32(payload), algorithm: 'fnv1a-32' };
}

// ---------------------------------------------------------------------------
// Encoding / decoding
// ---------------------------------------------------------------------------

/** Strip anything that would corrupt the flat, separator-delimited payload. */
function sanitiseField(value: string, maxLength: number): string {
  return value
    .replace(/[\r\n|,:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isoDateOnly(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value ?? '').trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

/**
 * Every administered dose of a profile, oldest first, in certificate shape.
 *
 * Reads the **ledger**, so a three-dose series produces three entries — the 2.x
 * `records` map could only ever produce one per vaccine. A profile that somehow
 * still has only a legacy map (an in-memory object that never went through
 * `normaliseProfile`) is migrated on the fly rather than silently skipped.
 */
function normaliseDoses(profile: Profile): PassportDose[] {
  const events =
    profile.events && profile.events.length > 0
      ? profile.events
      : migrateLegacyRecords(profile.id, profile.records ?? {}).events;

  return (
    events
      .map((event) => ({
        vaccineId: sanitiseField(event.vaccineId, 32),
        doseNumber: event.doseNumber,
        date: isoDateOnly(event.date),
        note: event.notes ? sanitiseField(event.notes, MAX_NOTE_LENGTH) : undefined,
      }))
      .filter((dose) => dose.vaccineId.length > 0 && dose.date.length > 0)
      // Deterministic: two doses given on the same day keep a stable order.
      .sort((a, b) => a.date.localeCompare(b.date) || a.vaccineId.localeCompare(b.vaccineId))
      .slice(0, MAX_DOSES)
  );
}

/** How many doses the member has in total, including ones the QR cannot hold. */
function countLedgerDoses(profile: Profile): number {
  if (profile.events && profile.events.length > 0) return profile.events.length;
  return migrateLegacyRecords(profile.id, profile.records ?? {}).events.length;
}

/** The canonical, signable part of a certificate — everything but the checksum. */
function canonicalBody(input: {
  memberName: string;
  dateOfBirth: string;
  doses: PassportDose[];
  issuedAt: string;
}): string {
  const doses = input.doses
    .map((dose) =>
      [
        dose.vaccineId,
        // Always present, so a parser can read the fields positionally: a number
        // when the record knows it, `?` when it does not.
        dose.doseNumber === null || dose.doseNumber === undefined
          ? UNKNOWN_DOSE
          : String(dose.doseNumber),
        dose.date,
        dose.note ?? '',
      ]
        .filter((part) => part.length > 0)
        .join(VALUE_SEPARATOR),
    )
    .join(RECORD_SEPARATOR);

  return [
    PAYLOAD_PREFIX,
    sanitiseField(input.memberName, MAX_NAME_LENGTH),
    isoDateOnly(input.dateOfBirth),
    isoDateOnly(input.issuedAt),
    doses,
  ].join(FIELD_SEPARATOR);
}

export interface IssuePassportInput {
  profile: Profile;
  /** Override the issue time (used by tests). Defaults to now. */
  issuedAt?: string;
}

export interface IssuePassportResult {
  passport: Passport | null;
  /** Why issuing failed; absent on success. */
  error?: 'no-profile' | 'too-large';
  warnings: PassportWarning[];
  /** Doses in the member's ledger when the certificate was built. */
  totalDoses: number;
  /** Doses that did not fit in the symbol and are therefore not encoded. */
  omittedDoses: number;
  /** `true` when free-text notes were dropped to make the symbol fit. */
  notesDropped: boolean;
}

/** A dose with its note removed, for the "make it fit" pass. */
function stripNote(dose: PassportDose): PassportDose {
  return { vaccineId: dose.vaccineId, doseNumber: dose.doseNumber, date: dose.date };
}

/**
 * Build a signed certificate for a profile.
 *
 * A QR symbol at error-correction level M holds 287 bytes, and a full national
 * series with dose numbers does not fit. Rather than refuse the certificate, or
 * quietly drop rows, this tries the payload whole, then without free-text notes,
 * then with the most recent doses removed — and reports exactly what was left
 * out (`omittedDoses`, `notesDropped`, and the `truncated` / `notes-dropped`
 * warnings) so the UI can say the code is a summary and point at the printed
 * card and the JSON backup for the complete history.
 *
 * `error: 'too-large'` remains only as a defensive path: it would take a payload
 * that cannot fit even a single dose.
 */
export async function issuePassport({
  profile,
  issuedAt,
}: IssuePassportInput): Promise<IssuePassportResult> {
  if (!profile?.id) {
    return {
      passport: null,
      error: 'no-profile',
      warnings: [],
      totalDoses: 0,
      omittedDoses: 0,
      notesDropped: false,
    };
  }

  const warnings = new Set<PassportWarning>();
  const allDoses = normaliseDoses(profile);
  const totalDoses = countLedgerDoses(profile);
  const issued = issuedAt ?? new Date().toISOString();

  if (!getDeviceKey()) warnings.add('no-key');

  // Ordered from "everything" to "as little as it takes to fit".
  const attempts: Array<{ doses: PassportDose[]; notesDropped: boolean }> = [
    { doses: allDoses, notesDropped: false },
    { doses: allDoses.map(stripNote), notesDropped: true },
  ];
  for (let keep = allDoses.length - 1; keep >= 1; keep -= 1) {
    attempts.push({ doses: allDoses.slice(0, keep).map(stripNote), notesDropped: true });
  }

  for (const attempt of attempts) {
    const body = canonicalBody({
      memberName: profile.name,
      dateOfBirth: profile.dateOfBirth,
      doses: attempt.doses,
      issuedAt: issued,
    });
    const { signature, algorithm } = await signPayload(body);
    const payload = `${body}${FIELD_SEPARATOR}${signature}`;

    // Fail here rather than at render time so the UI can explain why.
    let fits = true;
    try {
      generateQR(payload);
    } catch {
      fits = false;
    }
    if (!fits) continue;

    if (algorithm === 'fnv1a-32') warnings.add('weak-algorithm');
    const omittedDoses = Math.max(totalDoses - attempt.doses.length, 0);
    if (omittedDoses > 0) warnings.add('truncated');
    const notesDropped = attempt.notesDropped && allDoses.some((dose) => dose.note !== undefined);
    if (notesDropped) warnings.add('notes-dropped');

    const passport: Passport = {
      id: createId('passport'),
      profileId: profile.id,
      memberName: sanitiseField(profile.name, MAX_NAME_LENGTH),
      dateOfBirth: isoDateOnly(profile.dateOfBirth),
      doses: attempt.doses,
      issuedAt: issued,
      signature,
      algorithm,
      payload,
      totalDoses,
    };
    if (omittedDoses > 0) passport.omittedDoses = omittedDoses;

    return { passport, warnings: [...warnings], totalDoses, omittedDoses, notesDropped };
  }

  return {
    passport: null,
    error: 'too-large',
    warnings: [...warnings],
    totalDoses,
    omittedDoses: totalDoses,
    notesDropped: false,
  };
}

/**
 * Parse a certificate payload without checking its signature.
 *
 * Understands v2 (`vaccineId:doseNumber:date[:note]`) and the v1 layout
 * (`vaccineId:date[:note]`), so certificates issued before the dose ledger still
 * read back. A v1 dose parses with `doseNumber: null` — unknown, not absent.
 */
export function parsePassportPayload(payload: string): Passport | null {
  const trimmed = (payload ?? '').trim();
  const versionMatch = /^TIKAPASS(\d+)\|/.exec(trimmed);
  if (!versionMatch) return null;
  const version = Number(versionMatch[1]);
  if (!SUPPORTED_PASSPORT_FORMAT_VERSIONS.includes(version)) return null;
  if (!trimmed.startsWith(`TIKAPASS${version}${FIELD_SEPARATOR}`)) return null;

  const parts = trimmed.split(FIELD_SEPARATOR);
  // prefix | name | date of birth | issued at | doses | signature
  if (parts.length !== 6) return null;

  const [, memberName, dateOfBirth, issuedAt, encodedDoses, signature] = parts;
  if (!memberName || !dateOfBirth || !signature) return null;

  const doses: PassportDose[] = encodedDoses
    ? encodedDoses.split(RECORD_SEPARATOR).flatMap((record) => {
        const fields = record.split(VALUE_SEPARATOR);
        if (version < 2) {
          const [vaccineId, date, note] = fields;
          if (!vaccineId || !date) return [];
          return [{ vaccineId, doseNumber: null, date, note: note || undefined }];
        }
        const [vaccineId, encodedDose, date, note] = fields;
        if (!vaccineId || !date) return [];
        const parsed = encodedDose === UNKNOWN_DOSE ? null : Number(encodedDose);
        const doseNumber =
          parsed !== null && Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
        return [{ vaccineId, doseNumber, date, note: note || undefined }];
      })
    : [];

  return {
    id: '',
    profileId: '',
    memberName,
    dateOfBirth,
    doses,
    issuedAt,
    signature,
    algorithm: signature.length === FNV_SIGNATURE_LENGTH ? 'fnv1a-32' : 'hmac-sha256',
    payload: trimmed,
  };
}

/**
 * Verify a certificate payload.
 *
 * `tampered` means the structure parsed but the checksum did not match — either
 * the text was altered or it was produced on a different device. That ambiguity
 * is inherent to device-bound signing, and the UI must phrase it as such rather
 * than accusing anyone of forgery.
 */
export async function verifyPassportPayload(payload: string): Promise<PassportVerification> {
  const trimmed = (payload ?? '').trim();
  if (!trimmed) return { status: 'invalid', reason: 'empty' };

  const versionMatch = /^TIKAPASS(\d+)\|/.exec(trimmed);
  if (versionMatch && !SUPPORTED_PASSPORT_FORMAT_VERSIONS.includes(Number(versionMatch[1]))) {
    return {
      status: 'unsupported-version',
      reason: `certificate format v${versionMatch[1]} is not supported by this build (reads v${SUPPORTED_PASSPORT_FORMAT_VERSIONS.join(', v')})`,
    };
  }

  const parsed = parsePassportPayload(trimmed);
  if (!parsed) return { status: 'invalid', reason: 'malformed' };

  const body = trimmed.slice(0, trimmed.lastIndexOf(FIELD_SEPARATOR));
  const { signature } = await signPayload(body);
  if (signature !== parsed.signature) {
    return { status: 'tampered', reason: 'checksum-mismatch' };
  }

  const warnings: PassportWarning[] = [];
  if (!getDeviceKey()) warnings.push('no-key');
  if (parsed.algorithm === 'fnv1a-32') warnings.push('weak-algorithm');

  return { status: 'valid', passport: parsed, warnings };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export interface PassportQR {
  qr: QRCode;
  svg: string;
}

/** Render a certificate payload as a QR symbol plus a standalone SVG string. */
export function passportToQR(
  payload: string,
  options: { pixelSize?: number; title?: string } = {},
): PassportQR {
  const qr = generateQR(payload);
  return {
    qr,
    svg: qrToSVG(qr, {
      pixelSize: options.pixelSize ?? 4,
      title: options.title ?? 'TikaTrack vaccination certificate',
      foreground: '#0b1f1a',
      background: '#ffffff',
    }),
  };
}

/** Save text as a file without any external dependency. */
export function downloadTextAsFile(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously aborts the download in some browsers; defer a tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Rasterise an SVG certificate to a PNG blob via the canvas API. */
export async function passportSvgToPngBlob(svg: string, scale = 2): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();

    const cleanup = () => URL.revokeObjectURL(url);

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth * scale;
        canvas.height = image.naturalHeight * scale;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } finally {
        cleanup();
      }
    };

    image.onerror = () => {
      cleanup();
      resolve(null);
    };

    image.src = url;
  });
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function normaliseStored(value: unknown): StoredPassport | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredPassport>;
  if (typeof candidate.payload !== 'string' || typeof candidate.profileId !== 'string') {
    return null;
  }
  if (!candidate.payload.startsWith(PAYLOAD_PREFIX)) return null;

  return {
    id: typeof candidate.id === 'string' ? candidate.id : createId('passport'),
    profileId: candidate.profileId,
    memberName: typeof candidate.memberName === 'string' ? candidate.memberName : '',
    dateOfBirth: typeof candidate.dateOfBirth === 'string' ? candidate.dateOfBirth : '',
    issuedAt:
      typeof candidate.issuedAt === 'string' ? candidate.issuedAt : new Date().toISOString(),
    payload: candidate.payload,
    algorithm: candidate.algorithm === 'fnv1a-32' ? 'fnv1a-32' : 'hmac-sha256',
    ...(typeof candidate.svg === 'string' ? { svg: candidate.svg } : {}),
  };
}

/** Every certificate issued on this device, newest first. */
export function loadPassports(): StoredPassport[] {
  const raw = readString(STORAGE_KEYS.passports, '[]');
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normaliseStored)
      .filter((entry): entry is StoredPassport => entry !== null)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  } catch {
    return [];
  }
}

/** Persist the certificate list; `false` when storage is unavailable. */
export function savePassports(passports: StoredPassport[]): boolean {
  const next = passports.filter((entry) => entry?.payload).slice(0, 20);
  return writeString(STORAGE_KEYS.passports, JSON.stringify(next));
}

/** Replace the stored certificate for one profile, or add a new one. */
export function upsertPassport(passport: StoredPassport): StoredPassport[] {
  const next = [
    passport,
    ...loadPassports().filter((entry) => entry.profileId !== passport.profileId),
  ];
  savePassports(next);
  return next;
}

export function deletePassport(id: string): StoredPassport[] {
  const next = loadPassports().filter((entry) => entry.id !== id);
  savePassports(next);
  return next;
}
