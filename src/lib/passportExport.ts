import { allVaccines } from '../data/vaccines';
import type { Language } from '../i18n/types';
import type { Profile } from '../types';
import {
  issuePassport,
  loadPassports,
  parsePassportPayload,
  passportToQR,
  upsertPassport,
  type StoredPassport,
} from './digitalPassport';
import { formatAge, formatDate, localiseNumber, todayISO } from './format';
import { safeFilename } from './share';
import { calculateVaccinationStats } from './smartScheduler';
import { generateQR } from './qr';

export interface PassportCardDoseRow {
  vaccineId: string;
  name: string;
  doseNumber: number | null;
  doseLabel: string;
  date: string;
  dateFormatted: string;
  centre?: string;
  batch?: string;
}

export interface PassportCardData {
  certificateId: string;
  memberName: string;
  dateOfBirth: string;
  dateOfBirthFormatted: string;
  ageFormatted: string;
  relationshipLabel?: string;
  genderLabel?: string;
  issuedAt: string;
  issuedAtFormatted: string;
  algorithm: StoredPassport['algorithm'];
  payload: string;
  doses: PassportCardDoseRow[];
  totalDoseCount: number;
  qrDoseCount: number;
  omittedDoses: number;
  coveragePercentage?: number;
  language: Language;
}

export interface PassportExportStrings {
  brandTagline: string;
  documentTitle: string;
  certificateIdLabel: string;
  issuedLabel: string;
  dobLabel: string;
  ageLabel: string;
  dosesRecordedLabel: string;
  coverageLabel: string;
  scanToVerify: string;
  algorithmNote: string;
  historyTitle: string;
  colIndex: string;
  colVaccine: string;
  colDose: string;
  colDate: string;
  colCentre: string;
  noDosesRecorded: string;
  truncatedNote: string;
  disclaimer: string;
  footerGenerated: string;
}

const DEFAULT_EN_STRINGS: PassportExportStrings = {
  brandTagline: 'TikaTrack · Personal Immunization Record',
  documentTitle: 'Vaccination Passport',
  certificateIdLabel: 'Certificate ID',
  issuedLabel: 'Issued',
  dobLabel: 'Date of birth',
  ageLabel: 'Age',
  dosesRecordedLabel: 'Doses recorded',
  coverageLabel: 'Schedule progress',
  scanToVerify: 'Scan in TikaTrack to verify',
  algorithmNote: 'Device-signed QR',
  historyTitle: 'Immunization History',
  colIndex: '#',
  colVaccine: 'Vaccine',
  colDose: 'Dose',
  colDate: 'Date given',
  colCentre: 'Centre / Batch',
  noDosesRecorded: 'No vaccination doses have been recorded for this member yet.',
  truncatedNote: 'QR code encodes {0} of {1} doses due to QR capacity; all recorded doses are listed here.',
  disclaimer:
    'Personal record generated on-device — not an official government certificate for travel or legal checks.',
  footerGenerated: 'Generated on {0}',
};

const DEFAULT_BN_STRINGS: PassportExportStrings = {
  brandTagline: 'টিকাট্র্যাক · ব্যক্তিগত টিকাদান রেকর্ড',
  documentTitle: 'টিকাদান পাসপোর্ট',
  certificateIdLabel: 'সনদ নম্বর',
  issuedLabel: 'ইস্যুর তারিখ',
  dobLabel: 'জন্ম তারিখ',
  ageLabel: 'বয়স',
  dosesRecordedLabel: 'সংরক্ষিত ডোজ',
  coverageLabel: 'সূচির অগ্রগতি',
  scanToVerify: 'যাচাই করতে টিকাট্র্যাকে স্ক্যান করুন',
  algorithmNote: 'ডিভাইসে স্বাক্ষরিত QR',
  historyTitle: 'টিকাদানের ইতিহাস',
  colIndex: 'নং',
  colVaccine: 'টিকা',
  colDose: 'ডোজ',
  colDate: 'প্রদানের তারিখ',
  colCentre: 'কেন্দ্র / ব্যাচ',
  noDosesRecorded: 'এই সদস্যের এখনো কোনো ডোজ সংরক্ষিত হয়নি।',
  truncatedNote:
    'QR কোডের সীমার কারণে {1}টি ডোজের মধ্যে {0}টি QR-এ যুক্ত হয়েছে; সম্পূর্ণ তালিকা এখানে রয়েছে।',
  disclaimer:
    'এটি ডিভাইসে তৈরি একটি ব্যক্তিগত রেকর্ড — ভ্রমণ বা দাফতরিক যাচাইয়ের জন্য সরকারি সনদ নয়।',
  footerGenerated: 'তৈরির তারিখ: {0}',
};

