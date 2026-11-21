import { describe, expect, it, vi } from 'vitest';

import {
  fromFirestoreFamilyProfileDoc,
  isValidFirestoreDocId,
  mergeCloudAndLocalProfiles,
  stripUndefined,
  toFirestoreFamilyProfilePayload,
} from '../lib/cloudProfileMapper';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import type { Profile } from '../types';

describe('cloudProfileMapper', () => {
  const sampleProfile: Profile = {
    id: 'profile-abc-123',
    name: 'Ayaan',
    dateOfBirth: '2024-05-10',
    relationship: 'child',
    gender: 'male',
    records: {
      bcg: { date: '2024-05-11', notes: 'Birth dose' },
    },
    events: [
      {
        id: 'ev-1',
        profileId: 'profile-abc-123',
        vaccineId: 'bcg',
        scheduleVersion: 'epi-bd-2024',
        seriesId: 'bcg@epi-bd-2024',
        doseNumber: 1,
        scheduledDoseId: 'bcg#1@0d',
        date: '2024-05-11',
        createdAt: '2024-05-11T08:00:00.000Z',
        provenance: 'manual',
        notes: undefined,
      },
    ],
    growth: [
      {
        id: 'gr-1',
        date: '2024-06-10',
        weightKg: 4.5,
        heightCm: 54.2,
        notes: undefined,
        createdAt: '2024-06-10T09:00:00.000Z',
      },
    ],
  };

  it('validates Firestore document IDs cleanly', () => {
    expect(isValidFirestoreDocId('profile-123_abc')).toBe(true);
    expect(isValidFirestoreDocId('bad/id')).toBe(false);
    expect(isValidFirestoreDocId('')).toBe(false);
  });

  it('strips undefined values recursively without mutating defined fields', () => {
    const cleaned = stripUndefined({
      a: 1,
      b: undefined,
      nested: [{ x: 'ok', y: undefined }],
    });
    expect(cleaned).toEqual({
      a: 1,
      nested: [{ x: 'ok' }],
    });
  });

  it('serializes and deserializes Firestore family profile payloads safely', () => {
    const payload = toFirestoreFamilyProfilePayload('user-uid-1', {
      ...sampleProfile,
      id: 'bad/doc:id',
    });
    expect(payload.ownerUid).toBe('user-uid-1');
    expect(payload.id).toBe('bad-doc-id');
    expect(payload.events[0]).not.toHaveProperty('notes');
    expect(payload.growth[0]).not.toHaveProperty('notes');

    const parsed = fromFirestoreFamilyProfileDoc(payload);
    expect(parsed?.name).toBe('Ayaan');
    expect(parsed?.events?.length).toBe(1);
    expect(fromFirestoreFamilyProfileDoc(null)).toBeNull();
  });

  it('merges local and cloud profiles cleanly with deduplication', () => {
    const localOnly: Profile = {
      id: 'profile-local',
      name: 'Zoya',
      dateOfBirth: '2023-02-01',
      records: {},
      events: [],
    };
    const merged = mergeCloudAndLocalProfiles([localOnly], [sampleProfile]);
    expect(merged).toHaveLength(2);
    expect(merged.map((p) => p.id).sort()).toEqual(['profile-abc-123', 'profile-local']);

    expect(mergeCloudAndLocalProfiles([localOnly], [])).toHaveLength(1);
    expect(mergeCloudAndLocalProfiles([], [sampleProfile])).toHaveLength(1);
  });

  it('formats structured Firestore errors in handleFirestoreError', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      handleFirestoreError(new Error('permission-denied'), OperationType.WRITE, 'users/u1/private/account'),
    ).toThrow(/permission-denied/);
    expect(errSpy).toHaveBeenCalled();
  });
});
