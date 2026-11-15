import { describe, expect, it } from 'vitest';

import {
  buildExport,
  createProfile,
  mergeImport,
  normaliseProfile,
  normaliseProfiles,
  recordDose,
  removeDose,
} from '../lib/profileStore';
import { EXPORT_APP_ID, EXPORT_VERSION, type Profile } from '../types';

/** A minimal valid profile builder so tests stay readable. */
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p-1',
    name: 'Asha',
    dateOfBirth: '2024-01-01',
    records: {},
    ...overrides,
  };
}

describe('profileStore', () => {
  describe('createProfile', () => {
    it('builds a profile with a generated id and empty records', () => {
      const result = createProfile({ name: 'Asha', dateOfBirth: '2024-01-01' });
      expect(result.error).toBeUndefined();
      expect(result.profile).toBeDefined();
      expect(result.profile!.id).toBeTruthy();
      expect(result.profile!.records).toEqual({});
      expect(result.profile!.createdAt).toBeTruthy();
    });

    it('rejects an empty or whitespace-only name', () => {
      expect(createProfile({ name: '   ', dateOfBirth: '2024-01-01' }).error).toBe('empty-name');
    });

    it('rejects an over-long name', () => {
      expect(createProfile({ name: 'x'.repeat(121), dateOfBirth: '2024-01-01' }).error).toBe(
        'name-too-long',
      );
    });

    it('rejects a missing or malformed date of birth', () => {
      expect(createProfile({ name: 'Asha', dateOfBirth: '' }).error).toBe('missing-dob');
      expect(createProfile({ name: 'Asha', dateOfBirth: '01/01/2024' }).error).toBe('invalid-dob');
      expect(createProfile({ name: 'Asha', dateOfBirth: '2024-99-99' }).error).toBe('invalid-dob');
    });

    it('rejects a date of birth in the future', () => {
      const tomorrow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      expect(createProfile({ name: 'Asha', dateOfBirth: tomorrow }).error).toBe('future-dob');
    });
  });

  describe('recordDose / removeDose', () => {
    it('records a dose immutably and stamps recordedAt', () => {
      const original = makeProfile();
      const next = recordDose([original], original.id, 'bcg', { date: '2024-01-05' });

      expect(next).not.toBe([original]); // a new array
      expect(next[0]).not.toBe(original); // a new object
      expect(original.records.bcg).toBeUndefined(); // original untouched
      expect(next[0].records.bcg.date).toBe('2024-01-05');
      expect(next[0].records.bcg.recordedAt).toBeTruthy();
      expect(next[0].updatedAt).not.toBe(original.updatedAt);
    });

    it('leaves other profiles alone', () => {
      const a = makeProfile({ id: 'a' });
      const b = makeProfile({ id: 'b', name: 'Bolashe' });
      const next = recordDose([a, b], 'a', 'bcg', { date: '2024-01-05' });
      expect(next[1]).toBe(b); // untouched identity
      expect(next[0].records.bcg).toBeDefined();
    });

    it('removes one dose and leaves another vaccine alone', () => {
      let withDose = recordDose([makeProfile()], 'p-1', 'bcg', { date: '2024-01-05' });
      withDose = recordDose(withDose, 'p-1', 'opv', { date: '2024-02-05' });
      const eventId = withDose[0].events?.find((event) => event.vaccineId === 'bcg')?.id ?? '';

      const cleared = removeDose(withDose, 'p-1', 'bcg', eventId);
      expect(cleared[0].records.bcg).toBeUndefined();
      expect(cleared[0].records.opv.date).toBe('2024-02-05');
    });
  });

  describe('normaliseProfile', () => {
    it('upgrades a legacy string dose record to an object', () => {
      const profile = normaliseProfile({
        id: 'x',
        name: 'Asha',
        dateOfBirth: '2024-01-01',
        records: { bcg: '2024-01-05' },
      });
      expect(profile).not.toBeNull();
      expect(profile!.records.bcg).toEqual({ date: '2024-01-05' });
    });

    it('returns null for irreparable input', () => {
      expect(normaliseProfile(null)).toBeNull();
      expect(normaliseProfile({ name: '', dateOfBirth: '2024-01-01' })).toBeNull();
      expect(normaliseProfile({ name: 'Asha', dateOfBirth: 'nope' })).toBeNull();
    });

    it('drops malformed vaccine ids but keeps valid ones', () => {
      const profile = normaliseProfile({
        name: 'Asha',
        dateOfBirth: '2024-01-01',
        records: {
          bcg: { date: '2024-01-05' },
          'bad id with spaces!!': { date: '2024-01-05' },
        },
      });
      expect(Object.keys(profile!.records)).toEqual(['bcg']);
    });
  });

  describe('normaliseProfiles', () => {
    it('merges duplicate ids instead of dropping doses', () => {
      const profiles = normaliseProfiles([
        {
          id: 'a',
          name: 'Asha',
          dateOfBirth: '2024-01-01',
          records: { bcg: { date: '2024-01-05' } },
        },
        {
          id: 'a',
          name: 'Asha',
          dateOfBirth: '2024-01-01',
          records: { opv: { date: '2024-02-05' } },
        },
      ]);
      expect(profiles).toHaveLength(1);
      expect(Object.keys(profiles[0].records).sort()).toEqual(['bcg', 'opv']);
    });

    it('returns [] for a non-array', () => {
      expect(normaliseProfiles('nope')).toEqual([]);
    });
  });

  describe('buildExport / mergeImport', () => {
    it('round-trips an export back into profiles', () => {
      const profile = makeProfile({ id: 'p-1', records: { bcg: { date: '2024-01-05' } } });
      const payload = JSON.stringify(buildExport([profile]));

      const result = mergeImport([], payload);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.added).toBe(1);
      expect(result.merged).toBe(0);
      expect(result.profiles[0].records.bcg.date).toBe('2024-01-05');
    });

    it('stamps the export envelope with the app id and version', () => {
      const exported = buildExport([makeProfile()]);
      expect(exported.app).toBe(EXPORT_APP_ID);
      expect(exported.version).toBe(EXPORT_VERSION);
      expect(exported.exportedAt).toBeTruthy();
    });

    it('accepts a bare v1 array', () => {
      const result = mergeImport([], JSON.stringify([makeProfile({ id: 'v1' })]));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.added).toBe(1);
    });

    it('merges into an existing profile by id, unioning records', () => {
      const current = [makeProfile({ id: 'p-1', records: { bcg: { date: '2024-01-05' } } })];
      const incoming = JSON.stringify(
        buildExport([makeProfile({ id: 'p-1', records: { opv: { date: '2024-02-05' } } })]),
      );
      const result = mergeImport(current, incoming);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.merged).toBe(1);
      expect(result.added).toBe(0);
      expect(Object.keys(result.profiles[0].records).sort()).toEqual(['bcg', 'opv']);
    });

    it('reports unparseable, foreign and empty payloads', () => {
      expect(mergeImport([], 'not json')).toEqual({ ok: false, reason: 'unparseable' });
      expect(mergeImport([], JSON.stringify({ app: 'someone-else', profiles: [] }))).toEqual({
        ok: false,
        reason: 'unsupported-app',
      });
      expect(mergeImport([], JSON.stringify(buildExport([])))).toEqual({
        ok: false,
        reason: 'no-profiles',
      });
    });
  });
});