export function defaultPassportExportStrings(language: Language): PassportExportStrings {
  return language === 'bn' ? DEFAULT_BN_STRINGS : DEFAULT_EN_STRINGS;
}

const RELATIONSHIP_LABELS: Record<Language, Record<string, string>> = {
  en: {
    self: 'Self',
    child: 'Child',
    spouse: 'Spouse',
    parent: 'Parent',
    sibling: 'Sibling',
    other: 'Other',
  },
  bn: {
    self: 'নিজে',
    child: 'সন্তান',
    spouse: 'স্বামী/স্ত্রী',
    parent: 'বাবা/মা',
    sibling: 'ভাই/বোন',
    other: 'অন্যান্য',
  },
};

const GENDER_LABELS: Record<Language, Record<string, string>> = {
  en: { female: 'Female', male: 'Male', other: 'Other' },
  bn: { female: 'নারী', male: 'পুরুষ', other: 'অন্যান্য' },
};

function formatDoseLabel(doseNumber: number | null, language: Language): string {
  if (doseNumber === null || doseNumber === undefined) {
    return language === 'bn' ? 'নির্ধারিত নয়' : 'Unnumbered';
  }
  const num = localiseNumber(doseNumber, language);
  return language === 'bn' ? `ডোজ ${num}` : `Dose ${num}`;
}

export function buildPassportCardData(input: {
  passport: StoredPassport;
  profile?: Profile;
  language: Language;
  vaccineNameById?: Map<string, { en: string; bn: string }>;
}): PassportCardData {
  const { passport, profile, language } = input;
  const names =
    input.vaccineNameById ??
    new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine.name]));

  const parsed = parsePassportPayload(passport.payload);
  const qrDoses = parsed?.doses ?? [];

  let doses: PassportCardDoseRow[] = [];

  if (profile && (profile.events?.length ?? 0) > 0) {
    const sorted = [...(profile.events ?? [])].sort(
      (a, b) => a.date.localeCompare(b.date) || a.vaccineId.localeCompare(b.vaccineId),
    );
    doses = sorted.map((event) => {
      const localised = names.get(event.vaccineId);
      const batchPart = event.batch ? `Batch: ${event.batch}` : undefined;
      const centreCombined = [event.centre, batchPart].filter(Boolean).join(' · ') || undefined;
      return {
        vaccineId: event.vaccineId,
        name: localised ? localised[language] : event.vaccineId,
        doseNumber: event.doseNumber,
        doseLabel: formatDoseLabel(event.doseNumber, language),
        date: event.date,
        dateFormatted: formatDate(event.date, language),
        centre: centreCombined,
        batch: event.batch,
      };
    });
  } else if (qrDoses.length > 0) {
    doses = qrDoses.map((dose) => {
      const localised = names.get(dose.vaccineId);
      return {
        vaccineId: dose.vaccineId,
        name: localised ? localised[language] : dose.vaccineId,
        doseNumber: dose.doseNumber,
        doseLabel: formatDoseLabel(dose.doseNumber, language),
        date: dose.date,
        dateFormatted: formatDate(dose.date, language),
        centre: dose.note,
      };
    });
  }

  const totalDoseCount = Math.max(
    doses.length,
    passport.totalDoses ?? qrDoses.length + (passport.omittedDoses ?? 0),
  );
  const qrDoseCount = qrDoses.length;
  const omittedDoses = Math.max(passport.omittedDoses ?? totalDoseCount - qrDoseCount, 0);

  const dob = profile?.dateOfBirth || passport.dateOfBirth;
  const coveragePercentage = profile
    ? calculateVaccinationStats(profile.dateOfBirth, profile).progressPercentage
    : undefined;

  return {
    certificateId: passport.id,
    memberName: profile?.name || passport.memberName,
    dateOfBirth: dob,
    dateOfBirthFormatted: formatDate(dob, language),
    ageFormatted: formatAge(dob, language),
    relationshipLabel: profile?.relationship
      ? RELATIONSHIP_LABELS[language][profile.relationship]
      : undefined,
    genderLabel: profile?.gender ? GENDER_LABELS[language][profile.gender] : undefined,
    issuedAt: passport.issuedAt,
    issuedAtFormatted: formatDate(passport.issuedAt, language),
    algorithm: passport.algorithm,
    payload: passport.payload,
    doses,
    totalDoseCount,
    qrDoseCount,
    omittedDoses,
    coveragePercentage,
    language,
  };
}

