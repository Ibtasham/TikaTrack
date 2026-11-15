import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';

import {
  CAPACITY,
  MAX_PAYLOAD_BYTES,
  MAX_VERSION,
  chooseVersion,
  formatBits,
  generateQR,
  maskBit,
  penalty,
  qrCore,
  qrToRGBA,
  qrToSVG,
} from '../lib/qr';

/** Render + decode with jsQR, an independent QR *reader*. */
function decode(text: string, scale = 5): string | null {
  const { data, width } = qrToRGBA(generateQR(text), scale);
  const result = jsQR(data as unknown as Uint8ClampedArray, width, width);
  return result ? result.data : null;
}

/** ISO 18004 Annex C — the 8 format strings for EC level M, masks 0–7. */
const FORMAT_INFO_LEVEL_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

describe('chooseVersion', () => {
  it('picks the smallest version that fits the payload', () => {
    expect(chooseVersion(0)).toBe(1);
    expect(chooseVersion(14)).toBe(1);
    expect(chooseVersion(15)).toBe(2);
    expect(chooseVersion(26)).toBe(2);
    expect(chooseVersion(42)).toBe(3);
    expect(chooseVersion(287)).toBe(12);
  });

  it('rejects payloads beyond version 12', () => {
    expect(() => chooseVersion(MAX_PAYLOAD_BYTES + 1)).toThrow(RangeError);
  });

  it('agrees with the published capacity table at every boundary', () => {
    for (let version = 1; version <= MAX_VERSION; version += 1) {
      expect(chooseVersion(CAPACITY[version])).toBe(version);
    }
    // Each version's capacity + 1 must spill over into the next version.
    for (let version = 1; version < MAX_VERSION; version += 1) {
      expect(chooseVersion(CAPACITY[version] + 1)).toBe(version + 1);
    }
  });
});

describe('formatBits', () => {
  it('matches the standard format strings for error-correction level M', () => {
    FORMAT_INFO_LEVEL_M.forEach((expected, mask) => {
      expect(formatBits(mask)).toBe(expected);
    });
  });
});

describe('maskBit', () => {
  it('implements the eight mask conditions', () => {
    expect(maskBit(0, 0, 0)).toBe(true);
    expect(maskBit(0, 0, 1)).toBe(false);
    expect(maskBit(1, 2, 5)).toBe(true);
    expect(maskBit(2, 1, 3)).toBe(true);
    expect(maskBit(3, 1, 2)).toBe(true);
    expect(maskBit(4, 2, 3)).toBe(true);
    expect(maskBit(5, 0, 0)).toBe(true);
    expect(maskBit(6, 1, 1)).toBe(true);
    expect(maskBit(7, 0, 1)).toBe(false);
  });

  it('returns false for an out-of-range mask instead of throwing', () => {
    expect(maskBit(99, 3, 4)).toBe(false);
  });
});

describe('generateQR — structure', () => {
  const qr = generateQR('TIKATRACK');
  const version = qr.version;
  const coreSize = version * 4 + 17;
  const core = qrCore(qr);

  it('reports a size that includes the 4-module quiet zone on both sides', () => {
    expect(qr.size).toBe(coreSize + 8);
    expect(qr.modules).toHaveLength(qr.size);
    expect(qr.modules.every((row) => row.length === qr.size)).toBe(true);
  });

  it('surrounds the symbol with an all-light quiet zone', () => {
    for (let i = 0; i < qr.size; i += 1) {
      for (let q = 0; q < 4; q += 1) {
        expect(qr.modules[q][i]).toBe(false);
        expect(qr.modules[qr.size - 1 - q][i]).toBe(false);
        expect(qr.modules[i][q]).toBe(false);
        expect(qr.modules[i][qr.size - 1 - q]).toBe(false);
      }
    }
  });

  it('draws the three 7x7 finder patterns with light separators', () => {
    const origins: Array<[number, number]> = [
      [0, 0],
      [0, coreSize - 7],
      [coreSize - 7, 0],
    ];
    for (const [top, left] of origins) {
      for (let r = 0; r < 7; r += 1) {
        for (let c = 0; c < 7; c += 1) {
          const onRing = r === 0 || r === 6 || c === 0 || c === 6;
          const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          expect(core[top + r][left + c], `finder ${top},${left} at ${r},${c}`).toBe(
            onRing || inCore,
          );
        }
      }
    }
  });

  it('draws alternating timing patterns on row 6 and column 6', () => {
    for (let i = 8; i < coreSize - 8; i += 1) {
      expect(core[6][i], `row 6, col ${i}`).toBe(i % 2 === 0);
      expect(core[i][6], `col 6, row ${i}`).toBe(i % 2 === 0);
    }
  });

  it('sets the always-dark module at (4v+9, 8)', () => {
    expect(core[coreSize - 8][8]).toBe(true);
  });

  it('never masks the timing modules adjacent to the format area', () => {
    // (6,8) and (8,6) are timing modules — encoders that treat them as format
    // bits produce symbols many readers reject.
    expect(core[6][8]).toBe(true);
    expect(core[8][6]).toBe(true);
  });

  it('uses a mask in range and is deterministic', () => {
    expect(qr.mask).toBeGreaterThanOrEqual(0);
    expect(qr.mask).toBeLessThan(8);
    expect(generateQR('TIKATRACK').modules).toEqual(qr.modules);
  });
});

