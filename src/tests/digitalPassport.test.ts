import { beforeEach, describe, expect, it } from 'vitest';

import {
  deletePassport,
  issuePassport,
  loadPassports,
  parsePassportPayload,
  passportToQR,
  PAYLOAD_PREFIX,
  PASSPORT_FORMAT_VERSION,
  signPayload,
  upsertPassport,
  verifyPassportPayload,
  type StoredPassport,
} from '../lib/digitalPassport';
import { SCHEDULE_VERSION, seriesIdFor } from '../lib/doseLedger';
import type { DoseRecord, Profile, VaccinationEvent } from '../types';

function makeProfile(records: Record<string, DoseRecord>): Profile {
  return {
    id: 'p-1',
    name: 'Asha Rahman',
    dateOfBirth: '2024-01-01',
    records,
  };
}

const TWO_DOSES: Record<string, DoseRecord> = {
  bcg: { date: '2024-03-05' },
  opv: { date: '2024-04-05' },
};

/** A ledger event, written out the way `doseLedger.buildEvent` would. */
function event(
  vaccineId: string,
  doseNumber: number | null,
  date: string,
  extra: Partial<VaccinationEvent> = {},
): VaccinationEvent {
  return {
    id: `dose-${vaccineId}-${doseNumber ?? 'x'}-${date}`,
    profileId: 'p-1',
    vaccineId,
    scheduleVersion: SCHEDULE_VERSION,
    seriesId: seriesIdFor(vaccineId),
    doseNumber,
    scheduledDoseId: null,
    date,
    createdAt: '2024-05-01T00:00:00.000Z',
    provenance: 'manual',
    ...extra,
  };
}

/** A profile carrying a ledger rather than the legacy one-slot map. */
function ledgerProfile(events: VaccinationEvent[]): Profile {
  return { id: 'p-1', name: 'Asha Rahman', dateOfBirth: '2024-01-01', records: {}, events };
}