/** Checks if a stored passport is missing or behind the member's current record. */
export function isPassportOutdated(
  passport: StoredPassport | null | undefined,
  profile: Profile | undefined,
): boolean {
  if (!passport || !profile) return true;
  if (passport.memberName !== profile.name || passport.dateOfBirth !== profile.dateOfBirth) {
    return true;
  }
  const events = profile.events ?? [];
  const parsed = parsePassportPayload(passport.payload);
  const encodedTotal =
    passport.totalDoses ?? (parsed ? parsed.doses.length + (passport.omittedDoses ?? 0) : 0);
  if (events.length !== encodedTotal) return true;
  return events.some((event) => (event.updatedAt ?? event.createdAt) > passport.issuedAt);
}

/** Return an up-to-date StoredPassport for the member, issuing one if needed. */
export async function ensurePassportForProfile(profile: Profile): Promise<StoredPassport | null> {
  const existing = loadPassports().find((entry) => entry.profileId === profile.id) ?? null;
  if (existing && !isPassportOutdated(existing, profile)) {
    return existing;
  }
  const issued = await issuePassport({ profile });
  if (!issued.passport) return existing;

  const { svg } = passportToQR(issued.passport.payload, {
    pixelSize: 4,
    title: issued.passport.memberName,
  });

  const stored: StoredPassport = {
    id: issued.passport.id,
    profileId: profile.id,
    memberName: issued.passport.memberName,
    dateOfBirth: issued.passport.dateOfBirth,
    issuedAt: issued.passport.issuedAt,
    payload: issued.passport.payload,
    algorithm: issued.passport.algorithm,
    svg,
    omittedDoses: issued.omittedDoses,
    totalDoses: issued.totalDoses,
  };
  upsertPassport(stored);
  return stored;
}

// ---------------------------------------------------------------------------
// High-resolution Canvas Renderer
// ---------------------------------------------------------------------------

const CARD_WIDTH = 1240;
const MIN_CARD_HEIGHT = 1754;
const PADDING_X = 72;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function formatTemplate(template: string, ...args: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (_, idx) => String(args[Number(idx)] ?? ''));
}

