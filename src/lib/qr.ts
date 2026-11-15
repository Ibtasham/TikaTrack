/**
 * Minimal, dependency-free QR Code generator (ISO/IEC 18004).
 *
 * Supports byte mode, versions 1–12 and error-correction level M — far more
 * than TikaTrack's signed certificates need, and small enough to audit.
 *
 * Why hand-rolled? The project is offline-first and the payload is a health
 * record, so routing it through a network QR service (or a heavyweight
 * dependency) for a 2 KB drawing problem is the wrong trade.
 *
 * Correctness is verified in `src/tests/qr.test.ts` by decoding every generated
 * symbol with an independent QR *reader* (jsQR) and by cross-checking the
 * chosen version against the `qrcode` reference implementation.
 */

export interface QRCode {
  /** Side length in modules, including the 4-module quiet zone on each side. */
  size: number;
  /** `modules[y][x]` — `true` means dark. Already includes the quiet zone. */
  modules: boolean[][];
  /** Symbol version actually used (1–12). */
  version: number;
  /** Mask pattern selected by the penalty rules (0–7). */
  mask: number;
}

const EC_BITS_M = 0b00; // error-correction indicator for level M

/**
 * Per-version table at EC level M:
 * `[total codewords, ec codewords per block, group-1 blocks, group-2 blocks]`
 *
 * Group 1 blocks hold one fewer data codeword than group 2 blocks.
 * Values cross-checked against the ISO 18004 tables.
 */
const VERSION_TABLE: Record<
  number,
  [total: number, ecPerBlock: number, group1: number, group2: number]
> = {
  1: [26, 10, 1, 0],
  2: [44, 16, 1, 0],
  3: [70, 26, 1, 0],
  4: [100, 18, 2, 0],
  5: [134, 24, 2, 0],
  6: [172, 16, 4, 0],
  7: [196, 18, 4, 0],
  8: [242, 22, 2, 2],
  9: [292, 22, 3, 2],
  10: [346, 26, 4, 1],
  11: [404, 30, 1, 4],
  12: [466, 22, 6, 2],
};

export const MAX_VERSION = 12;

const ALIGNMENT_CENTRES: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
  11: [6, 30, 54],
  12: [6, 32, 58],
};

/** Maximum payload length, in bytes, for each version at EC level M. */
export const CAPACITY: Record<number, number> = {
  1: 14,
  2: 26,
  3: 42,
  4: 62,
  5: 84,
  6: 106,
  7: 122,
  8: 152,
  9: 180,
  10: 213,
  11: 251,
  12: 287,
};

export const MAX_PAYLOAD_BYTES = CAPACITY[MAX_VERSION];

// ---------------------------------------------------------------------------
// GF(256) arithmetic (primitive polynomial 0x11D, generator 2)
// ---------------------------------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/**
 * Reed–Solomon generator polynomial for `degree` error-correction codewords,
 * highest power first: `result[i]` is the coefficient of `x^(degree - i)`, so
 * `result[0]` is always 1.
 *
 * Built by repeatedly multiplying by (x - α^i), which in GF(2^8) is (x + α^i).
 */
function rsGeneratorPolynomial(degree: number): Uint8Array {
  let result = Uint8Array.from([1]);
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(result.length + 1);
    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= result[j];
      next[j + 1] ^= gfMul(result[j], root);
    }
    result = next;
    root = gfMul(root, 0x02);
  }
  return result;
}

/** Remainder of `data / generator`, i.e. the EC codewords. */
function rsRemainder(data: Uint8Array, ecLength: number): Uint8Array {
  const generator = rsGeneratorPolynomial(ecLength);
  const result = new Uint8Array(ecLength);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[ecLength - 1] = 0;
    for (let i = 0; i < ecLength; i += 1) {
      result[i] ^= gfMul(generator[i + 1], factor);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bit stream -> codewords
// ---------------------------------------------------------------------------

class BitBuffer {
  private readonly bits: number[] = [];

  append(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }

  get length(): number {
    return this.bits.length;
  }

  toBytes(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    this.bits.forEach((bit, index) => {
      if (bit) bytes[index >>> 3] |= 0x80 >>> (index & 7);
    });
    return bytes;
  }
}

/** Character-count indicator length for byte mode. */
function charCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

/** Smallest version whose capacity fits `byteLength`. */
export function chooseVersion(byteLength: number): number {
  for (let version = 1; version <= MAX_VERSION; version += 1) {
    if (byteLength <= CAPACITY[version]) return version;
  }
  throw new RangeError(
    `Payload too large for a QR code (EC level M): ${byteLength} bytes exceeds ${MAX_PAYLOAD_BYTES}`,
  );
}

function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const [totalCodewords, ecPerBlock, group1, group2] = VERSION_TABLE[version];
  const blockCount = group1 + group2;
  const dataCodewords = totalCodewords - ecPerBlock * blockCount;

  const buffer = new BitBuffer();
  buffer.append(0b0100, 4); // byte mode
  buffer.append(bytes.length, charCountBits(version));
  for (const byte of bytes) buffer.append(byte, 8);

  const capacityBits = dataCodewords * 8;
  buffer.append(0, Math.min(4, capacityBits - buffer.length)); // terminator
  while (buffer.length % 8 !== 0) buffer.append(0, 1); // byte alignment

  const data = Array.from(buffer.toBytes());
  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (data.length < dataCodewords) {
    data.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }

  const shortDataLength = Math.floor(dataCodewords / blockCount);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i += 1) {
    const length = i < group1 ? shortDataLength : shortDataLength + 1;
    const block = Uint8Array.from(data.slice(offset, offset + length));
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, ecPerBlock));
  }

  const out: number[] = [];
  const maxDataLength = Math.max(...dataBlocks.map((block) => block.length));
  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return Uint8Array.from(out);
}

