import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifespanSchedule } from '../data/lifespanSchedule';
import { READINESS_SCENARIOS, evaluateScenarioReadiness } from '../data/readinessScenarios';
import { mergeCloudAndLocalProfiles } from '../lib/cloudProfileMapper';
import {
  issuePassport,
  verifyPassportPayload,
} from '../lib/digitalPassport';
import { toISODate } from '../lib/format';
import { buildLifespanDoseIndex, resolveLifespanVaccineRecord } from '../lib/lifespanStatus';
import {
  hashPassword,
  localGetSession,
  localSignIn,
  localSignUp,
} from '../lib/localAuth';
import { SlidingWindowRateLimiter } from '../lib/rateLimit';
import { STORAGE_PREFIX } from '../lib/storage';
import { isValidPushEndpoint } from '../lib/webPushServer';
import { assessBmiForAge5to19, assessMeasurement } from '../lib/whoGrowth';
import type { Profile } from '../types';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('SlidingWindowRateLimiter', () => {
  it('allows up to maxRequests, blocks maxRequests + 1, and resets after window', () => {
    const limiter = new SlidingWindowRateLimiter({ windowMs: 10_000, maxRequests: 3 });
    const t0 = 1_700_000_000_000;

    expect(limiter.check('1.2.3.4', t0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.check('1.2.3.4', t0 + 100)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.check('1.2.3.4', t0 + 200)).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = limiter.check('1.2.3.4', t0 + 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    // Different key stays independent
    expect(limiter.check('5.6.7.8', t0 + 300).allowed).toBe(true);

    // After sliding window expires, requests are allowed again
    expect(limiter.check('1.2.3.4', t0 + 10_500)).toMatchObject({ allowed: true, remaining: 2 });
  });
});

describe('isValidPushEndpoint SSRF protection', () => {
  it('rejects non-HTTPS, private IPs, localhost, and untrusted hosts', () => {
    expect(isValidPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isValidPushEndpoint('https://localhost:3000/push')).toBe(false);
    expect(isValidPushEndpoint('https://127.0.0.1/push')).toBe(false);
    expect(isValidPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isValidPushEndpoint('https://10.0.0.5/push')).toBe(false);
    expect(isValidPushEndpoint('https://192.168.1.10/push')).toBe(false);
    expect(isValidPushEndpoint('https://evil.example.com/push')).toBe(false);
    expect(isValidPushEndpoint('https://user:pass@fcm.googleapis.com/fcm/send/abc')).toBe(false);
  });

  it('allows legitimate browser Web Push provider endpoints', () => {
    expect(isValidPushEndpoint('https://fcm.googleapis.com/fcm/send/token-123')).toBe(true);
    expect(isValidPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isValidPushEndpoint('https://web.push.apple.com/Q123456')).toBe(true);
  });
});

describe('localAuth PBKDF2-SHA256 storage & legacy upgrade', () => {
  it('stores new accounts using PBKDF2-SHA256 when SubtleCrypto is available', async () => {
    const res = await localSignUp('parent@example.com', 'StrongPass99!', 'Tariq Parent');
    expect(res.error).toBeNull();
    expect(res.user?.email).toBe('parent@example.com');
    expect(localGetSession()?.id).toBe(res.user?.id);

    const raw = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}local-users`) || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].passwordKdf).toBe('pbkdf2-sha256-100000');
  });

  it('transparently upgrades legacy sha256 accounts upon sign-in', async () => {
    const salt = 'legacy-salt-hex';
    const password = 'MyLegacyPassword1!';
    const legacyHash = await hashPassword(password, salt);

    localStorage.setItem(
      `${STORAGE_PREFIX}local-users`,
      JSON.stringify([
        {
          id: 'user-legacy-1',
          email: 'legacy@example.com',
          full_name: 'Legacy User',
          language_preference: 'en',
          email_verified: false,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          passwordSalt: salt,
          passwordHash: legacyHash,
          passwordKdf: 'sha256',
        },
      ]),
    );

    const signInRes = await localSignIn('legacy@example.com', password);
    expect(signInRes.error).toBeNull();
    expect(signInRes.user?.id).toBe('user-legacy-1');

    const upgraded = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}local-users`) || '[]');
    expect(upgraded[0].passwordKdf).toBe('pbkdf2-sha256-100000');
    expect(upgraded[0].passwordSalt).not.toBe(salt);
    expect(upgraded[0].passwordHash).not.toBe(legacyHash);
  });
});

describe('mergeCloudAndLocalProfiles deletion tombstones', () => {
  const makeProfile = (id: string, name: string): Profile => ({
    id,
    name,
    dateOfBirth: '2024-01-15',
    records: {},
    events: [],
    createdAt: '2025-01-01T00:00:00.000Z',
  });

  it('prevents deleted local profile IDs from resurrecting from cloud snapshots', () => {
    const local = [makeProfile('keep-1', 'Amina')];
    const cloud = [makeProfile('keep-1', 'Amina'), makeProfile('deleted-2', 'Old Draft')];

    const merged = mergeCloudAndLocalProfiles(local, cloud, ['deleted-2']);
    expect(merged.map((p) => p.id)).toEqual(['keep-1']);
  });
});

describe('readinessScenarios local calendar date math', () => {
  it('computes latestClinicDate without UTC off-by-one shifts', () => {
    const hajj = READINESS_SCENARIOS.find((s) => s.id === 'hajj');
    expect(hajj).toBeDefined();

    const targetDate = '2028-06-15';
    const result = evaluateScenarioReadiness(['hajj'], null, targetDate);
    const meningococcal = result.items.find(
      (item) => item.recommendation.vaccineId === 'meningococcal-acwy',
    );
    expect(meningococcal).toBeDefined();
    expect(meningococcal?.latestClinicDate).toBe('2028-06-05');
    expect(toISODate(new Date(2028, 5, 5))).toBe('2028-06-05');
  });
});

