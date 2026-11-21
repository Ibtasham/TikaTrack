import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { issuePassport, loadPassports, upsertPassport } from '../lib/digitalPassport';
import {
  buildPassportCardData,
  buildPdfFromJpeg,
  buildTextFallbackPdf,
  ensurePassportForProfile,
  passportCardToPdfBlob,
} from '../lib/passportExport';
import { addDays, startOfToday, toISODate } from '../lib/format';
import { createProfile, recordDose, recordDoseEvent } from '../lib/profileStore';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';

const en = translations.en;
const bn = translations.bn;

function seedMemberWithDoses() {
  const dob = toISODate(addDays(startOfToday(), -180));
  const created = createProfile({
    name: 'Tariq Mahmud',
    dateOfBirth: dob,
    relationship: 'child',
    gender: 'male',
  });
  if (!created.profile) throw new Error('Failed to create test profile');

  let profiles = recordDoseEvent([created.profile], created.profile.id, {
    vaccineId: 'bcg',
    date: toISODate(addDays(startOfToday(), -175)),
    centre: 'Dhaka Shishu Hospital',
    batch: 'BCG-441',
    doseNumber: 1,
  }).profiles;
  profiles = recordDose(profiles, created.profile.id, 'pentavalent', {
    date: toISODate(addDays(startOfToday(), -120)),
    centre: 'Mohakhali EPI Centre',
    doseNumber: 1,
  });

  writeJSON(STORAGE_KEYS.profiles, profiles);
  return profiles[0];
}