export function renderPassportCardCanvas(
  data: PassportCardData,
  strings: PassportExportStrings = defaultPassportExportStrings(data.language),
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const fontStack =
    data.language === 'bn'
      ? "'Noto Sans Bengali', 'Hind Siliguri', system-ui, -apple-system, sans-serif"
      : "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";

  const rowHeight = 58;
  const tableHeaderH = 48;
  const visibleRowsCount = Math.max(data.doses.length, 1);
  const estimatedTableHeight = tableHeaderH + visibleRowsCount * rowHeight + 80;
  const headerAndSummaryHeight = 680;
  const footerHeight = 140;
  const cardHeight = Math.max(
    MIN_CARD_HEIGHT,
    headerAndSummaryHeight + estimatedTableHeight + footerHeight,
  );

  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);

  // Top Header Band
  const headerH = 188;
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, headerH);
  grad.addColorStop(0, '#064e3b');
  grad.addColorStop(1, '#047857');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, headerH);

  // Subtle decorative shield mark on left of header
  const emblemX = PADDING_X;
  const emblemY = 48;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  drawRoundedRect(ctx, emblemX, emblemY, 84, 84, 20);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(emblemX + 42, emblemY + 18);
  ctx.lineTo(emblemX + 66, emblemY + 28);
  ctx.lineTo(emblemX + 66, emblemY + 46);
  ctx.quadraticCurveTo(emblemX + 66, emblemY + 66, emblemX + 42, emblemY + 72);
  ctx.quadraticCurveTo(emblemX + 18, emblemY + 66, emblemX + 18, emblemY + 46);
  ctx.lineTo(emblemX + 18, emblemY + 28);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(emblemX + 31, emblemY + 45);
  ctx.lineTo(emblemX + 39, emblemY + 54);
  ctx.lineTo(emblemX + 55, emblemY + 36);
  ctx.stroke();

  // Brand + Document Title
  ctx.fillStyle = '#a7f3d0';
  ctx.font = `600 18px ${fontStack}`;
  ctx.fillText(strings.brandTagline.toUpperCase(), emblemX + 106, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 40px ${fontStack}`;
  ctx.fillText(strings.documentTitle, emblemX + 106, 122);

  // Right-aligned certificate ID & issued date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a7f3d0';
  ctx.font = `600 15px ${fontStack}`;
  ctx.fillText(strings.certificateIdLabel.toUpperCase(), CARD_WIDTH - PADDING_X, 66);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 20px monospace`;
  ctx.fillText(data.certificateId, CARD_WIDTH - PADDING_X, 94);

  ctx.fillStyle = '#d1fae5';
  ctx.font = `500 17px ${fontStack}`;
  ctx.fillText(`${strings.issuedLabel}: ${data.issuedAtFormatted}`, CARD_WIDTH - PADDING_X, 130);
  ctx.textAlign = 'left';

  // Holder + QR Two-Column Section
  const sectionY = headerH + 46;
  const qrBoxSize = 336;
  const qrBoxX = CARD_WIDTH - PADDING_X - qrBoxSize;
  const qrBoxY = sectionY;
  const leftColW = qrBoxX - PADDING_X - 44;

  // Left: Member Name & Metadata
  ctx.fillStyle = '#111827';
  ctx.font = `800 38px ${fontStack}`;
  const nameLines = wrapTextLines(ctx, data.memberName, leftColW).slice(0, 2);
  let cursorY = sectionY + 36;
  for (const line of nameLines) {
    ctx.fillText(line, PADDING_X, cursorY);
    cursorY += 46;
  }

  const metaParts = [
    `${strings.dobLabel}: ${data.dateOfBirthFormatted}`,
    data.ageFormatted,
    data.relationshipLabel,
    data.genderLabel,
  ].filter(Boolean);
  ctx.fillStyle = '#4b5563';
  ctx.font = `500 20px ${fontStack}`;
  const metaLines = wrapTextLines(ctx, metaParts.join(' · '), leftColW).slice(0, 2);
  cursorY += 6;
  for (const line of metaLines) {
    ctx.fillText(line, PADDING_X, cursorY);
    cursorY += 28;
  }

  // Stats grid (2 clean boxes)
  cursorY += 18;
  const statW = Math.floor((leftColW - 20) / 2);
  const statH = 98;

  // Box 1: Doses recorded
  ctx.fillStyle = '#ecfdf5';
  drawRoundedRect(ctx, PADDING_X, cursorY, statW, statH, 14);
  ctx.fill();
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#065f46';
  ctx.font = `600 15px ${fontStack}`;
  ctx.fillText(strings.dosesRecordedLabel, PADDING_X + 20, cursorY + 32);
  ctx.font = `800 32px ${fontStack}`;
  ctx.fillText(localiseNumber(data.totalDoseCount, data.language), PADDING_X + 20, cursorY + 74);

  // Box 2: Coverage or QR encoded count
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, PADDING_X + statW + 20, cursorY, statW, statH, 14);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = `600 15px ${fontStack}`;
  const box2Label =
    data.coveragePercentage !== undefined ? strings.coverageLabel : strings.algorithmNote;
  ctx.fillText(box2Label, PADDING_X + statW + 40, cursorY + 32);
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 32px ${fontStack}`;
  const box2Val =
    data.coveragePercentage !== undefined
      ? `${localiseNumber(data.coveragePercentage, data.language)}%`
      : data.algorithm.toUpperCase();
  ctx.fillText(box2Val, PADDING_X + statW + 40, cursorY + 74);

  cursorY += statH + 22;

  // Disclaimer notice
  ctx.font = `500 16px ${fontStack}`;
  const discLines = wrapTextLines(ctx, strings.disclaimer, leftColW - 36);
  const discH = Math.max(70, discLines.length * 24 + 28);
  ctx.fillStyle = '#fffbeb';
  drawRoundedRect(ctx, PADDING_X, cursorY, leftColW, discH, 12);
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  let discY = cursorY + 28;
  for (const line of discLines) {
    ctx.fillText(line, PADDING_X + 18, discY);
    discY += 24;
  }

  // Right: QR Code Frame
  const qrFrameH = qrBoxSize + 68;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrFrameH, 18);
  ctx.fill();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Render crisp pixel-aligned QR directly from modules
  try {
    const qr = generateQR(data.payload);
    const pad = 20;
    const drawArea = qrBoxSize - pad * 2;
    const cell = Math.floor(drawArea / qr.size);
    const actualSize = cell * qr.size;
    const originX = qrBoxX + Math.floor((qrBoxSize - actualSize) / 2);
    const originY = qrBoxY + Math.floor((qrBoxSize - actualSize) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(originX, originY, actualSize, actualSize);
    ctx.fillStyle = '#0b1f1a';
    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.modules[y][x]) {
          ctx.fillRect(originX + x * cell, originY + y * cell, cell, cell);
        }
      }
    }
  } catch {
    // Payload guaranteed valid when issued; leave clear frame if malformed
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#065f46';
  ctx.font = `700 16px ${fontStack}`;
  ctx.fillText(strings.scanToVerify, qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 18);
  ctx.fillStyle = '#6b7280';
  ctx.font = `500 13px monospace`;
  ctx.fillText(
    `${data.algorithm.toUpperCase()} · ${data.qrDoseCount}/${data.totalDoseCount}`,
    qrBoxX + qrBoxSize / 2,
    qrBoxY + qrBoxSize + 44,
  );
  ctx.textAlign = 'left';

  // Immunization History Section
  let tableY = Math.max(cursorY + discH, qrBoxY + qrFrameH) + 48;

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 24px ${fontStack}`;
  ctx.fillText(strings.historyTitle, PADDING_X, tableY);

  if (data.omittedDoses > 0) {
    tableY += 28;
    ctx.fillStyle = '#92400e';
    ctx.font = `500 15px ${fontStack}`;
    ctx.fillText(
      formatTemplate(
        strings.truncatedNote,
        localiseNumber(data.qrDoseCount, data.language),
        localiseNumber(data.totalDoseCount, data.language),
      ),
      PADDING_X,
      tableY,
    );
  }

  tableY += 22;
  const tableW = CARD_WIDTH - PADDING_X * 2;
  const colWidths = [60, 390, 150, 190, tableW - 790];
  const colX = [
    PADDING_X,
    PADDING_X + colWidths[0],
    PADDING_X + colWidths[0] + colWidths[1],
    PADDING_X + colWidths[0] + colWidths[1] + colWidths[2],
    PADDING_X + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
  ];

  // Table header bar
  ctx.fillStyle = '#f1f5f9';
  drawRoundedRect(ctx, PADDING_X, tableY, tableW, tableHeaderH, 10);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = `700 15px ${fontStack}`;
  const hdrY = tableY + 30;
  ctx.fillText(strings.colIndex, colX[0] + 16, hdrY);
  ctx.fillText(strings.colVaccine, colX[1] + 8, hdrY);
  ctx.fillText(strings.colDose, colX[2] + 8, hdrY);
  ctx.fillText(strings.colDate, colX[3] + 8, hdrY);
  ctx.fillText(strings.colCentre, colX[4] + 8, hdrY);

  let rowY = tableY + tableHeaderH;

  if (data.doses.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(PADDING_X, rowY, tableW, 84);
    ctx.fillStyle = '#64748b';
    ctx.font = `500 18px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText(strings.noDosesRecorded, CARD_WIDTH / 2, rowY + 48);
    ctx.textAlign = 'left';
  } else {
    data.doses.forEach((dose, index) => {
      if (index % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(PADDING_X, rowY, tableW, rowHeight);
      }

      // Hairline bottom divider
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, rowY + rowHeight);
      ctx.lineTo(PADDING_X + tableW, rowY + rowHeight);
      ctx.stroke();

      const textY = rowY + 36;
      ctx.fillStyle = '#64748b';
      ctx.font = `600 16px ${fontStack}`;
      ctx.fillText(localiseNumber(index + 1, data.language), colX[0] + 16, textY);

      ctx.fillStyle = '#0f172a';
      ctx.font = `700 17px ${fontStack}`;
      const vacLine = wrapTextLines(ctx, dose.name, colWidths[1] - 20)[0] ?? dose.name;
      ctx.fillText(vacLine, colX[1] + 8, textY);

      ctx.fillStyle = '#047857';
      ctx.font = `600 16px ${fontStack}`;
      ctx.fillText(dose.doseLabel, colX[2] + 8, textY);

      ctx.fillStyle = '#1e293b';
      ctx.font = `500 16px ${fontStack}`;
      ctx.fillText(dose.dateFormatted, colX[3] + 8, textY);

      ctx.fillStyle = '#475569';
      ctx.font = `400 15px ${fontStack}`;
      const centreText = dose.centre ?? '—';
      const centreLine = wrapTextLines(ctx, centreText, colWidths[4] - 20)[0] ?? centreText;
      ctx.fillText(centreLine, colX[4] + 8, textY);

      rowY += rowHeight;
    });
  }

  // Footer
  const footerY = cardHeight - 76;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PADDING_X, footerY);
  ctx.lineTo(CARD_WIDTH - PADDING_X, footerY);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `500 15px ${fontStack}`;
  ctx.fillText(
    formatTemplate(strings.footerGenerated, formatDate(todayISO(), data.language)),
    PADDING_X,
    footerY + 34,
  );
  ctx.textAlign = 'right';
  ctx.fillText('TikaTrack · offline-first personal immunization record', CARD_WIDTH - PADDING_X, footerY + 34);
  ctx.textAlign = 'left';

  return canvas;
}

// ---------------------------------------------------------------------------
// Minimal Zero-Dependency PDF 1.4 Generator
// ---------------------------------------------------------------------------

function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Wrap JPEG image bytes inside a valid, self-contained single-page PDF 1.4
 * sized proportionally to A4 width (595.28 pt).
 */
export function buildPdfFromJpeg(
  jpegBytes: Uint8Array,
  widthPx: number,
  heightPx: number,
): Blob {
  const pageWidthPt = 595.28;
  const pageHeightPt = Math.max(
    841.89,
    Number(((heightPx / Math.max(widthPx, 1)) * pageWidthPt).toFixed(2)),
  );
  const imgHeightPt = Number(((heightPx / Math.max(widthPx, 1)) * pageWidthPt).toFixed(2));
  const yOffsetPt = Number((pageHeightPt - imgHeightPt).toFixed(2));

  const contentStream = `q\n${pageWidthPt} 0 0 ${imgHeightPt} 0 ${yOffsetPt} cm\n/Im0 Do\nQ\n`;

  const header = asciiBytes('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  const offsets: number[] = [0]; // object 0 is free
  const parts: Uint8Array[] = [header];
  let cursor = header.length;

  const pushObj = (objNum: number, bodyChunks: Uint8Array[]) => {
    offsets[objNum] = cursor;
    const prefix = asciiBytes(`${objNum} 0 obj\n`);
    const suffix = asciiBytes('\nendobj\n');
    parts.push(prefix);
    cursor += prefix.length;
    for (const chunk of bodyChunks) {
      parts.push(chunk);
      cursor += chunk.length;
    }
    parts.push(suffix);
    cursor += suffix.length;
  };

  pushObj(1, [asciiBytes('<< /Type /Catalog /Pages 2 0 R >>')]);
  pushObj(2, [asciiBytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')]);
  pushObj(3, [
    asciiBytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ),
  ]);
  pushObj(4, [
    asciiBytes(
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    ),
    jpegBytes,
    asciiBytes('\nendstream'),
  ]);
  pushObj(5, [
    asciiBytes(
      `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    ),
  ]);

  const xrefOffset = cursor;
  const xrefLines = ['xref', `0 ${offsets.length}`, '0000000000 65535 f '];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  }
  const trailer = [
    ...xrefLines,
    'trailer',
    `<< /Size ${offsets.length} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF\n',
  ].join('\n');

  parts.push(asciiBytes(trailer));

  const pdfBytes = concatChunks(parts);
  const buffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

function hasNonLatinUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 0xff) return true;
  }
  return false;
}

function toPdfSafeAscii(text: string): string {
  return text
    .replace(/\u00b7/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7e]/g, '?');
}

function escapePdfLiteralAscii(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function encodePdfUtf16BeHex(text: string): string {
  // Standard PDF 1.4 UTF-16BE string literal <FEFF...> preserves Unicode/Bangla characters losslessly
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i += 1) {
    hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  }
  return `<${hex}>`;
}

function encodePdfTextOperand(text: string): string {
  if (hasNonLatinUnicode(text)) {
    return encodePdfUtf16BeHex(text);
  }
  return `(${escapePdfLiteralAscii(toPdfSafeAscii(text))})`;
}

/**
 * Fallback vector-text PDF 1.4 builder when HTML5 Canvas JPEG encoding is
 * unavailable (e.g., minimalist headless environments).
 */
export function buildTextFallbackPdf(data: PassportCardData): Blob {
  const lines: string[] = [
    'TikaTrack - Vaccination Passport',
    `Member: ${data.memberName}`,
    `Date of birth: ${data.dateOfBirth} | Issued: ${data.issuedAt.slice(0, 10)}`,
    `Certificate ID: ${data.certificateId}`,
    `Recorded doses: ${data.totalDoseCount}`,
    '------------------------------------------------------------',
  ];
  if (data.doses.length === 0) {
    lines.push('No vaccination doses recorded.');
  } else {
    data.doses.forEach((dose, idx) => {
      lines.push(
        `${idx + 1}. ${dose.name} (${dose.doseLabel}) - ${dose.date}${dose.centre ? ` @ ${dose.centre}` : ''}`,
      );
    });
  }
  lines.push('------------------------------------------------------------');
  lines.push(`QR Payload: ${data.payload.slice(0, 90)}`);

  const textOps = [
    'BT',
    '/F1 11 Tf',
    '48 790 Td',
    '16 TL',
    ...lines.map((line) => `${encodePdfTextOperand(line)} Tj T*`),
    'ET',
  ].join('\n');

  const header = asciiBytes('%PDF-1.4\n');
  const offsets: number[] = [0];
  const parts: Uint8Array[] = [header];
  let cursor = header.length;

  const pushObj = (objNum: number, body: string) => {
    offsets[objNum] = cursor;
    const chunk = asciiBytes(`${objNum} 0 obj\n${body}\nendobj\n`);
    parts.push(chunk);
    cursor += chunk.length;
  };

  pushObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  pushObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  pushObj(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  );
  pushObj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pushObj(5, `<< /Length ${textOps.length} >>\nstream\n${textOps}\nendstream`);

  const xrefOffset = cursor;
  const xrefLines = ['xref', `0 ${offsets.length}`, '0000000000 65535 f '];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  }
  const trailer = [
    ...xrefLines,
    'trailer',
    `<< /Size ${offsets.length} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF\n',
  ].join('\n');
  parts.push(asciiBytes(trailer));

  const pdfBytes = concatChunks(parts);
  const buffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Blob Creation & Download Triggers
