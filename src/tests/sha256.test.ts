import { createHash, webcrypto } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { sha256Bytes, sha256Hex, sha256HexAsync, toHex, toUtf8Bytes } from '../lib/sha256';

/** Node's own SHA-256 — the reference this implementation must match. */
function reference(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
}

/** NIST / FIPS 180-4 published digests. */
const VECTORS: Array<[string, string]> = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
  [
    'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
    'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
  ],
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sha256Hex', () => {
  it.each(VECTORS)('matches the published digest for %s', (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it('returns 64 lowercase hex characters', () => {
    expect(sha256Hex('TikaTrack')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(sha256Hex('সবাইকে টিকা নিতে হবে')).toBe(sha256Hex('সবাইকে টিকা নিতে হবে'));
  });

  it('produces different digests for different inputs', () => {
    expect(sha256Hex('password')).not.toBe(sha256Hex('password '));
  });

  it('handles every block-boundary length', () => {
    // 55/56 and 63/64/119/120 bytes are where the padding wraps to a new block.
    for (const length of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 121, 1000]) {
      const input = 'a'.repeat(length);
      expect(sha256Hex(input), `length ${length}`).toBe(reference(input));
    }
  });

  it('matches Node for randomised inputs including multi-byte text', () => {
    const samples = [
      'a',
      'hello world',
      'বাংলাদেশের টিকাদান কর্মসূচি',
      'মিশ্র mixed 123 ✅ emoji',
      '\u0000\u0001\u0002 control characters',
      'x'.repeat(4096),
      '𝔘𝔫𝔦𝔠𝔬𝔡𝔢 astral plane',
    ];
    for (let i = 0; i < 60; i += 1) {
      const length = Math.floor(Math.random() * 300);
      samples.push(
        Array.from({ length }, () => samples[i % 7][i % samples[i % 7].length]).join(''),
      );
    }
    for (const sample of samples) {
      expect(sha256Hex(sample)).toBe(reference(sample));
    }
  });

  it('exposes the raw 32-byte digest', () => {
    const digest = sha256Bytes(toUtf8Bytes('abc'));
    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.length).toBe(32);
    expect(toHex(digest)).toBe(VECTORS[1][1]);
  });
});

describe('toUtf8Bytes', () => {
  it('encodes ASCII as one byte per character', () => {
    expect(Array.from(toUtf8Bytes('abc'))).toEqual([0x61, 0x62, 0x63]);
  });

  it('encodes Bangla as multi-byte sequences', () => {
    // টিকা = U+099F U+09BF U+0995 U+09BE -> 3+3+3+3 bytes
    expect(toUtf8Bytes('টিকা').length).toBe(12);
    expect(Buffer.from(toUtf8Bytes('টিকা')).toString('utf8')).toBe('টিকা');
  });

  it('encodes astral-plane characters as four bytes', () => {
    expect(toUtf8Bytes('💉').length).toBe(4);
  });
});

describe('sha256HexAsync', () => {
  it('falls back to the portable implementation when SubtleCrypto is missing', async () => {
    // `crypto.subtle` only exists in a secure context. On plain HTTP (a clinic
    // LAN, an IP address) it is undefined — the exact case this fallback covers.
    const native = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: native.getRandomValues.bind(native) });
    expect(typeof crypto.subtle).toBe('undefined');

    await expect(sha256HexAsync('abc')).resolves.toBe(VECTORS[1][1]);
    await expect(sha256HexAsync('টিকা')).resolves.toBe(reference('টিকা'));
  });

  it('uses SubtleCrypto when it is available and agrees with the fallback', async () => {
    const native = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: native.getRandomValues.bind(native),
      subtle: webcrypto.subtle,
    });
    expect(typeof crypto.subtle).toBe('object');

    for (const input of ['', 'abc', 'টিকা', 'x'.repeat(200)]) {
      await expect(sha256HexAsync(input)).resolves.toBe(sha256Hex(input));
      await expect(sha256HexAsync(input)).resolves.toBe(reference(input));
    }
  });

  it('still hashes when SubtleCrypto rejects', async () => {
    const native = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: native.getRandomValues.bind(native),
      subtle: {
        digest: () => Promise.reject(new Error('operation denied')),
      },
    });
    await expect(sha256HexAsync('abc')).resolves.toBe(VECTORS[1][1]);
  });
});