describe('resolveLifespanVaccineRecord multi-dose milestone isolation', () => {
  it('marks 12-months Varicella completed on 1 dose without marking 4-6-years Varicella-2 completed', () => {
    const index = buildLifespanDoseIndex();
    const m12 = lifespanSchedule.find((m) => m.id === '12-months')!;
    const m4to6y = lifespanSchedule.find((m) => m.id === '4-6-years')!;
    expect(m12).toBeDefined();
    expect(m4to6y).toBeDefined();

    const oneDoseProfile: Profile = {
      id: 'child-1',
      name: 'Rafi',
      dateOfBirth: '2021-01-01',
      records: {},
      events: [
        {
          id: 'ev-var-1',
          profileId: 'child-1',
          vaccineId: 'varicella',
          seriesId: 'varicella',
          scheduleVersion: 'bd-epi-2025',
          doseNumber: null,
          scheduledDoseId: null,
          date: '2022-02-01',
          createdAt: '2022-02-01T08:00:00.000Z',
          updatedAt: '2022-02-01T08:00:00.000Z',
          provenance: 'manual',
          needsReview: false,
        },
      ],
      createdAt: '2022-01-01T00:00:00.000Z',
    };

    const emptySchedule = new Map();
    const first = resolveLifespanVaccineRecord(oneDoseProfile, m12, 'varicella', emptySchedule, index);
    const second = resolveLifespanVaccineRecord(oneDoseProfile, m4to6y, 'varicella', emptySchedule, index);

    expect(first.recorded).toBe(true);
    expect(first.date).toBe('2022-02-01');
    expect(second.recorded).toBe(false);
    expect(second.suggestedDoseNumber).toBe(2);

    const twoDoseProfile: Profile = {
      ...oneDoseProfile,
      events: [
        ...(oneDoseProfile.events ?? []),
        {
          id: 'ev-var-2',
          profileId: 'child-1',
          vaccineId: 'varicella',
          seriesId: 'varicella',
          scheduleVersion: 'bd-epi-2025',
          doseNumber: 2,
          scheduledDoseId: null,
          date: '2025-03-10',
          createdAt: '2025-03-10T08:00:00.000Z',
          updatedAt: '2025-03-10T08:00:00.000Z',
          provenance: 'manual',
          needsReview: false,
        },
      ],
    };

    const secondCompleted = resolveLifespanVaccineRecord(
      twoDoseProfile,
      m4to6y,
      'varicella',
      emptySchedule,
      index,
    );
    expect(secondCompleted.recorded).toBe(true);
    expect(secondCompleted.date).toBe('2025-03-10');
  });
});

describe('WHO 5-19y BMI-for-age assessment', () => {
  it('classifies thinness, normal, overweight, and obesity for a 10-year-old while 0-60m assessMeasurement stays null', () => {
    const months = 120; // 10 years
    expect(assessMeasurement('male', 'weight', months, 32)).toBeNull();

    const heightCm = 140; // height^2 = 1.96 m^2
    const thin = assessBmiForAge5to19('male', months, 24, heightCm); // BMI ~ 12.2
    const normal = assessBmiForAge5to19('male', months, 32, heightCm); // BMI ~ 16.3
    const over = assessBmiForAge5to19('male', months, 39, heightCm); // BMI ~ 19.9
    const obese = assessBmiForAge5to19('male', months, 48, heightCm); // BMI ~ 24.5

    expect(thin?.band).toBe('thinness');
    expect(normal?.band).toBe('normal');
    expect(over?.band).toBe('overweight');
    expect(obese?.band).toBe('obesity');
  });
});

describe('portable ECDSA P-256 passport (TIKAPASS3)', () => {
  it('issues and verifies a cross-device TIKAPASS3 passport offline without local HMAC secrets', async () => {
    const profile: Profile = {
      id: 'prof-ecdsa-1',
      name: 'Nusrat Jahan',
      dateOfBirth: '2023-05-12',
      records: {},
      events: [
        {
          id: 'ev-bcg-1',
          profileId: 'prof-ecdsa-1',
          vaccineId: 'bcg',
          seriesId: 'bcg',
          scheduleVersion: 'bd-epi-2025',
          doseNumber: 1,
          scheduledDoseId: 'bcg#1@0d',
          date: '2023-05-15',
          createdAt: '2023-05-15T09:00:00.000Z',
          updatedAt: '2023-05-15T09:00:00.000Z',
          provenance: 'manual',
          needsReview: false,
        },
      ],
      createdAt: '2023-05-15T09:00:00.000Z',
    };

    const issued = await issuePassport({ profile, mode: 'portable-ecdsa' });
    expect(issued.passport).not.toBeNull();
    const passport = issued.passport!;
    expect(passport.payload.startsWith('TIKAPASS3|')).toBe(true);
    expect(passport.algorithm).toBe('ecdsa-p256');

    // Clear all local device keys to prove cross-device verification needs no shared secret
    localStorage.clear();

    const verified = await verifyPassportPayload(passport.payload);
    expect(verified.status).toBe('valid');
    if (verified.status === 'valid') {
      expect(verified.passport.memberName).toBe('Nusrat Jahan');
      expect(verified.passport.doses).toHaveLength(1);
    }

    // Tampering a single character invalidates the ECDSA signature
    const tamperedPayload = passport.payload.replace('Nusrat Jahan', 'Nusrat Karim');
    const tampered = await verifyPassportPayload(tamperedPayload);
    expect(tampered.status).toBe('tampered');
  });
});
