/**
 * The printable vaccination record card.
 *
 * A phone can die, run out of storage, or stay at home. Paper is the record that
 * a health worker at an EPI session can actually read, so every tracked member
 * can be printed as a one-page card: identity, every dose in schedule order with
 * the date it was given, what is still outstanding, and the passport QR when one
 * has been issued.
 *
 * Two rules shape the output:
 *   - **Everything user-supplied is escaped.** Names and centre notes come from
 *     free-text inputs and from imported JSON; this HTML is injected with
 *     `innerHTML`, so an unescaped `<img onerror=…>` would execute.
 *   - **Inline styles only.** The print iframe copies the app's stylesheets, but
 *     a card must look the same on any printer: black on white, no dark mode, no
 *     web fonts, no Tailwind class surviving a purge.
 */

import type { DoseStatus } from '../types';
import type { Language } from '../i18n/types';
import { printElement } from './exporters';

export interface EpiCardRow {
  vaccine: string;
  /** 1-based dose number, when the vaccine has a series. */
  doseNumber?: number;
  /**
   * `true` when the dose number was inferred by TikaTrack rather than recorded
   * (a record migrated from 2.x, which never stored it). The card prints it with
   * an asterisk and a footnote, because a paper card handed to a health worker
   * must not present a guess as a fact.
   */
  doseUnconfirmed?: boolean;
  /** Pre-formatted for the card's language (dates and ages are localised). */
  dateText?: string;
  centre?: string;
  /** Batch / lot number, when the family recorded one. */
  batch?: string;
  status: DoseStatus;
}

export interface EpiCardInput {
  name: string;
  dobText?: string;
  ageText?: string;
  genderText?: string;
  relationshipText?: string;
  rows: readonly EpiCardRow[];
  /** Pre-formatted "generated" timestamp. */
  generatedAtText: string;
  language: Language;
  /** Output of `qrToSVG` for an issued passport. Anything else is dropped. */
  qrSvg?: string;
  hotline?: string;
  footnote?: string;
}

type Labels = {
  title: string;
  subtitle: string;
  name: string;
  dateOfBirth: string;
  age: string;
  sex: string;
  relationship: string;
  vaccine: string;
  dose: string;
  dateGiven: string;
  centre: string;
  status: string;
  statusCompleted: string;
  statusDueToday: string;
  statusUpcoming: string;
  statusOverdue: string;
  notGiven: string;
  batch: string;
  doseUnconfirmedNote: string;
  generated: string;
  disclaimer: string;
  hotline: string;
};

const LABELS: Record<Language, Labels> = {
  en: {
    title: 'Vaccination record card',
    subtitle: 'Personal record kept by the family — carry it to every EPI session',
    name: 'Name',
    dateOfBirth: 'Date of birth',
    age: 'Age',
    sex: 'Sex',
    relationship: 'Relationship',
    vaccine: 'Vaccine',
    dose: 'Dose',
    dateGiven: 'Date given',
    centre: 'Centre',
    status: 'Status',
    statusCompleted: 'Given',
    statusDueToday: 'Due today',
    statusUpcoming: 'Upcoming',
    statusOverdue: 'Overdue',
    notGiven: '—',
    batch: 'Batch',
    doseUnconfirmedNote:
      '* The dose number was not recorded in the app and was matched to the next dose in the series. Please check it against the paper card.',
    generated: 'Generated',
    disclaimer:
      'Generated on this device by TikaTrack. It is a personal record, not an official government document.',
    hotline: 'National immunisation hotline',
  },
  bn: {
    title: 'টিকা রেকর্ড কার্ড',
    subtitle: 'পরিবারের সংরক্ষিত ব্যক্তিগত রেকর্ড — প্রতিটি ইপিআই সেশনে সঙ্গে রাখুন',
    name: 'নাম',
    dateOfBirth: 'জন্ম তারিখ',
    age: 'বয়স',
    sex: 'লিঙ্গ',
    relationship: 'সম্পর্ক',
    vaccine: 'টিকা',
    dose: 'ডোজ',
    dateGiven: 'প্রদানের তারিখ',
    centre: 'কেন্দ্র',
    status: 'অবস্থা',
    statusCompleted: 'দেওয়া হয়েছে',
    statusDueToday: 'আজ দিতে হবে',
    statusUpcoming: 'আসন্ন',
    statusOverdue: 'সময় অতিক্রান্ত',
    notGiven: '—',
    batch: 'ব্যাচ',
    doseUnconfirmedNote:
      '* অ্যাপে ডোজ নম্বর লেখা ছিল না; সিরিজের পরবর্তী ডোজ হিসেবে মেলানো হয়েছে। কাগজের কার্ডের সঙ্গে মিলিয়ে নিশ্চিত করুন।',
    generated: 'তৈরি হয়েছে',
    disclaimer: 'এই ডিভাইসে টিকাট্র্যাক দিয়ে তৈরি। এটি ব্যক্তিগত রেকর্ড, সরকারি দলিল নয়।',
    hotline: 'জাতীয় টিকা হটলাইন',
  },
};

const STATUS_LABEL: Record<DoseStatus, keyof Labels> = {
  completed: 'statusCompleted',
  'due-today': 'statusDueToday',
  upcoming: 'statusUpcoming',
  overdue: 'statusOverdue',
};

const STATUS_COLOUR: Record<DoseStatus, string> = {
  completed: '#047857',
  'due-today': '#b45309',
  upcoming: '#1d4ed8',
  overdue: '#b91c1c',
};

