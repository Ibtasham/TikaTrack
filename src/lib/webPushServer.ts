import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type webPushTypes from 'web-push';
import { createPool, isDatabaseConfigured } from '../db/index.ts';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webPushTypes;

export interface PushDoseItem {
  profileId: string;
  profileName: string;
  vaccineId: string;
  vaccineNameEn: string;
  vaccineNameBn: string;
  doseNumber: number;
  scheduledDoseId: string;
  doseLabelEn: string;
  doseLabelBn: string;
  scheduledDate: string; // YYYY-MM-DD
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userUid: string | null;
  language: 'en' | 'bn';
  timezoneOffsetMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  leadHours: number;
  enabled: boolean;
  doses: PushDoseItem[];
  sentKeys: string[];
  lastNotifiedAt: string | null;
  updatedAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  recordUrl: string;
  icon: string;
  badge: string;
  renotify: boolean;
  requireInteraction: boolean;
  profileId: string;
  vaccineId: string;
  doseNumber: number;
  scheduledDate: string;
  actions: Array<{ action: string; title: string }>;
}

export interface DuePushAlert {
  dedupeKey: string;
  dose: PushDoseItem;
  payload: PushNotificationPayload;
}

export interface DispatchSummary {
  checked: number;
  sent: number;
  skipped: number;
  removed: number;
}

const DEFAULT_VAPID_SUBJECT = 'mailto:reminders@tikatrack.app';
const VAPID_FILE_PATH = resolve(process.cwd(), '.tikatrack-vapid.json');
const FALLBACK_STORE_PATH = resolve(process.cwd(), '.tikatrack-push-store.json');
const MAX_SENT_KEYS = 500;

let cachedVapidKeys: { publicKey: string; privateKey: string; subject: string } | null = null;
let pgAvailable: boolean | null = null;
let pgInitialized = false;

const TRUSTED_PUSH_HOST_PATTERNS: readonly RegExp[] = [
  /^fcm\.googleapis\.com$/i,
  /^android\.apis\.google\.com$/i,
  /^updates\.push\.services\.mozilla\.com$/i,
  /^push\.services\.mozilla\.com$/i,
  /^[a-z0-9-]+\.push\.apple\.com$/i,
  /^[a-z0-9-]+\.notify\.windows\.com$/i,
  /^push\.api\.telefonica\.com$/i,
  /^[a-z0-9-]+\.push\.samsungosp\.com$/i,
];

function resolveNormalizedBase(): string {
  const raw = process.env.VITE_BASE || '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

function withAppBase(path: string): string {
  const base = resolveNormalizedBase();
  return `${base}${path.replace(/^\//, '')}`;
}

export function isValidPushEndpoint(endpoint: string): boolean {
  if (!endpoint || typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ) {
      return false;
    }
    return TRUSTED_PUSH_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}

export function subscriptionIdFromEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export function ensureVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  if (cachedVapidKeys) return cachedVapidKeys;

  const subject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;
  const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();

  if (envPublic && envPrivate) {
    cachedVapidKeys = { publicKey: envPublic, privateKey: envPrivate, subject };
    webpush.setVapidDetails(subject, envPublic, envPrivate);
    return cachedVapidKeys;
  }

  if (existsSync(VAPID_FILE_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(VAPID_FILE_PATH, 'utf8')) as {
        publicKey?: string;
        privateKey?: string;
      };
      if (parsed.publicKey && parsed.privateKey) {
        cachedVapidKeys = {
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
          subject,
        };
        webpush.setVapidDetails(subject, parsed.publicKey, parsed.privateKey);
        return cachedVapidKeys;
      }
    } catch {
      /* regenerate if unreadable */
    }
  }

  const generated = webpush.generateVAPIDKeys();
  cachedVapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
  try {
    mkdirSync(dirname(VAPID_FILE_PATH), { recursive: true });
    writeFileSync(
      VAPID_FILE_PATH,
      JSON.stringify({ publicKey: generated.publicKey, privateKey: generated.privateKey }, null, 2),
      'utf8',
    );
  } catch {
    /* keep in memory if filesystem is read-only */
  }

  webpush.setVapidDetails(subject, generated.publicKey, generated.privateKey);
  return cachedVapidKeys;
}

export function build48HourNotificationKey(dose: PushDoseItem): string {
  const doseKey = dose.scheduledDoseId || String(dose.doseNumber);
  return `${dose.profileId}:${dose.vaccineId}:${doseKey}:${dose.scheduledDate}:48h`;
}