describe('digitalPassport', () => {
  // Each test issues and verifies with the same per-device key, so wipe storage
  // to keep the key (and any saved passports) from leaking between cases.
  beforeEach(() => {
    localStorage.clear();
  });

  describe('issuePassport', () => {
    it('builds a signed payload with the format prefix', async () => {
      const { passport, error } = await issuePassport({
        profile: makeProfile(TWO_DOSES),
        issuedAt: '2024-06-01T00:00:00.000Z',
      });
      expect(error).toBeUndefined();
      expect(passport).not.toBeNull();
      expect(passport!.payload.startsWith(`${PAYLOAD_PREFIX}|`)).toBe(true);
      expect(passport!.doses).toHaveLength(2);
      expect(passport!.memberName).toBe('Asha Rahman');
    });

    it('refuses a profile with no id', async () => {
      const { passport, error } = await issuePassport({
        profile: { ...makeProfile(TWO_DOSES), id: '' },
      });
      expect(passport).toBeNull();
      expect(error).toBe('no-profile');
    });

    it('trims notes then doses to fit a symbol, and says what it left out', async () => {
      const records: Record<string, DoseRecord> = {};
      for (let i = 0; i < 12; i += 1) {
        records[`vaccine-number-${i}-abcdefghijkl`] = {
          date: '2024-01-05',
          notes: 'x'.repeat(30),
        };
      }
      const result = await issuePassport({ profile: makeProfile(records) });

      // 2.x refused the certificate outright here. A family that cannot get a
      // certificate gets no benefit from being told it was too big, so the
      // symbol is trimmed instead — with the omission reported, never silent.
      expect(result.error).toBeUndefined();
      expect(result.passport).not.toBeNull();
      expect(result.totalDoses).toBe(12);
      expect(result.notesDropped).toBe(true);
      expect(result.omittedDoses).toBeGreaterThan(0);
      expect(result.warnings).toContain('notes-dropped');
      expect(result.warnings).toContain('truncated');
      expect(result.passport!.doses.every((dose) => dose.note === undefined)).toBe(true);
      expect(result.passport!.doses.length).toBe(12 - result.omittedDoses);
      expect((await verifyPassportPayload(result.passport!.payload)).status).toBe('valid');
    });

    it('encodes the dose number of every dose in the ledger', async () => {
      const { passport } = await issuePassport({
        profile: ledgerProfile([
          event('opv', 1, '2024-01-05'),
          event('opv', 2, '2024-02-19'),
          event('opv', 3, '2024-03-18'),
          event('pentavalent', 2, '2024-02-19', { batch: 'BX-4471' }),
        ]),
      });

      // Three OPV doses appear three times: the certificate is dose-level now.
      expect(passport!.doses).toHaveLength(4);
      expect(passport!.payload).toContain('opv:1:2024-01-05');
      expect(passport!.payload).toContain('opv:2:2024-02-19');
      expect(passport!.payload).toContain('opv:3:2024-03-18');
      expect(passport!.payload).toContain('pentavalent:2:2024-02-19');

      const parsed = parsePassportPayload(passport!.payload);
      // Sorted by date, ties broken by vaccine id: OPV-1, OPV-2, Pentavalent-2,
      // OPV-3.
      expect(parsed!.doses.map((dose) => dose.doseNumber)).toEqual([1, 2, 2, 3]);
    });

    it('encodes an unknown dose number as a placeholder instead of guessing', async () => {
      const { passport } = await issuePassport({
        profile: ledgerProfile([event('opv', null, '2024-01-05')]),
      });

      expect(passport!.payload).toContain('opv:?:2024-01-05');
      const parsed = parsePassportPayload(passport!.payload);
      expect(parsed!.doses[0].doseNumber).toBeNull();
    });
  });

  describe('verifyPassportPayload', () => {
    it('round-trips a freshly issued certificate as valid', async () => {
      const { passport } = await issuePassport({ profile: makeProfile(TWO_DOSES) });
      const result = await verifyPassportPayload(passport!.payload);
      expect(result.status).toBe('valid');
      if (result.status !== 'valid') return;
      expect(result.passport.memberName).toBe('Asha Rahman');
      expect(result.passport.doses).toHaveLength(2);
    });

    it('detects a altered dose date as tampered', async () => {
      const { passport } = await issuePassport({ profile: makeProfile(TWO_DOSES) });
      const tampered = passport!.payload.replace('2024-03-05', '2024-03-06');
      expect(tampered).not.toBe(passport!.payload);
      const result = await verifyPassportPayload(tampered);
      expect(result.status).toBe('tampered');
    });

    it('rejects empty and malformed payloads as invalid', async () => {
      expect((await verifyPassportPayload('')).status).toBe('invalid');
      expect((await verifyPassportPayload('just some text')).status).toBe('invalid');
      expect((await verifyPassportPayload('TIKAPASS1|only|three')).status).toBe('invalid');
    });

    it('flags a certificate from a newer format version', async () => {
      const future = PASSPORT_FORMAT_VERSION + 7;
      const result = await verifyPassportPayload(`TIKAPASS${future}|a|2024-01-01|now||sig`);
      expect(result.status).toBe('unsupported-version');
    });

    it('still verifies a v1 certificate issued before the dose ledger', async () => {
      // A certificate already in circulation must keep working: the payload is
      // signed with the same device key and read with the v1 field order.
      const body = 'TIKAPASS1|Asha Rahman|2024-01-01|2024-06-01|bcg:2024-03-05,opv:2024-04-05:note';
      const { signature } = await signPayload(body);
      const result = await verifyPassportPayload(`${body}|${signature}`);

      expect(result.status).toBe('valid');
      if (result.status !== 'valid') return;
      expect(result.passport.doses).toHaveLength(2);
      // The v1 layout had no dose number, so it reads back as unknown — not 1.
      expect(result.passport.doses.map((dose) => dose.doseNumber)).toEqual([null, null]);
      expect(result.passport.doses[1].note).toBe('note');
    });
  });

  describe('parsePassportPayload', () => {
    it('reads the fields back without checking the signature', async () => {
      const { passport } = await issuePassport({ profile: makeProfile(TWO_DOSES) });
      const parsed = parsePassportPayload(passport!.payload);
      expect(parsed).not.toBeNull();
      expect(parsed!.memberName).toBe('Asha Rahman');
      expect(parsed!.dateOfBirth).toBe('2024-01-01');
      expect(parsed!.doses.map((dose) => dose.vaccineId).sort()).toEqual(['bcg', 'opv']);
    });

    it('returns null for a non-passport string', () => {
      expect(parsePassportPayload('hello world')).toBeNull();
    });
  });

  describe('passportToQR', () => {
    it('renders a square module grid and an SVG string', async () => {
      const { passport } = await issuePassport({ profile: makeProfile(TWO_DOSES) });
      const { qr, svg } = passportToQR(passport!.payload, { pixelSize: 4 });
      expect(qr.size).toBeGreaterThan(0);
      expect(qr.modules).toHaveLength(qr.size);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('local storage', () => {
    it('upserts, loads and deletes a stored passport', async () => {
      const { passport } = await issuePassport({ profile: makeProfile(TWO_DOSES) });
      const stored: StoredPassport = {
        id: passport!.id,
        profileId: passport!.profileId,
        memberName: passport!.memberName,
        dateOfBirth: passport!.dateOfBirth,
        issuedAt: passport!.issuedAt,
        payload: passport!.payload,
        algorithm: passport!.algorithm,
      };

      expect(loadPassports()).toHaveLength(0);
      upsertPassport(stored);
      expect(loadPassports()).toHaveLength(1);

      // Upserting the same id replaces rather than duplicates.
      upsertPassport({ ...stored, memberName: 'Asha R.' });
      const afterUpdate = loadPassports();
      expect(afterUpdate).toHaveLength(1);
      expect(afterUpdate[0].memberName).toBe('Asha R.');

      deletePassport(stored.id);
      expect(loadPassports()).toHaveLength(0);
    });
  });
});
