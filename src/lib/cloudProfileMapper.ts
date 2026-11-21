import { mergeImport, normaliseProfile, normaliseProfiles } from './profileStore';
import type { Profile } from '../types';

const VALID_DOC_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidFirestoreDocId(id: string): boolean {
  return VALID_DOC_ID.test(id);
}

/**
 * Remove `undefined` values recursively so Firestore writes never reject payloads.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    }
    return clean as T;
  }
  return value;
}

export interface FirestoreFamilyProfilePayload {
  id: string;
  ownerUid: string;
  name: string;
  dateOfBirth: string;
  relationship?: Profile['relationship'];
  gender?: Profile['gender'];
  events: Record<string, unknown>[];
  growth: Record<string, unknown>[];
}

export const MAX_FIRESTORE_ARRAY_ITEMS = 250;

export function toFirestoreFamilyProfilePayload(
  uid: string,
  profile: Profile,
): FirestoreFamilyProfilePayload {
  const safeId = isValidFirestoreDocId(profile.id)
    ? profile.id
    : profile.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'profile-default';

  const events = (profile.events ?? [])
    .slice(0, MAX_FIRESTORE_ARRAY_ITEMS)
    .map((event) => stripUndefined(event as unknown as Record<string, unknown>));
  const growth = (profile.growth ?? [])
    .slice(0, MAX_FIRESTORE_ARRAY_ITEMS)
    .map((item) => stripUndefined(item as unknown as Record<string, unknown>));

  const payload: FirestoreFamilyProfilePayload = {
    id: safeId,
    ownerUid: uid,
    name: profile.name.trim().slice(0, 120),
    dateOfBirth: profile.dateOfBirth.slice(0, 10),
    events,
    growth,
  };

  if (profile.relationship) {
    payload.relationship = profile.relationship;
  }
  if (profile.gender) {
    payload.gender = profile.gender;
  }
  return payload;
}

export function fromFirestoreFamilyProfileDoc(data: unknown): Profile | null {
  return normaliseProfile(data);
}

export function mergeCloudAndLocalProfiles(
  local: Profile[],
  cloud: Profile[],
  deletedIds?: ReadonlySet<string> | ReadonlyArray<string>,
): Profile[] {
  const deletedSet = deletedIds
    ? deletedIds instanceof Set
      ? deletedIds
      : new Set(deletedIds)
    : null;
  const filterDeleted = (list: Profile[]): Profile[] =>
    deletedSet && deletedSet.size > 0
      ? list.filter((p) => !deletedSet.has(p.id))
      : list;

  const cleanLocal = filterDeleted(normaliseProfiles(local));
  const cleanCloud = filterDeleted(normaliseProfiles(cloud));
  if (cleanCloud.length === 0) return cleanLocal;
  if (cleanLocal.length === 0) return cleanCloud;
  const result = mergeImport(cleanLocal, JSON.stringify(cleanCloud));
  return result.ok ? filterDeleted(result.profiles) : cleanLocal;
}