export function computeLocalClinicDueMs(
  scheduledDate: string,
  timezoneOffsetMinutes: number,
  clinicHour = 9,
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scheduledDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const utcProbe = new Date(Date.UTC(year, month - 1, day, clinicHour, 0, 0, 0));
  if (
    utcProbe.getUTCFullYear() !== year ||
    utcProbe.getUTCMonth() !== month - 1 ||
    utcProbe.getUTCDate() !== day
  ) {
    return null;
  }

  const safeOffset = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : -360;
  return utcProbe.getTime() + safeOffset * 60_000;
}

export function isLocalQuietHours(
  nowMs: number,
  timezoneOffsetMinutes: number,
  startHHMM: string,
  endHHMM: string,
): boolean {
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(startHHMM || '');
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(endHHMM || '');
  if (!startMatch || !endMatch) return false;

  const startMin = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMin = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  if (startMin === endMin) return false;

  const safeOffset = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : -360;
  const localClock = new Date(nowMs - safeOffset * 60_000);
  const currentMin = localClock.getUTCHours() * 60 + localClock.getUTCMinutes();

  if (startMin > endMin) {
    return currentMin >= startMin || currentMin < endMin;
  }
  return currentMin >= startMin && currentMin < endMin;
}

function toBanglaDigits(num: number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => digits[Number(d)] ?? d);
}

export function buildPushNotificationPayload(
  dose: PushDoseItem,
  language: 'en' | 'bn',
  options: { isTest?: boolean; remainingHours?: number } = {},
): PushNotificationPayload {
  const isBangla = language === 'bn';
  const doseLabel = isBangla ? dose.doseLabelBn : dose.doseLabelEn;
  const vaccineName = isBangla ? dose.vaccineNameBn : dose.vaccineNameEn;
  const hours = Math.max(1, Math.min(48, Math.round(options.remainingHours ?? 48)));
  const bnHours = toBanglaDigits(hours);

  const title = options.isTest
    ? isBangla
      ? 'টিকাট্র্যাক ৪৮ ঘণ্টার পুশ পরীক্ষা'
      : 'TikaTrack 48-Hour Push Preview'
    : isBangla
      ? `${bnHours} ঘণ্টা পর টিকাদান: ${doseLabel}`
      : `Vaccination in ${hours} ${hours === 1 ? 'Hour' : 'Hours'}: ${doseLabel}`;

  const body = options.isTest
    ? isBangla
      ? `${dose.profileName}-এর আসন্ন ${doseLabel} (${vaccineName}) টিকার ৪৮ ঘণ্টা আগে স্বয়ংক্রিয় রিমাইন্ডার সক্রিয় আছে (${dose.scheduledDate})।`
      : `Automatic 48-hour advance alerts are active for ${dose.profileName}'s ${doseLabel} (${vaccineName}) due ${dose.scheduledDate}.`
    : isBangla
      ? `${dose.profileName}-এর ${doseLabel} (${vaccineName}) টিকা ${dose.scheduledDate} তারিখে নির্ধারিত — আর ${bnHours} ঘণ্টা বাকি।`
      : `${dose.profileName}'s ${doseLabel} (${vaccineName}) is scheduled for ${dose.scheduledDate} — ${hours} ${hours === 1 ? 'hour' : 'hours'} from now.`;

  const memberQ = encodeURIComponent(dose.profileId);
  const vaccineQ = encodeURIComponent(dose.vaccineId);

  return {
    title,
    body,
    tag: options.isTest ? 'tikatrack-push-test' : build48HourNotificationKey(dose),
    url: withAppBase(`reminders?member=${memberQ}&vaccine=${vaccineQ}`),
    recordUrl: withAppBase(`tracker?member=${memberQ}&vaccine=${vaccineQ}&dose=${dose.doseNumber}&action=record`),
    icon: withAppBase('icons/icon-192.png'),
    badge: withAppBase('icons/icon-192.png'),
    renotify: Boolean(options.isTest),
    requireInteraction: !options.isTest,
    profileId: dose.profileId,
    vaccineId: dose.vaccineId,
    doseNumber: dose.doseNumber,
    scheduledDate: dose.scheduledDate,
    actions: [
      {
        action: 'record',
        title: isBangla ? 'ডোজ রেকর্ড করুন' : 'Record dose',
      },
      {
        action: 'view',
        title: isBangla ? 'রিমাইন্ডার দেখুন' : 'View reminders',
      },
    ],
  };
}

/**
 * Determine which doses on a subscription are currently inside the 48-hour
 * advance reminder window and haven't been delivered yet.
 */