/** Escape text for use inside HTML (both text nodes and quoted attributes). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Accept inline SVG only from our own renderer.
 *
 * The QR is generated locally (`qrToSVG`), so this is a seatbelt rather than a
 * filter that has to be perfect: anything that is not an `<svg>` root, or that
 * carries a script or an event handler, is dropped.
 */
export function safeInlineSvg(svg: string | undefined): string {
  if (!svg) return '';
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) return '';
  // Require whitespace before `on…=` so a legitimate attribute such as
  // `shape-rendering=` can never be mistaken for an event handler.
  if (/<script|javascript:|\son[a-z]+\s*=/i.test(trimmed)) return '';
  return trimmed;
}

function detail(label: string, value: string | undefined): string {
  if (!value) return '';
  return `
      <tr>
        <th scope="row">${escapeHtml(label)}</th>
        <td>${escapeHtml(value)}</td>
      </tr>`;
}

/** Render the card as an HTML string. */
export function renderEpiCard(input: EpiCardInput): string {
  const labels = LABELS[input.language] ?? LABELS.en;
  const hotline = input.hotline ?? '16263';
  const qr = safeInlineSvg(input.qrSvg);

  const rows = input.rows
    .map((row) => {
      const statusLabel = labels[STATUS_LABEL[row.status] ?? 'statusUpcoming'];
      const colour = STATUS_COLOUR[row.status] ?? '#374151';
      const dose = row.doseNumber
        ? `${escapeHtml(row.doseNumber)}${row.doseUnconfirmed ? '*' : ''}`
        : labels.notGiven;
      const centre = [row.centre, row.batch ? `${labels.batch} ${row.batch}` : '']
        .filter(Boolean)
        .join(' · ');
      return `
      <tr>
        <td>${escapeHtml(row.vaccine)}</td>
        <td class="c">${dose}</td>
        <td class="c">${row.dateText ? escapeHtml(row.dateText) : labels.notGiven}</td>
        <td>${centre ? escapeHtml(centre) : labels.notGiven}</td>
        <td class="c" style="color:${colour};font-weight:600">${escapeHtml(statusLabel)}</td>
      </tr>`;
    })
    .join('');

  return `<div class="tt-epi-card" lang="${escapeHtml(input.language)}" style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Bengali',sans-serif;color:#111827;max-width:190mm;margin:0 auto">
  <header style="border-bottom:2px solid #047857;padding-bottom:8px;margin-bottom:12px">
    <h1 style="margin:0;font-size:19px;letter-spacing:-0.01em">${escapeHtml(labels.title)}</h1>
    <p style="margin:4px 0 0;font-size:11px;color:#4b5563">${escapeHtml(labels.subtitle)}</p>
  </header>

  <div style="display:flex;gap:16px;align-items:flex-start">
    <div style="flex:1 1 auto">
      <table style="border-collapse:collapse;font-size:12px;width:100%">
        <tbody>${detail(labels.name, input.name)}${detail(labels.dateOfBirth, input.dobText)}${detail(
          labels.age,
          input.ageText,
        )}${detail(labels.sex, input.genderText)}${detail(
          labels.relationship,
          input.relationshipText,
        )}
        </tbody>
      </table>
    </div>${
      qr
        ? `
    <div style="flex:0 0 auto;text-align:center">
      ${qr}
      <p style="margin:4px 0 0;font-size:9px;color:#6b7280">TikaTrack passport</p>
    </div>`
        : ''
    }
  </div>

  <table style="border-collapse:collapse;width:100%;font-size:11.5px;margin-top:14px">
    <thead>
      <tr style="background:#ecfdf5;text-align:left">
        <th style="padding:6px 8px;border:1px solid #d1d5db">${escapeHtml(labels.vaccine)}</th>
        <th class="c" style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${escapeHtml(
          labels.dose,
        )}</th>
        <th class="c" style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${escapeHtml(
          labels.dateGiven,
        )}</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db">${escapeHtml(labels.centre)}</th>
        <th class="c" style="padding:6px 8px;border:1px solid #d1d5db;text-align:center">${escapeHtml(
          labels.status,
        )}</th>
      </tr>
    </thead>
    <tbody>${
      rows ||
      `
      <tr><td colspan="5" style="padding:10px 8px;border:1px solid #d1d5db;color:#6b7280">${escapeHtml(
        labels.notGiven,
      )}</td></tr>`
    }
    </tbody>
  </table>

  <table style="border-collapse:collapse;font-size:11.5px;margin-top:10px">
    <tbody>${detail(labels.generated, input.generatedAtText)}
    </tbody>
  </table>

  <footer style="margin-top:14px;border-top:1px solid #d1d5db;padding-top:8px;font-size:10px;color:#4b5563">
    <p style="margin:0">${escapeHtml(input.footnote ?? labels.disclaimer)}</p>${
      input.rows.some((row) => row.doseUnconfirmed)
        ? `
    <p style="margin:4px 0 0">${escapeHtml(labels.doseUnconfirmedNote)}</p>`
        : ''
    }
    <p style="margin:4px 0 0">${escapeHtml(labels.hotline)}: <strong>${escapeHtml(
      hotline,
    )}</strong></p>
  </footer>
</div>`;
}

/** Render the card off-screen and send it to the printer. */
export function printEpiCard(input: EpiCardInput): boolean {
  if (typeof document === 'undefined') return false;
  const container = document.createElement('div');
  // Safe: every interpolated value went through escapeHtml.
  container.innerHTML = renderEpiCard(input);
  return printElement(container, (LABELS[input.language] ?? LABELS.en).title);
}
