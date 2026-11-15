/**
 * Sharing helpers built on the Web Share API.
 *
 * In Bangladesh the record does not travel by email — it travels by WhatsApp,
 * Messenger or a screenshot handed to a community health worker. `navigator.share`
 * is the only web API that reaches those apps directly, so this module:
 *
 *   - uses it when the browser offers it (Android Chrome, iOS Safari, Edge),
 *   - falls back to the clipboard when it does not (desktop Firefox, jsdom),
 *   - treats a dismissed share sheet as a normal outcome, not an error, and
 *   - never throws: sharing is a convenience, and a failed share must not lose
 *     the user's place in the app.
 */

import type { Language } from '../i18n/types';
import { copyToClipboard } from './exporters';

export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'unavailable';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** `true` when this exact payload (e.g. with a PNG attached) can be shared. */
export function canSharePayload(payload: SharePayload): boolean {
  if (!isShareSupported()) return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare(payload);
  } catch {
    return false;
  }
}

/**
 * Share, degrading step by step: native sheet → clipboard → nothing.
 *
 * A payload the platform refuses (file sharing on desktop Chrome) still gets a
 * second chance through the clipboard, as long as there is text to copy.
 */
export async function share(payload: SharePayload): Promise<ShareOutcome> {
  if (canSharePayload(payload)) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
      // Fall through to the clipboard: the share sheet may have failed for a
      // reason outside our control (a missing handler app, a policy block).
    }
  }

  const text = [payload.title, payload.text, payload.url].filter(Boolean).join('\n\n');
  if (text && (await copyToClipboard(text))) return 'copied';
  return 'unavailable';
}

/**
 * Which toast (if any) a share outcome deserves.
 *
 * `shared` and `cancelled` stay quiet: the platform already showed the user
 * what happened, and a "you cancelled" toast is noise. `copied` is announced
 * because the user has to know the text is on the clipboard, not in WhatsApp.
 */
export function shareOutcomeKey(outcome: ShareOutcome): string | null {
  switch (outcome) {
    case 'copied':
      return 'common.share.copied';
    case 'unavailable':
      return 'common.share.unavailable';
    default:
      return null;
  }
}

/** The share sheet was opened and then dismissed by the user. */
function isAbortError(error: unknown): boolean {
  // `DOMException` is not an `Error` instance in every environment, so sniff the
  // name rather than relying on `instanceof`.
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}

/** Absolute URL of a route in this deployment, honouring the base path. */
export function appUrl(path = ''): string {
  if (typeof window === 'undefined') return path;
  const base = import.meta.env.BASE_URL;
  const normalised = path.replace(/^\/+/, '');
  return `${window.location.origin}${base}${normalised}`;
}

export interface RecordShareInput {
  name: string;
  /** Already localised, e.g. `4 months old` / `৪ মাস বয়স`. */
  ageText?: string;
  /** Vaccine names in schedule order. */
  completed: string[];
  nextDue?: { vaccine: string; dateText: string; inText?: string };
  overdue: string[];
  language: Language;
  /** Defaults to this deployment's tracker page. */
  url?: string;
}

const LABELS = {
  en: {
    title: 'Vaccination record',
    completed: 'Completed',
    none: 'none',
    nextDue: 'Next due',
    overdue: 'Overdue',
    footer: 'Tracked with TikaTrack (free, works offline):',
    generatedBy: 'Generated on this device — not an official document.',
  },
  bn: {
    title: 'টিকার রেকর্ড',
    completed: 'সম্পন্ন',
    none: 'নেই',
    nextDue: 'পরবর্তী টিকা',
    overdue: 'বাকি (সময় অতিক্রান্ত)',
    footer: 'টিকাট্র্যাক দিয়ে সংরক্ষিত (ফ্রি, অফলাইনে চলে):',
    generatedBy: 'এই ডিভাইসে তৈরি — সরকারি দলিল নয়।',
  },
} as const satisfies Record<Language, Record<string, string>>;

/**
 * A plain-text summary that survives any messaging app.
 *
 * No markdown, no tables, no emoji-heavy layout: it has to stay readable when it
 * lands in a WhatsApp thread on a small screen.
 */
export function buildRecordShareText(input: RecordShareInput): string {
  const labels = LABELS[input.language] ?? LABELS.en;
  const lines: string[] = [];

  lines.push(
    input.ageText
      ? `${labels.title}: ${input.name} (${input.ageText})`
      : `${labels.title}: ${input.name}`,
  );
  lines.push('');
  lines.push(
    `${labels.completed} (${input.completed.length}): ${
      input.completed.length > 0 ? input.completed.join(', ') : labels.none
    }`,
  );

  if (input.nextDue) {
    const when = input.nextDue.inText
      ? `${input.nextDue.dateText} (${input.nextDue.inText})`
      : input.nextDue.dateText;
    lines.push(`${labels.nextDue}: ${input.nextDue.vaccine} — ${when}`);
  }

  lines.push(
    `${labels.overdue}: ${input.overdue.length > 0 ? input.overdue.join(', ') : labels.none}`,
  );
  lines.push('');
  lines.push(labels.generatedBy);

  const url = input.url ?? appUrl('/tracker');
  if (url) {
    lines.push(`${labels.footer} ${url}`);
  }

  return lines.join('\n');
}

/**
 * Turn a person's name into a filename.
 *
 * Latin-only on purpose: a Bengali name would survive most file systems but not
 * every download handler, share sheet or QR-linked URL, and a mangled filename
 * is the first thing a recipient notices. Falls back rather than returning an
 * empty stem.
 */
export function safeFilename(value: string, fallback = 'tikatrack'): string {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** Wrap a Blob (a passport PNG, say) as a shareable File when the API exists. */
export function shareableFile(blob: Blob, filename: string): File | null {
  try {
    if (typeof File !== 'function') return null;
    return new File([blob], filename, { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}