// ---------------------------------------------------------------------------

async function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mime: 'image/png' | 'image/jpeg',
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

export async function passportCardToPngBlob(
  data: PassportCardData,
  strings?: PassportExportStrings,
): Promise<Blob | null> {
  const canvas = renderPassportCardCanvas(data, strings);
  if (!canvas) return null;
  return canvasToBlobAsync(canvas, 'image/png');
}

export async function passportCardToPdfBlob(
  data: PassportCardData,
  strings?: PassportExportStrings,
): Promise<Blob> {
  const canvas = renderPassportCardCanvas(data, strings);
  if (canvas) {
    const jpegBlob = await canvasToBlobAsync(canvas, 'image/jpeg', 0.94);
    if (jpegBlob && typeof jpegBlob.arrayBuffer === 'function') {
      const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
      // Validate JPEG SOI marker (0xFF 0xD8) before embedding
      if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        return buildPdfFromJpeg(bytes, canvas.width, canvas.height);
      }
    }
  }
  return buildTextFallbackPdf(data);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPassportAsPng(
  data: PassportCardData,
  strings?: PassportExportStrings,
): Promise<Blob | null> {
  const blob = await passportCardToPngBlob(data, strings);
  if (!blob) return null;
  const slug = safeFilename(data.memberName, 'member');
  triggerBlobDownload(blob, `tikatrack-vaccination-passport-${slug}.png`);
  return blob;
}

export async function exportPassportAsPdf(
  data: PassportCardData,
  strings?: PassportExportStrings,
): Promise<Blob> {
  const blob = await passportCardToPdfBlob(data, strings);
  const slug = safeFilename(data.memberName, 'member');
  triggerBlobDownload(blob, `tikatrack-vaccination-passport-${slug}.pdf`);
  return blob;
}