export function findDue48HourPushAlerts(
  record: PushSubscriptionRecord,
  nowMs: number = Date.now(),
): DuePushAlert[] {
  if (!record.enabled) return [];
  if (
    isLocalQuietHours(
      nowMs,
      record.timezoneOffsetMinutes,
      record.quietHoursStart,
      record.quietHoursEnd,
    )
  ) {
    return [];
  }

  const leadHours = record.leadHours > 0 ? record.leadHours : 48;
  const leadMs = leadHours * 3_600_000;
  const sentSet = new Set(record.sentKeys);
  const alerts: DuePushAlert[] = [];

  for (const dose of record.doses) {
    const dedupeKey = build48HourNotificationKey(dose);
    if (sentSet.has(dedupeKey)) continue;

    const dueMs = computeLocalClinicDueMs(dose.scheduledDate, record.timezoneOffsetMinutes);
    if (dueMs === null) continue;

    const notifyAtMs = dueMs - leadMs;
    if (nowMs >= notifyAtMs && nowMs < dueMs) {
      const remainingHours = Math.max(1, Math.round((dueMs - nowMs) / 3_600_000));
      alerts.push({
        dedupeKey,
        dose,
        payload: buildPushNotificationPayload(dose, record.language, { remainingHours }),
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Persistence Layer (PostgreSQL primary when SQL_HOST is reachable; local JSON fallback)
// ---------------------------------------------------------------------------

async function canUsePostgres(): Promise<boolean> {
  if (process.env.VITEST) return false;
  if (!isDatabaseConfigured()) return false;
  if (pgAvailable === false) return false;

  try {
    const pool = createPool();
    if (!pgInitialized) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_uid TEXT,
          language TEXT NOT NULL DEFAULT 'en',
          timezone_offset_minutes INTEGER NOT NULL DEFAULT -360,
          quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
          quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
          lead_hours INTEGER NOT NULL DEFAULT 48,
          enabled INTEGER NOT NULL DEFAULT 1,
          doses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          sent_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          last_notified_at TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      pgInitialized = true;
    }
    pgAvailable = true;
    return true;
  } catch {
    pgAvailable = false;
    return false;
  }
}

function readFallbackStore(): Record<string, PushSubscriptionRecord> {
  if (!existsSync(FALLBACK_STORE_PATH)) return {};
  try {
    const raw = readFileSync(FALLBACK_STORE_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, PushSubscriptionRecord>;
  } catch {
    return {};
  }
}

function writeFallbackStore(store: Record<string, PushSubscriptionRecord>): void {
  try {
    mkdirSync(dirname(FALLBACK_STORE_PATH), { recursive: true });
    writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    /* ignore write failures in ephemeral environments */
  }
}

function rowToRecord(row: Record<string, unknown>): PushSubscriptionRecord {
  return {
    id: String(row.id),
    endpoint: String(row.endpoint),
    keys: {
      p256dh: String(row.p256dh),
      auth: String(row.auth),
    },
    userUid: row.user_uid ? String(row.user_uid) : null,
    language: row.language === 'bn' ? 'bn' : 'en',
    timezoneOffsetMinutes: Number(row.timezone_offset_minutes ?? -360),
    quietHoursStart: String(row.quiet_hours_start ?? '22:00'),
    quietHoursEnd: String(row.quiet_hours_end ?? '07:00'),
    leadHours: Number(row.lead_hours ?? 48),
    enabled: Number(row.enabled ?? 1) === 1,
    doses: Array.isArray(row.doses_json) ? (row.doses_json as PushDoseItem[]) : [],
    sentKeys: Array.isArray(row.sent_keys_json) ? (row.sent_keys_json as string[]) : [],
    lastNotifiedAt: row.last_notified_at ? String(row.last_notified_at) : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  };
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  if (await canUsePostgres()) {
    const pool = createPool();
    const result = await pool.query('SELECT * FROM push_subscriptions');
    return result.rows.map((r) => rowToRecord(r as Record<string, unknown>));
  }
  return Object.values(readFallbackStore());
}

export async function getPushSubscriptionByEndpoint(
  endpoint: string,
): Promise<PushSubscriptionRecord | null> {
  const id = subscriptionIdFromEndpoint(endpoint);
  if (await canUsePostgres()) {
    const pool = createPool();
    const result = await pool.query('SELECT * FROM push_subscriptions WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? rowToRecord(result.rows[0] as Record<string, unknown>) : null;
  }
  const store = readFallbackStore();
  return store[id] ?? null;
}

export async function upsertPushSubscription(params: {
  subscription: WebPushSubscriptionInput;
  userUid?: string | null;
  language?: 'en' | 'bn';
  timezoneOffsetMinutes?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  leadHours?: number;
  enabled?: boolean;
  doses?: PushDoseItem[];
}): Promise<PushSubscriptionRecord> {
  const id = subscriptionIdFromEndpoint(params.subscription.endpoint);
  const existing = await getPushSubscriptionByEndpoint(params.subscription.endpoint);
  if (existing?.userUid && params.userUid && existing.userUid !== params.userUid) {
    const err = new Error('Forbidden: Push subscription belongs to a different account.') as Error & {
      statusCode?: number;
    };
    err.statusCode = 403;
    throw err;
  }
  const nowIso = new Date().toISOString();

  const record: PushSubscriptionRecord = {
    id,
    endpoint: params.subscription.endpoint,
    keys: {
      p256dh: params.subscription.keys.p256dh,
      auth: params.subscription.keys.auth,
    },
    userUid: existing?.userUid ?? params.userUid ?? null,
    language: params.language ?? existing?.language ?? 'en',
    timezoneOffsetMinutes:
      params.timezoneOffsetMinutes ?? existing?.timezoneOffsetMinutes ?? -360,
    quietHoursStart: params.quietHoursStart ?? existing?.quietHoursStart ?? '22:00',
    quietHoursEnd: params.quietHoursEnd ?? existing?.quietHoursEnd ?? '07:00',
    leadHours: params.leadHours ?? existing?.leadHours ?? 48,
    enabled: params.enabled ?? existing?.enabled ?? true,
    doses: params.doses ?? existing?.doses ?? [],
    sentKeys: existing?.sentKeys ?? [],
    lastNotifiedAt: existing?.lastNotifiedAt ?? null,
    updatedAt: nowIso,
  };

  if (await canUsePostgres()) {
    const pool = createPool();
    await pool.query(
      `
      INSERT INTO push_subscriptions (
        id, endpoint, p256dh, auth, user_uid, language,
        timezone_offset_minutes, quiet_hours_start, quiet_hours_end,
        lead_hours, enabled, doses_json, sent_keys_json, last_notified_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12::jsonb, $13::jsonb, $14, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        endpoint = EXCLUDED.endpoint,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_uid = COALESCE(EXCLUDED.user_uid, push_subscriptions.user_uid),
        language = EXCLUDED.language,
        timezone_offset_minutes = EXCLUDED.timezone_offset_minutes,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        lead_hours = EXCLUDED.lead_hours,
        enabled = EXCLUDED.enabled,
        doses_json = EXCLUDED.doses_json,
        sent_keys_json = EXCLUDED.sent_keys_json,
        last_notified_at = EXCLUDED.last_notified_at,
        updated_at = NOW();
      `,
      [
        record.id,
        record.endpoint,
        record.keys.p256dh,
        record.keys.auth,
        record.userUid,
        record.language,
        record.timezoneOffsetMinutes,
        record.quietHoursStart,
        record.quietHoursEnd,
        record.leadHours,
        record.enabled ? 1 : 0,
        JSON.stringify(record.doses),
        JSON.stringify(record.sentKeys),
        record.lastNotifiedAt,
      ],
    );
    return record;
  }

  const store = readFallbackStore();
  store[id] = record;
  writeFallbackStore(store);
  return record;
}

export async function updatePushRecordDeliveryState(
  record: PushSubscriptionRecord,
): Promise<void> {
  const trimmedSent = record.sentKeys.slice(-MAX_SENT_KEYS);
  if (await canUsePostgres()) {
    const pool = createPool();
    await pool.query(
      `UPDATE push_subscriptions
       SET sent_keys_json = $2::jsonb, last_notified_at = $3, updated_at = NOW()
       WHERE id = $1`,
      [record.id, JSON.stringify(trimmedSent), record.lastNotifiedAt],
    );
    return;
  }

  const store = readFallbackStore();
  if (store[record.id]) {
    store[record.id] = { ...record, sentKeys: trimmedSent };
    writeFallbackStore(store);
  }
}

export async function removePushSubscription(
  endpoint: string,
  callerUid?: string | null,
): Promise<boolean> {
  const existing = await getPushSubscriptionByEndpoint(endpoint);
  if (existing?.userUid && callerUid && existing.userUid !== callerUid) {
    const err = new Error('Forbidden: Cannot remove another account push subscription.') as Error & {
      statusCode?: number;
    };
    err.statusCode = 403;
    throw err;
  }
  const id = subscriptionIdFromEndpoint(endpoint);
  if (await canUsePostgres()) {
    const pool = createPool();
    const res = await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  const store = readFallbackStore();
  if (!store[id]) return false;
  delete store[id];
  writeFallbackStore(store);
  return true;
}

export async function removePushSubscriptionsByUser(uid: string): Promise<number> {
  let removed = 0;
  if (await canUsePostgres()) {
    const pool = createPool();
    const res = await pool.query('DELETE FROM push_subscriptions WHERE user_uid = $1', [uid]);
    removed += res.rowCount ?? 0;
  }
  const store = readFallbackStore();
  let changed = false;
  for (const [key, rec] of Object.entries(store)) {
    if (rec.userUid === uid) {
      delete store[key];
      removed += 1;
      changed = true;
    }
  }
  if (changed) writeFallbackStore(store);
  return removed;
}

// ---------------------------------------------------------------------------
// Dispatch Engine
// ---------------------------------------------------------------------------

export type WebPushSender = (
  subscription: WebPushSubscriptionInput,
  payloadJson: string,
) => Promise<unknown>;

const defaultSender: WebPushSender = (subscription, payloadJson) => {
  ensureVapidConfig();
  return webpush.sendNotification(subscription, payloadJson, {
    TTL: 60 * 60 * 12, // 12 hours
    urgency: 'high',
  });
};

export async function sendWebPushTestNotification(
  subscription: WebPushSubscriptionInput,
  language: 'en' | 'bn' = 'en',
  sampleDose?: Partial<PushDoseItem>,
  sender: WebPushSender = defaultSender,
): Promise<{ sent: boolean; statusCode?: number }> {
  const today = new Date();
  const in48h = new Date(today.getTime() + 48 * 3_600_000).toISOString().slice(0, 10);

  const dose: PushDoseItem = {
    profileId: sampleDose?.profileId || 'sample-member',
    profileName: sampleDose?.profileName || (language === 'bn' ? 'পরিবারের সদস্য' : 'Family Member'),
    vaccineId: sampleDose?.vaccineId || 'penta',
    vaccineNameEn: sampleDose?.vaccineNameEn || 'Pentavalent (DTP-HepB-Hib)',
    vaccineNameBn: sampleDose?.vaccineNameBn || 'পেন্টাভ্যালেন্ট',
    doseNumber: sampleDose?.doseNumber ?? 1,
    scheduledDoseId: sampleDose?.scheduledDoseId || 'penta-1',
    doseLabelEn: sampleDose?.doseLabelEn || 'Pentavalent-1',
    doseLabelBn: sampleDose?.doseLabelBn || 'পেন্টাভ্যালেন্ট-১',
    scheduledDate: sampleDose?.scheduledDate || in48h,
  };

  const payload = buildPushNotificationPayload(dose, language, { isTest: true });
  await sender(subscription, JSON.stringify(payload));
  return { sent: true };
}

export async function dispatchDue48HourPushForRecord(
  record: PushSubscriptionRecord,
  options: { nowMs?: number; sender?: WebPushSender } = {},
): Promise<{ sent: number; skipped: number; expired: boolean }> {
  const nowMs = options.nowMs ?? Date.now();
  const sender = options.sender ?? defaultSender;
  const dueAlerts = findDue48HourPushAlerts(record, nowMs);

  if (dueAlerts.length === 0) {
    return { sent: 0, skipped: 0, expired: false };
  }

  let sent = 0;
  let skipped = 0;
  let expired = false;
  const nextSentKeys = [...record.sentKeys];

  for (const alert of dueAlerts) {
    try {
      await sender(
        { endpoint: record.endpoint, keys: record.keys },
        JSON.stringify(alert.payload),
      );
      nextSentKeys.push(alert.dedupeKey);
      sent += 1;
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        expired = true;
        break;
      }
      skipped += 1;
      console.warn('[push] dispatch failed for', record.id, error);
    }
  }

  if (expired) {
    await removePushSubscription(record.endpoint);
    return { sent, skipped, expired: true };
  }

  if (sent > 0) {
    record.sentKeys = nextSentKeys.slice(-MAX_SENT_KEYS);
    record.lastNotifiedAt = new Date(nowMs).toISOString();
    await updatePushRecordDeliveryState(record);
  }

  return { sent, skipped, expired: false };
}

export async function dispatchDue48HourPushNotifications(
  options: { nowMs?: number; sender?: WebPushSender } = {},
): Promise<DispatchSummary> {
  const records = await listPushSubscriptions();
  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const record of records) {
    const result = await dispatchDue48HourPushForRecord(record, options);
    sent += result.sent;
    skipped += result.skipped;
    if (result.expired) removed += 1;
  }

  return {
    checked: records.length,
    sent,
    skipped,
    removed,
  };
}