// ---------------------------------------------------------------------------
// Matrix construction
// ---------------------------------------------------------------------------

type Matrix = (boolean | null)[][];

function createMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
}

function cloneMatrix(source: Matrix): Matrix {
  return source.map((row) => [...row]);
}

function placeFinder(matrix: Matrix, row: number, col: number): void {
  const size = matrix.length;
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || x < 0 || y >= size || x >= size) continue;
      const ring =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[y][x] = ring || core;
    }
  }
}

function placeAlignment(matrix: Matrix, centres: number[]): void {
  const size = matrix.length;
  for (const row of centres) {
    for (const col of centres) {
      const overlapsFinder =
        (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
      if (overlapsFinder) continue;
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          matrix[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  }
}

function placeFunctionPatterns(matrix: Matrix, version: number): void {
  const size = matrix.length;

  placeFinder(matrix, 0, 0);
  placeFinder(matrix, 0, size - 7);
  placeFinder(matrix, size - 7, 0);
  placeAlignment(matrix, ALIGNMENT_CENTRES[version]);

  // Timing patterns.
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = dark;
    if (matrix[i][6] === null) matrix[i][6] = dark;
  }

  // Reserve the format-information areas (written once the mask is chosen).
  for (let i = 0; i <= 8; i += 1) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = 0; i < 8; i += 1) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }

  // Reserve the version-information areas (versions 7+).
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        matrix[size - 11 + j][i] = false;
        matrix[i][size - 11 + j] = false;
      }
    }
  }

  // The always-dark module.
  matrix[size - 8][8] = true;
}

function placeVersionInfo(matrix: Matrix, version: number): void {
  if (version < 7) return;
  const size = matrix.length;
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  const bits = (version << 12) | remainder;
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    matrix[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    matrix[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
  }
}

/** 15-bit format information (EC level + mask), BCH(15,5) encoded and XORed. */
export function formatBits(mask: number): number {
  const data = (EC_BITS_M << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return (((data << 10) | remainder) ^ 0x5412) >>> 0;
}

/**
 * Write the 15 format-information bits into both copies.
 *
 * Bit `i` (LSB = 0) lives at:
 *   copy 1 — column 8 rows 0-5 (bits 0-5), (8,7) bit 6, (8,8) bit 7,
 *            row 8 columns 7..0 (bits 8-14)
 *   copy 2 — column 8 rows size-1..size-7 (bits 0-6),
 *            row 8 columns size-8..size-1 (bits 7-14)
 *
 * `(size-8, 8)` is bit 0 of copy 2 and is always dark; `(8,6)` and `(6,8)` are
 * timing-pattern modules, never format bits — several popular encoders get
 * these two details wrong and only survive because readers tolerate 3 bad bits.
 */
function placeFormatInfo(matrix: Matrix, mask: number): void {
  const size = matrix.length;
  const bits = formatBits(mask);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;

  // Copy 1 — around the top-left finder.
  for (let i = 0; i <= 5; i += 1) matrix[i][8] = bit(i);
  matrix[8][7] = bit(6);
  matrix[8][8] = bit(7);
  for (let i = 8; i <= 14; i += 1) matrix[8][14 - i] = bit(i);

  // Copy 2 — bottom-left column, then top-right row.
  for (let i = 0; i <= 6; i += 1) matrix[size - 1 - i][8] = bit(i);
  for (let i = 7; i <= 14; i += 1) matrix[8][size - 15 + i] = bit(i);
}

function placeData(matrix: Matrix, codewords: Uint8Array): void {
  const size = matrix.length;
  const totalBits = codewords.length * 8;
  let bitIndex = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the vertical timing column is never data
    const upward = ((right + 1) & 2) === 0;
    for (let vertical = 0; vertical < size; vertical += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const y = upward ? size - 1 - vertical : vertical;
        if (matrix[y][x] !== null) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex += 1;
        }
        matrix[y][x] = dark;
      }
    }
  }
}

