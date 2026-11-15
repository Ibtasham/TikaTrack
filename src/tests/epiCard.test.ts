import { beforeEach, describe, expect, it, vi } from 'vitest';

import { printElement } from '../lib/exporters';
import {
  escapeHtml,
  printEpiCard,
  renderEpiCard,
  safeInlineSvg,
  type EpiCardInput,
  type EpiCardRow,
} from '../lib/epiCard';
import { qrToSVG, generateQR } from '../lib/qr';

vi.mock('../lib/exporters', () => ({ printElement: vi.fn(() => true) }));

const ROWS: EpiCardRow[] = [
  {
    vaccine: 'BCG',
    doseNumber: 1,
    dateText: '12 Jan 2026',
    centre: 'Uposhohar EPI Centre',
    status: 'completed',
  },
  { vaccine: 'Pentavalent', doseNumber: 3, dateText: '12 Nov 2026', status: 'due-today' },
  { vaccine: 'MR', doseNumber: 1, status: 'upcoming' },
  { vaccine: 'Pentavalent', doseNumber: 2, status: 'overdue' },
];

function card(overrides: Partial<EpiCardInput> = {}): EpiCardInput {
  return {
    name: 'Ayesha Rahman',
    dobText: '12 July 2026',
    ageText: '4 months',
    genderText: 'Female',
    relationshipText: 'Child',
    rows: ROWS,
    generatedAtText: '1 Nov 2026, 09:30',
    language: 'en',
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes every character that can break out of a text node or attribute', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('renders empty values as an empty string', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});

describe('safeInlineSvg', () => {
  it('accepts the QR renderer output', () => {
    const svg = qrToSVG(generateQR('TIKAPASS1|test'));
    expect(safeInlineSvg(svg)).toBe(svg.trim());
  });

  it('rejects anything that is not an SVG root', () => {
    expect(safeInlineSvg('<div>hello</div>')).toBe('');
    expect(safeInlineSvg('not markup')).toBe('');
    expect(safeInlineSvg(undefined)).toBe('');
    expect(safeInlineSvg('')).toBe('');
  });

  it('rejects scripts and event handlers smuggled inside an SVG', () => {
    expect(safeInlineSvg('<svg><script>alert(1)</script></svg>')).toBe('');
    expect(safeInlineSvg('<svg onload="alert(1)"></svg>')).toBe('');
    expect(safeInlineSvg('<svg><a href="javascript:alert(1)">x</a></svg>')).toBe('');
  });
});

describe('renderEpiCard', () => {
  it('shows the member, one row per dose and the generation time', () => {
    const html = renderEpiCard(card());

    expect(html).toContain('Ayesha Rahman');
    expect(html).toContain('12 July 2026');
    expect(html).toContain('4 months');
    expect(html).toContain('Female');
    expect(html).toContain('Child');
    expect(html).toContain('Uposhohar EPI Centre');
    expect(html).toContain('1 Nov 2026, 09:30');
    // One <tr> per dose, plus the identity details and the "generated" row.
    expect(html.match(/<tr>/g)).toHaveLength(ROWS.length + 6);
    expect(html).toContain('lang="en"');
  });

  it('labels each status in the card language', () => {
    const english = renderEpiCard(card());
    expect(english).toContain('Given');
    expect(english).toContain('Due today');
    expect(english).toContain('Upcoming');
    expect(english).toContain('Overdue');

    const bangla = renderEpiCard(card({ language: 'bn' }));
    expect(bangla).toContain('দেওয়া হয়েছে');
    expect(bangla).toContain('সময় অতিক্রান্ত');
    expect(bangla).toContain('টিকা রেকর্ড কার্ড');
    expect(bangla).toContain('lang="bn"');
  });

  it('omits details the family never filled in', () => {
    const html = renderEpiCard(card({ genderText: undefined, relationshipText: undefined }));
    expect(html).not.toContain('Sex');
    expect(html).not.toContain('Relationship');
  });

  it('uses a dash for a dose that has not been given yet', () => {
    const html = renderEpiCard(card({ rows: [{ vaccine: 'MR', status: 'upcoming' }] }));
    expect(html).toContain('—');
  });

  it('prints a placeholder row when there is nothing recorded', () => {
    const html = renderEpiCard(card({ rows: [] }));
    expect(html).toContain('colspan="5"');
  });

  it('defaults the hotline to 16263 and accepts an override', () => {
    expect(renderEpiCard(card())).toContain('16263');
    expect(renderEpiCard(card({ hotline: '333' }))).toContain('333');
  });

  it('says plainly that the card is not an official document', () => {
    expect(renderEpiCard(card())).toContain('not an official government document');
    expect(renderEpiCard(card({ footnote: 'Clinic copy' }))).toContain('Clinic copy');
  });

  it('embeds a safe passport QR when one was issued', () => {
    const svg = qrToSVG(generateQR('TIKAPASS1|ayesha'));
    const html = renderEpiCard(card({ qrSvg: svg }));
    expect(html).toContain('<svg');
    expect(html).toContain('TikaTrack passport');
  });

  it('drops a QR payload that is not an SVG', () => {
    const html = renderEpiCard(card({ qrSvg: '<img src=x onerror="alert(1)">' }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('TikaTrack passport');
  });

  it('escapes free-text coming from the profile or an import', () => {
    const html = renderEpiCard(
      card({
        name: '<img src=x onerror="alert(1)">',
        rows: [{ vaccine: '<script>steal()</script>', centre: '"><b>', status: 'completed' }],
      }),
    );

    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img src=x onerror=');
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
  });

  it('escapes the language attribute rather than trusting it', () => {
    const html = renderEpiCard(card({ language: '"><b>' as unknown as 'en' }));
    expect(html).toContain('lang="&quot;&gt;&lt;b&gt;"');
  });
});

describe('printEpiCard', () => {
  beforeEach(() => {
    vi.mocked(printElement).mockClear();
  });

  it('prints a detached container holding the rendered card', () => {
    expect(printEpiCard(card())).toBe(true);
    expect(printElement).toHaveBeenCalledTimes(1);

    const [element, title] = vi.mocked(printElement).mock.calls[0];
    expect(element).toBeInstanceOf(HTMLElement);
    expect(element.innerHTML).toContain('Ayesha Rahman');
    expect(element.isConnected).toBe(false); // never added to the live document
    expect(title).toBe('Vaccination record card');
  });

  it('propagates a blocked print (pop-ups off)', () => {
    vi.mocked(printElement).mockReturnValueOnce(false);
    expect(printEpiCard(card())).toBe(false);
  });

  it('uses the Bangla title in a Bangla card', () => {
    printEpiCard(card({ language: 'bn' }));
    expect(vi.mocked(printElement).mock.calls[0][1]).toBe('টিকা রেকর্ড কার্ড');
  });
});
