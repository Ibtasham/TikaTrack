import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appUrl,
  buildRecordShareText,
  canSharePayload,
  isShareSupported,
  safeFilename,
  share,
  shareableFile,
  type SharePayload,
} from '../lib/share';

/**
 * jsdom implements neither the Web Share API nor the async clipboard, so every
 * branch here is driven by a stub: the native sheet, the clipboard fallback and
 * the "this browser can do neither" path.
 */

type Navigator = {
  share?: (payload: SharePayload) => Promise<void>;
  canShare?: (payload: SharePayload) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

function stubNavigator(patch: Navigator): void {
  for (const [key, value] of Object.entries(patch)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

function unstubNavigator(): void {
  for (const key of ['share', 'canShare', 'clipboard']) {
    delete (navigator as unknown as Record<string, unknown>)[key];
  }
}

function abortError(): Error {
  const error = new Error('The user aborted the share');
  error.name = 'AbortError';
  return error;
}

const RECORD = {
  name: 'Ayesha',
  ageText: '4 months old',
  completed: ['BCG', 'Pentavalent 1', 'Pentavalent 2'],
  nextDue: { vaccine: 'Pentavalent 3', dateText: '12 Nov 2026', inText: 'in 12 days' },
  overdue: [] as string[],
  language: 'en' as const,
  url: 'https://tikatrack.app/tracker',
};

beforeEach(() => {
  unstubNavigator();
});

afterEach(() => {
  unstubNavigator();
  vi.unstubAllGlobals();
});

describe('isShareSupported / canSharePayload', () => {
  it('is false when the browser has no Web Share API', () => {
    expect(isShareSupported()).toBe(false);
    expect(canSharePayload({ text: 'hello' })).toBe(false);
  });

  it('is true when share exists but canShare does not', () => {
    stubNavigator({ share: vi.fn(async () => undefined) });
    expect(isShareSupported()).toBe(true);
    expect(canSharePayload({ text: 'hello' })).toBe(true);
  });

  it('asks canShare about the exact payload (files are the usual blocker)', () => {
    const canShare = vi.fn(() => false);
    stubNavigator({ share: vi.fn(async () => undefined), canShare });
    const payload = { text: 'hello', files: [new File(['x'], 'a.png')] };

    expect(canSharePayload(payload)).toBe(false);
    expect(canShare).toHaveBeenCalledWith(payload);
  });

  it('is false when canShare throws', () => {
    stubNavigator({
      share: vi.fn(async () => undefined),
      canShare: () => {
        throw new Error('bad payload');
      },
    });
    expect(canSharePayload({ text: 'x' })).toBe(false);
  });
});

describe('share', () => {
  it('uses the native sheet when it is available', async () => {
    const native = vi.fn(async () => undefined);
    stubNavigator({ share: native });

    await expect(share({ title: 'Record', text: 'body' })).resolves.toBe('shared');
    expect(native).toHaveBeenCalledWith({ title: 'Record', text: 'body' });
  });

  it('reports a dismissed sheet as cancelled, not as an error', async () => {
    stubNavigator({
      share: vi.fn(async () => {
        throw abortError();
      }),
    });

    await expect(share({ text: 'body' })).resolves.toBe('cancelled');
  });

  it('falls back to the clipboard when the share call fails', async () => {
    const writeText = vi.fn(async () => undefined);
    stubNavigator({
      share: vi.fn(async () => {
        throw new Error('no handler app');
      }),
      clipboard: { writeText },
    });

    await expect(
      share({ title: 'TikaTrack', text: 'BCG given', url: 'https://x.test' }),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('TikaTrack\n\nBCG given\n\nhttps://x.test');
  });

  it('copies when there is no share API at all', async () => {
    const writeText = vi.fn(async () => undefined);
    stubNavigator({ clipboard: { writeText } });

    await expect(share({ text: 'just text' })).resolves.toBe('copied');
  });

  it('reports unavailable when nothing can carry the payload', async () => {
    stubNavigator({
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error('denied');
        }),
      },
    });

    await expect(share({ text: 'just text' })).resolves.toBe('unavailable');
  });

  it('is unavailable rather than copying an empty string', async () => {
    await expect(share({})).resolves.toBe('unavailable');
  });
});

describe('appUrl', () => {
  it('joins the origin, the deploy base and the route', () => {
    expect(appUrl('/tracker')).toBe(`${window.location.origin}${import.meta.env.BASE_URL}tracker`);
    expect(appUrl('tracker')).toBe(appUrl('/tracker'));
  });

  it('points at the app root by default', () => {
    expect(appUrl()).toBe(`${window.location.origin}${import.meta.env.BASE_URL}`);
  });

  it('honours a sub-path deploy', () => {
    vi.stubEnv('BASE_URL', '/tikatrack/');
    expect(appUrl('/passport')).toBe(`${window.location.origin}/tikatrack/passport`);
  });
});

describe('buildRecordShareText', () => {
  it('writes a WhatsApp-readable English summary', () => {
    const text = buildRecordShareText(RECORD);
    const lines = text.split('\n');

    expect(lines[0]).toBe('Vaccination record: Ayesha (4 months old)');
    expect(text).toContain('Completed (3): BCG, Pentavalent 1, Pentavalent 2');
    expect(text).toContain('Next due: Pentavalent 3 — 12 Nov 2026 (in 12 days)');
    expect(text).toContain('Overdue: none');
    expect(text).toContain('https://tikatrack.app/tracker');
    expect(text).toContain('not an official document');
  });

  it('writes the same summary in Bangla', () => {
    const text = buildRecordShareText({ ...RECORD, language: 'bn', ageText: '৪ মাস বয়স' });

    expect(text).toContain('টিকার রেকর্ড: Ayesha (৪ মাস বয়স)');
    expect(text).toContain('সম্পন্ন (3):');
    expect(text).toContain('পরবর্তী টিকা: Pentavalent 3');
    expect(text).toContain('সরকারি দলিল নয়');
  });

  it('says "none" when nothing has been given yet', () => {
    const text = buildRecordShareText({ ...RECORD, completed: [], nextDue: undefined });
    expect(text).toContain('Completed (0): none');
    expect(text).not.toContain('Next due');
  });

  it('lists overdue vaccines by name', () => {
    const text = buildRecordShareText({ ...RECORD, overdue: ['MR 1', 'Vitamin A'] });
    expect(text).toContain('Overdue: MR 1, Vitamin A');
  });

  it('omits the age when it is unknown', () => {
    expect(buildRecordShareText({ ...RECORD, ageText: undefined }).split('\n')[0]).toBe(
      'Vaccination record: Ayesha',
    );
  });

  it('falls back to this deployment when no URL is given', () => {
    const text = buildRecordShareText({ ...RECORD, url: undefined });
    expect(text).toContain(appUrl('/tracker'));
  });

  it('never emits a carriage return, so the text pastes cleanly', () => {
    expect(buildRecordShareText(RECORD)).not.toContain('\r');
  });
});

describe('shareableFile', () => {
  it('wraps a blob with a filename and keeps its type', () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const file = shareableFile(blob, 'passport.png');

    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe('passport.png');
    expect(file?.type).toBe('image/png');
  });

  it('defaults the type to image/png', () => {
    const file = shareableFile(new Blob(['x']), 'passport');
    expect(file?.type).toBe('image/png');
  });

  it('is null when the platform has no File constructor', () => {
    vi.stubGlobal('File', undefined);
    expect(shareableFile(new Blob(['x']), 'passport.png')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// safeFilename — names travel into downloads, share sheets and URLs
// ---------------------------------------------------------------------------

describe('safeFilename', () => {
  it('lowercases and hyphenates a Latin name', () => {
    expect(safeFilename('Ayesha Rahman')).toBe('ayesha-rahman');
  });

  it('trims surrounding space and punctuation', () => {
    expect(safeFilename('  Rafi!! ')).toBe('rafi');
    expect(safeFilename('...')).toBe('tikatrack');
  });

  it('collapses runs of unsafe characters into one hyphen', () => {
    expect(safeFilename('MD   Karim / Jr.')).toBe('md-karim-jr');
  });

  it('falls back when nothing survives (a Bengali name, say)', () => {
    expect(safeFilename('রাফি')).toBe('tikatrack');
    expect(safeFilename('রাফি', 'member')).toBe('member');
    expect(safeFilename('', 'member')).toBe('member');
  });

  it('keeps digits, which is what makes a dose-1 and dose-2 file differ', () => {
    expect(safeFilename('PCV Dose 2')).toBe('pcv-dose-2');
  });

  it('never returns undefined for a missing value', () => {
    expect(safeFilename(undefined as unknown as string)).toBe('tikatrack');
  });
});
