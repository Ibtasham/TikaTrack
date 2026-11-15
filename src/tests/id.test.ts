import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createId,
  createMessageId,
  createPassportId,
  createProfileId,
  createShortCode,
} from '../lib/id';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createId', () => {
  it('defaults to an "id" prefix', () => {
    expect(createId()).toMatch(/^id-/);
  });

  it('honours a custom prefix', () => {
    expect(createId('profile')).toMatch(/^profile-/);
  });

  it('uses a UUID when the platform provides one', () => {
    // UUID v4: 8-4-4-4-12 hex with the version nibble set.
    expect(createId('x')).toMatch(
      /^x-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('falls back to a time+random composite without randomUUID', () => {
    const native = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: native.getRandomValues.bind(native) });

    const id = createId('legacy');
    expect(id).toMatch(/^legacy-[0-9a-z]+-[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it('falls back to Math.random when crypto is absent entirely', () => {
    vi.stubGlobal('crypto', undefined);
    expect(createId('bare')).toMatch(/^bare-/);
  });

  it('never repeats across 5000 ids', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => createId('u')));
    expect(ids.size).toBe(5000);
  });

  it('never repeats on the fallback path either', () => {
    const native = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: native.getRandomValues.bind(native) });
    const ids = new Set(Array.from({ length: 2000 }, () => createId('u')));
    expect(ids.size).toBe(2000);
  });

  it('exposes purpose-built prefixes', () => {
    expect(createProfileId()).toMatch(/^profile-/);
    expect(createMessageId()).toMatch(/^msg-/);
    expect(createPassportId()).toMatch(/^passport-/);
  });
});

describe('createShortCode', () => {
  it('builds TT- plus three groups of four', () => {
    expect(createShortCode()).toMatch(/^TT-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('honours custom groups and group length', () => {
    expect(createShortCode(2, 6)).toMatch(/^TT-[A-Z2-9]{6}-[A-Z2-9]{6}$/);
    expect(createShortCode(1, 3)).toMatch(/^TT-[A-Z2-9]{3}$/);
  });

  it('never emits the ambiguous characters I, O, 0 or 1', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(createShortCode()).not.toMatch(/[IO01]/);
    }
  });

  it('produces distinct codes', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => createShortCode()));
    expect(codes.size).toBe(1000);
  });

  it('still works without crypto', () => {
    vi.stubGlobal('crypto', undefined);
    expect(createShortCode()).toMatch(/^TT-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});
