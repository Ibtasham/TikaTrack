import type { Profile } from '../types';
import { buildEpiScheduleSnapshot, type EpiScheduleSnapshot } from './epiScheduleSnapshot';
import { normaliseProfiles } from './profileStore';

export const OFFLINE_DATA_CACHE_NAME = 'tikatrack-data-v1';

export interface CachedProfilesPayload {
  profiles: Profile[];
  updatedAt: string;
  count: number;
}

export interface OfflineCacheStatus {
  scheduleCached: boolean;
  scheduleVersion: string | null;
  milestoneCount: number;
  vaccineCount: number;
  profilesCached: boolean;
  cachedProfileCount: number;
  profilesUpdatedAt: string | null;
}

function getBasePath(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function offlineProfilesUrl(): string {
  return `${getBasePath()}__offline/profiles.json`;
}

export function offlineScheduleUrl(): string {
  return `${getBasePath()}__offline/epi-schedule.json`;
}

export function epiScheduleAssetUrl(): string {
  return `${getBasePath()}epi-schedule.json`;
}

function hasCacheStorage(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

function resolveOriginUrl(path: string): string {
  if (typeof window === 'undefined' || !window.location?.origin) return path;
  return new URL(path, window.location.origin).href;
}

async function postToServiceWorker(message: Record<string, unknown>): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
      return true;
    }
    const registration = await navigator.serviceWorker.getRegistration?.();
    const target = registration?.active || registration?.waiting || registration?.installing;
    if (target) {
      target.postMessage(message);
      return true;
    }
  } catch {
    // Ignore SW messaging failures in restricted contexts.
  }
  return false;
}

function buildJsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-TikaTrack-Cache': 'offline-data',
    },
  });
}

/**
 * Sync family profile records into the Service Worker offline cache so the
 * dashboard can render even offline or after localStorage eviction.
 */
export async function syncProfilesToServiceWorker(profiles: Profile[]): Promise<boolean> {
  if (!hasCacheStorage()) return false;
  const payload: CachedProfilesPayload = {
    profiles,
    updatedAt: new Date().toISOString(),
    count: profiles.length,
  };

  let wrote = false;
  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE_NAME);
    await cache.put(resolveOriginUrl(offlineProfilesUrl()), buildJsonResponse(payload));
    wrote = true;
  } catch {
    // Cache Storage may reject in private/restricted browsers.
  }

  const posted = await postToServiceWorker({
    type: 'CACHE_PROFILES',
    profiles,
    updatedAt: payload.updatedAt,
  });

  return wrote || posted;
}

/**
 * Read cached family profiles from the Service Worker data cache.
 */
export async function readCachedProfilesFromServiceWorker(): Promise<CachedProfilesPayload | null> {
  if (!hasCacheStorage()) return null;
  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE_NAME);
    const match = await cache.match(resolveOriginUrl(offlineProfilesUrl()));
    if (!match) return null;
    const raw = (await match.json()) as {
      profiles?: unknown;
      updatedAt?: unknown;
    };
    const parsed = normaliseProfiles(raw?.profiles ?? []);
    return {
      profiles: parsed,
      updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
      count: parsed.length,
    };
  } catch {
    return null;
  }
}

/**
 * Cache the national Bangladesh EPI schedule & vaccine catalog in the Service Worker
 * data cache (`tikatrack-data-v1`).
 */
export async function syncScheduleToServiceWorker(
  snapshot: EpiScheduleSnapshot = buildEpiScheduleSnapshot(),
): Promise<boolean> {
  if (!hasCacheStorage()) return false;

  let wrote = false;
  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE_NAME);
    await Promise.all([
      cache.put(resolveOriginUrl(offlineScheduleUrl()), buildJsonResponse(snapshot)),
      cache.put(resolveOriginUrl(epiScheduleAssetUrl()), buildJsonResponse(snapshot)),
    ]);
    wrote = true;
  } catch {
    // Ignore storage quota / private mode issues.
  }

  const posted = await postToServiceWorker({
    type: 'CACHE_EPI_SCHEDULE',
    payload: snapshot,
  });

  return wrote || posted;
}

/**
 * Read the national EPI schedule from the Service Worker Cache Storage.
 */
export async function readCachedEpiScheduleFromServiceWorker(): Promise<EpiScheduleSnapshot | null> {
  if (!hasCacheStorage()) return null;
  try {
    const dataCache = await caches.open(OFFLINE_DATA_CACHE_NAME);
    const match =
      (await dataCache.match(resolveOriginUrl(offlineScheduleUrl()))) ||
      (await dataCache.match(resolveOriginUrl(epiScheduleAssetUrl()))) ||
      (await caches.match(resolveOriginUrl(epiScheduleAssetUrl())));
    if (!match) return null;
    const parsed = (await match.json()) as Partial<EpiScheduleSnapshot>;
    if (!Array.isArray(parsed?.milestones) || !Array.isArray(parsed?.vaccines)) {
      return null;
    }
    return {
      version: typeof parsed.version === 'string' ? parsed.version : 'bangladesh-epi',
      country: 'BD',
      source: typeof parsed.source === 'string' ? parsed.source : 'DGHS Bangladesh EPI / WHO',
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
      milestones: parsed.milestones,
      vaccines: parsed.vaccines,
    };
  } catch {
    return null;
  }
}

/**
 * Inspect whether both the national EPI schedule and family profiles are cached
 * in the Service Worker for offline dashboard operation.
 */
export async function getOfflineCacheStatus(): Promise<OfflineCacheStatus> {
  const [scheduleSnapshot, cachedProfiles] = await Promise.all([
    readCachedEpiScheduleFromServiceWorker(),
    readCachedProfilesFromServiceWorker(),
  ]);

  return {
    scheduleCached: scheduleSnapshot !== null,
    scheduleVersion: scheduleSnapshot?.version ?? null,
    milestoneCount: scheduleSnapshot?.milestones.length ?? 0,
    vaccineCount: scheduleSnapshot?.vaccines.length ?? 0,
    profilesCached: cachedProfiles !== null,
    cachedProfileCount: cachedProfiles?.count ?? 0,
    profilesUpdatedAt: cachedProfiles?.updatedAt ?? null,
  };
}