describe('Vaccination Passport export & PDF/Card generation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    vi.restoreAllMocks();
  });

  it('builds a spec-compliant PDF 1.4 from JPEG image bytes', async () => {
    // Minimal synthetic JPEG header + bytes (SOI + APP0 + EOI)
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0xff, 0xd9]);
    const pdfBlob = buildPdfFromJpeg(fakeJpeg, 1240, 1754);

    expect(pdfBlob.type).toBe('application/pdf');
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);

    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Pages');
    expect(text).toContain('/Type /Page');
    expect(text).toContain('/Subtype /Image');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain('/Width 1240');
    expect(text).toContain('/Height 1754');
    expect(text).toContain('xref\n');
    expect(text).toContain('trailer\n');
    expect(text).toContain('%%EOF');
  });

  it('builds a valid fallback text PDF when canvas JPEG encoding is unavailable', async () => {
    const profile = seedMemberWithDoses();
    const { passport } = await issuePassport({ profile });
    expect(passport).not.toBeNull();
    if (!passport) return;

    const cardData = buildPassportCardData({
      passport,
      profile,
      language: 'en',
    });

    const fallbackBlob = buildTextFallbackPdf(cardData);
    expect(fallbackBlob.type).toBe('application/pdf');
    const text = new TextDecoder('latin1').decode(new Uint8Array(await fallbackBlob.arrayBuffer()));
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text).toContain('Tariq Mahmud');
    expect(text).toContain('Dhaka Shishu Hospital');
    expect(text).toContain('%%EOF');

    const autoBlob = await passportCardToPdfBlob(cardData);
    expect(autoBlob.type).toBe('application/pdf');
    expect(autoBlob.size).toBeGreaterThan(200);
  });

  it('buildPassportCardData localises vaccine names in EN and BN and tracks full ledger history', async () => {
    const profile = seedMemberWithDoses();
    const { passport } = await issuePassport({ profile });
    expect(passport).not.toBeNull();
    if (!passport) return;

    const stored = {
      id: passport.id,
      profileId: profile.id,
      memberName: passport.memberName,
      dateOfBirth: passport.dateOfBirth,
      issuedAt: passport.issuedAt,
      payload: passport.payload,
      algorithm: passport.algorithm,
    };

    const enData = buildPassportCardData({ passport: stored, profile, language: 'en' });
    const bnData = buildPassportCardData({ passport: stored, profile, language: 'bn' });

    expect(enData.doses).toHaveLength(2);
    expect(enData.doses[0].centre).toContain('Dhaka Shishu Hospital');
    expect(enData.doses[0].centre).toContain('Batch: BCG-441');
    expect(enData.doses[0].doseLabel).toBe('Dose 1');

    expect(bnData.doses).toHaveLength(2);
    expect(bnData.doses[0].doseLabel).toBe('ডোজ ১');
    expect(bnData.relationshipLabel).toBe('সন্তান');
  });

  it('ensurePassportForProfile issues when absent and reuses when up to date', async () => {
    const profile = seedMemberWithDoses();
    expect(loadPassports()).toHaveLength(0);

    const first = await ensurePassportForProfile(profile);
    expect(first).not.toBeNull();
    expect(loadPassports()).toHaveLength(1);

    const second = await ensurePassportForProfile(profile);
    expect(second?.id).toBe(first?.id);
  });

  it('renders Download Vaccination Passport button on /passport and triggers PDF download', async () => {
    const user = userEvent.setup();
    const profile = seedMemberWithDoses();
    const issued = await issuePassport({ profile });
    if (!issued.passport) throw new Error('expected passport');
    upsertPassport({
      id: issued.passport.id,
      profileId: profile.id,
      memberName: issued.passport.memberName,
      dateOfBirth: issued.passport.dateOfBirth,
      issuedAt: issued.passport.issuedAt,
      payload: issued.passport.payload,
      algorithm: issued.passport.algorithm,
    });

    const createObjectURL = vi.fn(() => 'blob:mock-passport-url');
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      window.history.pushState({}, '', '/passport');
      render(<App />);

      const pdfBtn = await screen.findByRole('button', {
        name: en['passport.download.passportPdf'],
      });
      const pngBtn = screen.getByRole('button', {
        name: en['passport.download.cardPng'],
      });

      expect(pdfBtn).toBeTruthy();
      expect(pngBtn).toBeTruthy();

      await user.click(pdfBtn);

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      expect(anchorClick).toHaveBeenCalledTimes(1);
      const downloadedBlob = (createObjectURL.mock.calls as unknown[][])[0][0] as Blob;
      expect(downloadedBlob.type).toBe('application/pdf');
      expect(await screen.findByText(en['passport.download.pdfDone'])).toBeTruthy();
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('renders high-res Passport Card Canvas and triggers PNG card download when Canvas 2D is active', async () => {
    const user = userEvent.setup();
    const profile = seedMemberWithDoses();
    const issued = await issuePassport({ profile });
    if (!issued.passport) throw new Error('expected passport');
    upsertPassport({
      id: issued.passport.id,
      profileId: profile.id,
      memberName: issued.passport.memberName,
      dateOfBirth: issued.passport.dateOfBirth,
      issuedAt: issued.passport.issuedAt,
      payload: issued.passport.payload,
      algorithm: issued.passport.algorithm,
    });

    const fillTextCalls: string[] = [];
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      measureText: (txt: string) => ({ width: txt.length * 8 }),
      fillText: (txt: string) => {
        fillTextCalls.push(String(txt));
      },
    } as unknown as CanvasRenderingContext2D;

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback, type?: string) {
      cb(new Blob(['fake-png'], { type: type ?? 'image/png' }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    const createObjectURL = vi.fn(() => 'blob:mock-png-url');
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      window.history.pushState({}, '', '/passport');
      render(<App />);

      const pngBtn = await screen.findByRole('button', {
        name: en['passport.download.cardPng'],
      });
      await user.click(pngBtn);

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      expect(anchorClick).toHaveBeenCalledTimes(1);
      const downloadedBlob = (createObjectURL.mock.calls as unknown[][])[0][0] as Blob;
      expect(downloadedBlob.type).toBe('image/png');
      expect(fillTextCalls.some((text) => text.includes('Tariq Mahmud'))).toBe(true);
      expect(fillTextCalls.some((text) => text.includes('Dhaka Shishu Hospital'))).toBe(true);
      expect(await screen.findByText(en['passport.download.cardDone'])).toBeTruthy();
    } finally {
      HTMLCanvasElement.prototype.getContext = origGetContext;
      HTMLCanvasElement.prototype.toBlob = origToBlob;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('renders Download Vaccination Passport in Bangla on /tracker and auto-issues PDF', async () => {
    const user = userEvent.setup();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    seedMemberWithDoses();

    const createObjectURL = vi.fn(() => 'blob:mock-bn-passport-url');
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      window.history.pushState({}, '', '/tracker');
      render(<App />);

      const trackerPassportBtn = await screen.findByRole('button', {
        name: bn['tracker.passport.download'],
      });
      expect(trackerPassportBtn).toBeTruthy();

      await user.click(trackerPassportBtn);

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(loadPassports()).toHaveLength(1);
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});