describe('generateQR — decoding', () => {
  it('round-trips a short ASCII payload', () => {
    expect(decode('A')).toBe('A');
  });

  it('round-trips a realistic vaccination certificate payload', () => {
    const payload = 'TIKA|BD|1990-01-01|M|Dose1|2021-08-15|Sinopharm|Dhaka|sig=0123456789abcdef';
    expect(decode(payload)).toBe(payload);
  });

  it('round-trips a verification URL', () => {
    const url = 'https://tikatrack.app/verify?id=8f3c2a19&sig=5d41c0b7a2';
    expect(decode(url)).toBe(url);
  });

  it('round-trips Bangla (multi-byte UTF-8) text', () => {
    const text = 'টিকার প্রথম ডোজ ১৫ আগস্ট ২০২১';
    expect(decode(text)).toBe(text);
  });

  it('round-trips the exact capacity of every supported version', () => {
    for (let version = 1; version <= MAX_VERSION; version += 1) {
      const payload = 'x'.repeat(CAPACITY[version]);
      const qr = generateQR(payload);
      expect(qr.version, `payload of ${CAPACITY[version]} bytes`).toBe(version);
      expect(decode(payload)).toBe(payload);
    }
  });

  it('round-trips one byte below each capacity boundary', () => {
    for (let version = 2; version <= MAX_VERSION; version += 1) {
      const payload = 'x'.repeat(CAPACITY[version] - 1);
      expect(decode(payload)).toBe(payload);
    }
  });

  it('handles payloads that span multiple Reed–Solomon blocks', () => {
    // Versions 8+ split data across several blocks with interleaved EC codewords.
    expect(generateQR('x'.repeat(CAPACITY[8])).version).toBe(8);
    expect(decode('x'.repeat(CAPACITY[8]))).toBe('x'.repeat(CAPACITY[8]));
    expect(decode('x'.repeat(CAPACITY[12]))).toBe('x'.repeat(CAPACITY[12]));
  });

  it('throws a RangeError when the payload cannot fit', () => {
    expect(() => generateQR('x'.repeat(MAX_PAYLOAD_BYTES + 1))).toThrow(RangeError);
    expect(() => generateQR('x'.repeat(MAX_PAYLOAD_BYTES + 1))).toThrow(/too large/i);
  });
});

describe('penalty', () => {
  const size = 21;
  const blank = () => Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const checkerboard = () =>
    Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => (x + y) % 2 === 0),
    );

  it('scores a perfect checkerboard as zero', () => {
    // No runs >= 5, no 2x2 blocks, no finder-like patterns, and a dark ratio
    // within 5% of 50% — every rule contributes nothing.
    expect(penalty(checkerboard())).toBe(0);
  });

  it('matches hand-computed values for uniform matrices', () => {
    // Rule 1: 21 rows x (3 + 21 - 5) + 21 columns x 19 = 798
    // Rule 2: 20 x 20 uniform 2x2 blocks x 3               = 1200
    // Rule 3: no 1:1:3:1:1 patterns                         = 0
    // Rule 4: |100 - 50| / 5 x 10 (or |0 - 50| / 5 x 10)    = 100
    expect(penalty(Array.from({ length: size }, () => Array<boolean>(size).fill(true)))).toBe(2098);
    expect(penalty(blank())).toBe(2098);
  });

  it('scores rows and columns symmetrically', () => {
    const darkRow = blank();
    for (let x = 0; x < size; x += 1) darkRow[10][x] = true;

    const darkColumn = blank();
    for (let y = 0; y < size; y += 1) darkColumn[y][10] = true;

    expect(penalty(darkRow)).toBe(penalty(darkColumn));
    expect(penalty(darkRow)).toBe(1905);
  });

  it('scores a finder-like 1:1:3:1:1 run the same in both orientations', () => {
    const pattern = [true, false, true, true, true, false, true, false, false, false, false];

    const inRow = blank();
    pattern.forEach((value, i) => {
      inRow[10][i] = value;
    });

    const inColumn = blank();
    pattern.forEach((value, i) => {
      inColumn[i][10] = value;
    });

    expect(penalty(inRow)).toBe(penalty(inColumn));
    expect(penalty(inRow)).toBe(2064);
  });
});

describe('qrToSVG', () => {
  it('produces a self-contained SVG with the expected dimensions', () => {
    const qr = generateQR('TIKATRACK');
    const svg = qrToSVG(qr, { pixelSize: 3 });
    const dim = qr.size * 3;
    expect(svg).toContain(`width="${dim}" height="${dim}"`);
    expect(svg).toContain(`viewBox="0 0 ${dim} ${dim}"`);
    expect(svg).toContain('<path d="M');
    expect(svg).not.toContain('http://www.w3.org/1999/xlink');
  });

  it('escapes markup in the accessible title', () => {
    const svg = qrToSVG(generateQR('x'), { title: 'a<b>&c' });
    expect(svg).toContain('<title>abc</title>');
    expect(svg).not.toContain('<b>');
  });

  it('honours custom colours', () => {
    const svg = qrToSVG(generateQR('x'), { foreground: '#006a4e', background: '#fff8e1' });
    expect(svg).toContain('fill="#006a4e"');
    expect(svg).toContain('fill="#fff8e1"');
  });
});

describe('qrToRGBA', () => {
  it('emits opaque RGBA pixels at the requested scale', () => {
    const qr = generateQR('x');
    const { data, width } = qrToRGBA(qr, 4);
    expect(width).toBe(qr.size * 4);
    expect(data).toHaveLength(width * width * 4);
    // Quiet-zone pixel is white and opaque.
    expect(Array.from(data.slice(0, 4))).toEqual([255, 255, 255, 255]);
  });
});
