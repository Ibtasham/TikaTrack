import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  copyToClipboard,
  csvCell,
  downloadCSV,
  downloadJSON,
  downloadTextFile,
  printElement,
  toCSV,
} from '../lib/exporters';

let capturedBlob: Blob | null = null;
let clicked: Array<{ download: string; href: string }> = [];
const createObjectURL = vi.fn<(blob: Blob) => string>((blob) => {
  capturedBlob = blob;
  return 'blob:tikatrack-mock';
});
const revokeObjectURL = vi.fn<(url: string) => void>();

let originalCreate: typeof URL.createObjectURL | undefined;
let originalRevoke: typeof URL.revokeObjectURL | undefined;

/** jsdom implements Blob but not `Blob.prototype.text`, so read via FileReader. */
function readBlob(blob: Blob | null): Promise<string> {
  if (!blob) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/**
 * Raw bytes — `readAsText` strips a leading BOM (per spec), so the BOM itself
 * has to be asserted on the encoded bytes.
 */
function readBlobBytes(blob: Blob | null): Promise<Uint8Array> {
  if (!blob) return Promise.resolve(new Uint8Array());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** Define a property on a host object and undo it afterwards. */
const defined: Array<[object, string, PropertyDescriptor | undefined]> = [];
function defineOnce(target: object, key: string, value: unknown) {
  defined.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { value, configurable: true, writable: true });
}

beforeEach(() => {
  capturedBlob = null;
  clicked = [];
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();

  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(
    this: HTMLAnchorElement,
  ) {
    clicked.push({ download: this.download, href: this.href });
  });
  document.body.innerHTML = '';
});

afterEach(() => {
  URL.createObjectURL = originalCreate!;
  URL.revokeObjectURL = originalRevoke!;
  for (const [target, key, descriptor] of defined.splice(0)) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else delete (target as Record<string, unknown>)[key];
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('csvCell', () => {
  it.each([
    ['plain', 'plain'],
    [42, '42'],
    [true, 'true'],
    [null, ''],
    [undefined, ''],
  ])('renders %s as %s', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    expect(csvCell('Dhaka, Bangladesh')).toBe('"Dhaka, Bangladesh"');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('keeps Bangla text intact', () => {
    expect(csvCell('টিকা কেন্দ্র')).toBe('টিকা কেন্দ্র');
  });
});

describe('toCSV', () => {
  it('joins cells with commas and rows with CRLF (what Excel expects)', () => {
    expect(
      toCSV([
        ['name', 'dose'],
        ['Ayesha', 2],
      ]),
    ).toBe('name,dose\r\nAyesha,2');
  });

  it('returns an empty string for no rows', () => {
    expect(toCSV([])).toBe('');
  });
});

describe('downloadTextFile', () => {
  it('creates a blob URL, clicks a download anchor and cleans up', () => {
    vi.useFakeTimers();
    downloadTextFile('records.txt', 'hello', 'text/plain');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clicked).toEqual([{ download: 'records.txt', href: 'blob:tikatrack-mock' }]);
    // The anchor is transient — it must not be left in the document.
    expect(document.querySelector('a[download]')).toBeNull();

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:tikatrack-mock');
  });

  it('writes the exact contents with the requested mime type', async () => {
    downloadTextFile('notes.txt', 'টিকা রেকর্ড', 'text/plain;charset=utf-8');

    expect(capturedBlob?.type).toBe('text/plain;charset=utf-8');
    await expect(readBlob(capturedBlob)).resolves.toBe('টিকা রেকর্ড');
  });

  it('defaults to JSON mime', () => {
    downloadTextFile('data.json', '{}');
    expect(capturedBlob?.type).toBe('application/json;charset=utf-8');
  });
});

describe('downloadJSON', () => {
  it('serialises pretty-printed JSON that parses back to the input', async () => {
    const data = { version: 2, profiles: [{ name: 'Ayesha', doses: [1, 2] }] };
    downloadJSON('backup.json', data);

    const text = await readBlob(capturedBlob);
    expect(text).toContain('\n  "version": 2');
    expect(JSON.parse(text ?? '')).toEqual(data);
    expect(clicked[0].download).toBe('backup.json');
  });
});

describe('downloadCSV', () => {
  it('prepends a UTF-8 BOM so Excel renders Bangla correctly', async () => {
    downloadCSV('records.csv', [
      ['নাম', 'dose'],
      ['আয়েশা', 1],
    ]);

    const bytes = await readBlobBytes(capturedBlob);
    // UTF-8 BOM, so Excel opens the file as UTF-8 instead of mangling Bangla.
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(capturedBlob?.type).toBe('text/csv;charset=utf-8');
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('নাম,dose\r\nআয়েশা,1');
    expect(clicked[0].download).toBe('records.csv');
  });
});

describe('printElement', () => {
  it('prints just the given node, then removes the frame', () => {
    vi.useFakeTimers();
    const node = document.createElement('section');
    node.innerHTML = '<h1>Vaccination certificate</h1><p class="no-print">hide me</p>';
    document.body.appendChild(node);

    expect(printElement(node, 'TikaTrack certificate')).toBe(true);

    const frame = document.querySelector<HTMLIFrameElement>('iframe[aria-hidden="true"]');
    expect(frame).not.toBeNull();
    const doc = frame?.contentDocument;
    expect(doc?.title).toBe('TikaTrack certificate');
    expect(doc?.body.innerHTML).toContain('Vaccination certificate');
    // The print stylesheet must hide elements marked .no-print.
    expect(doc?.head.innerHTML).toContain('.no-print');

    const print = vi.fn();
    defineOnce(frame!.contentWindow!, 'print', print);
    defineOnce(frame!.contentWindow!, 'focus', vi.fn()); // jsdom has no window.focus
    vi.advanceTimersByTime(150);
    expect(print).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1000);
    expect(document.querySelector('iframe[aria-hidden="true"]')).toBeNull();
  });

  it('returns false when the frame has no document', () => {
    vi.spyOn(HTMLIFrameElement.prototype, 'contentDocument', 'get').mockReturnValue(null);
    const node = document.createElement('div');
    document.body.appendChild(node);

    expect(printElement(node)).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('copyToClipboard', () => {
  it('uses the async clipboard API when present', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    defineOnce(navigator, 'clipboard', { writeText });

    await expect(copyToClipboard('passport-payload')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('passport-payload');
  });

  it('falls back to execCommand when the clipboard API rejects', async () => {
    defineOnce(navigator, 'clipboard', { writeText: vi.fn().mockRejectedValue(new Error('nope')) });
    const execCommand = vi.fn().mockReturnValue(true);
    defineOnce(document, 'execCommand', execCommand);

    await expect(copyToClipboard('text')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    // The temporary textarea is cleaned up.
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports failure when execCommand says no', async () => {
    defineOnce(document, 'execCommand', vi.fn().mockReturnValue(false));
    await expect(copyToClipboard('text')).resolves.toBe(false);
  });

  it('reports failure when no clipboard path exists at all', async () => {
    // jsdom implements neither navigator.clipboard nor document.execCommand.
    await expect(copyToClipboard('text')).resolves.toBe(false);
  });

  it('reports failure when execCommand throws', async () => {
    defineOnce(
      document,
      'execCommand',
      vi.fn(() => {
        throw new Error('blocked');
      }),
    );
    await expect(copyToClipboard('text')).resolves.toBe(false);
  });
});