export function maskBit(mask: number, y: number, x: number): boolean {
  switch (mask) {
    case 0:
      return (y + x) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (y + x) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((y * x) % 2) + ((y * x) % 3) === 0;
    case 6:
      return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
    case 7:
      return (((y + x) % 2) + ((y * x) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function applyMask(source: Matrix, reserved: boolean[][], mask: number): Matrix {
  const size = source.length;
  const out = createMatrix(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = source[y][x] === true;
      out[y][x] = reserved[y][x] ? value : value !== maskBit(mask, y, x);
    }
  }
  return out;
}

/** ISO 18004 mask-penalty score; lower is better. */
export function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Rule 1 — runs of five or more same-coloured modules.
  const scoreRuns = (line: boolean[]) => {
    let run = 1;
    for (let i = 1; i < line.length; i += 1) {
      if (line[i] === line[i - 1]) {
        run += 1;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  };
  for (let y = 0; y < size; y += 1) scoreRuns(modules[y]);
  for (let x = 0; x < size; x += 1) scoreRuns(modules.map((row) => row[x]));

  // Rule 2 — 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const value = modules[y][x];
      if (
        value === modules[y][x + 1] &&
        value === modules[y + 1][x] &&
        value === modules[y + 1][x + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3 — finder-like 1:1:3:1:1 with a 4-module light run on either side.
  const pattern = [true, false, true, true, true, false, true, false, false, false, false];
  const reversed = [...pattern].reverse();
  const matchesAt = (line: boolean[], start: number, target: boolean[]) =>
    target.every((value, i) => line[start + i] === value);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x + 11 <= size; x += 1) {
      if (matchesAt(modules[y], x, pattern) || matchesAt(modules[y], x, reversed)) score += 40;
    }
  }
  for (let x = 0; x < size; x += 1) {
    const column = modules.map((row) => row[x]);
    for (let y = 0; y + 11 <= size; y += 1) {
      if (matchesAt(column, y, pattern) || matchesAt(column, y, reversed)) score += 40;
    }
  }

  // Rule 4 — deviation of the dark ratio from 50%.
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

function encodeUTF8(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return Uint8Array.from(out);
}

/**
 * Encode `text` as a QR symbol (byte mode, EC level M, versions 1–12).
 *
 * @throws {RangeError} when the payload does not fit in version 12.
 */
export function generateQR(text: string): QRCode {
  const payload = encodeUTF8(text);
  const version = chooseVersion(payload.length);
  const size = version * 4 + 17;

  const codewords = buildCodewords(payload, version);

  const base = createMatrix(size);
  placeFunctionPatterns(base, version);
  placeVersionInfo(base, version);

  // Cells that must never be touched by the mask.
  const reserved = base.map((row) => row.map((cell) => cell !== null));

  const filled = cloneMatrix(base);
  placeData(filled, codewords);

  let best: Matrix | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = applyMask(filled, reserved, mask);
    placeFormatInfo(candidate, mask);
    const score = penalty(candidate.map((row) => row.map((cell) => cell === true)));
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
      bestMask = mask;
    }
  }

  const final = best ?? applyMask(filled, reserved, 0);
  placeFormatInfo(final, bestMask);

  // Wrap in the mandatory 4-module quiet zone.
  const quiet = 4;
  const outSize = size + quiet * 2;
  const modules: boolean[][] = Array.from({ length: outSize }, (_, y) =>
    Array.from({ length: outSize }, (_, x) => {
      const iy = y - quiet;
      const ix = x - quiet;
      if (iy < 0 || ix < 0 || iy >= size || ix >= size) return false;
      return final[iy][ix] === true;
    }),
  );

  return { size: outSize, modules, version, mask: bestMask };
}

/** Render as a standalone SVG string (no external assets, prints crisply). */
export function qrToSVG(
  qr: QRCode,
  options: { pixelSize?: number; title?: string; foreground?: string; background?: string } = {},
): string {
  const pixel = options.pixelSize ?? 4;
  const dim = qr.size * pixel;
  const paths: string[] = [];
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.modules[y][x]) paths.push(`M${x * pixel} ${y * pixel}h${pixel}v${pixel}h-${pixel}z`);
    }
  }
  const safeTitle = (options.title ?? 'QR code').replace(/[<>&]/g, '');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img">`,
    `<title>${safeTitle}</title>`,
    `<rect width="${dim}" height="${dim}" fill="${options.background ?? '#ffffff'}"/>`,
    `<path d="${paths.join('')}" fill="${options.foreground ?? '#0f172a'}"/>`,
    '</svg>',
  ].join('');
}

/** Strip the quiet zone — useful for tests and for compact matrix maths. */
export function qrCore(qr: QRCode, quiet = 4): boolean[][] {
  return qr.modules.slice(quiet, qr.size - quiet).map((row) => row.slice(quiet, qr.size - quiet));
}

/**
 * Rasterise to RGBA (8 bits/channel), the layout `jsQR` expects. Used by the
 * test-suite to prove the encoder round-trips through an independent decoder.
 */
export function qrToRGBA(qr: QRCode, scale = 4): { data: Uint8ClampedArray; width: number } {
  const width = qr.size * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dark = qr.modules[Math.floor(y / scale)][Math.floor(x / scale)];
      const i = (y * width + x) * 4;
      const value = dark ? 0 : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { data, width };
}
