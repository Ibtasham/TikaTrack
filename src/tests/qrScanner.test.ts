import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateQR, qrToRGBA } from '../lib/qr';
import {
  classifyMediaError,
  decodeImageData,
  decodeImageFile,
  isCameraScanSupported,
  isSecureScanContext,
  loadDecoder,
  MAX_SCAN_DIMENSION,
  startCameraScan,
  type ScanError,
} from '../lib/qrScanner';

/**
 * The decoder is exercised end to end: a payload goes through TikaTrack's own QR
 * *encoder*, is rasterised to RGBA, and comes back out of `jsQR`. That is the same
 * path a photograph of a printed passport takes, so a change that breaks the
 * encoder's layout shows up here as a failed scan.
 */

const PAYLOAD = 'TIKAPASS1|ayesha-rahman|2026-11-12|MEUCIQDx';
const { data: QR_PIXELS, width: QR_WIDTH } = qrToRGBA(generateQR(PAYLOAD), 4);

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
}

function fakeStream(): { stream: MediaStream; tracks: FakeTrack[] } {
  const tracks: FakeTrack[] = [{ stop: vi.fn() }, { stop: vi.fn() }];
  return {
    stream: { getTracks: () => tracks } as unknown as MediaStream,
    tracks,
  };
}

function fakeVideo(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  return {
    readyState: 4,
    // Square, and the same size as the rasterised code the stub canvas returns:
    // `drawToPixels` reports the dimensions it drew into, not the image's own.
    videoWidth: QR_WIDTH,
    videoHeight: QR_WIDTH,
    muted: false,
    srcObject: null,
    setAttribute: vi.fn(),
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    ...overrides,
  } as unknown as HTMLVideoElement;
}

/** Replace `document.createElement('canvas')` with one that returns known pixels. */
function stubCanvas(pixels: Uint8ClampedArray = QR_PIXELS, width = QR_WIDTH) {
  const getImageData = vi.fn(() => ({ data: pixels, width, height: width }));
  const drawImage = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage, getImageData }) };
  const original = document.createElement.bind(document);

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'canvas' ? canvas : original(tag)) as typeof document.createElement);

  return { canvas, drawImage, getImageData };
}

function stubCanvasWithoutContext() {
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'canvas'
      ? { width: 0, height: 0, getContext: () => null }
      : original(tag)) as typeof document.createElement);
}

function stubMediaDevices(getUserMedia: (...args: unknown[]) => Promise<unknown>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });
}

function removeMediaDevices(): void {
  delete (navigator as unknown as Record<string, unknown>).mediaDevices;
}

function setSecureContext(secure: boolean): void {
  Object.defineProperty(window, 'isSecureContext', {
    value: secure,
    configurable: true,
    writable: true,
  });
}

/**
 * Fake timers advance the clock, but a scan tick is a chain of awaited promises
 * (decoder import → decode → callback). Drain them before asserting.
 */
async function flushMicrotasks(times = 25): Promise<void> {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
}

function mediaError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

beforeEach(() => {
  setSecureContext(true);
  removeMediaDevices();
  delete (globalThis as Record<string, unknown>).createImageBitmap;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  removeMediaDevices();
});

describe('decodeImageData', () => {
  it('reads back a payload encoded by TikaTrack', async () => {
    await expect(decodeImageData(QR_PIXELS, QR_WIDTH, QR_WIDTH)).resolves.toBe(PAYLOAD);
  });

  it('returns null for noise rather than throwing', async () => {
    const noise = new Uint8ClampedArray(120 * 120 * 4).fill(127);
    await expect(decodeImageData(noise, 120, 120)).resolves.toBeNull();
  });

  it('returns null for a blank frame', async () => {
    const blank = new Uint8ClampedArray(64 * 64 * 4);
    await expect(decodeImageData(blank, 64, 64)).resolves.toBeNull();
  });

  it('returns null for a zero-width frame', async () => {
    await expect(decodeImageData(QR_PIXELS, 0, 64)).resolves.toBeNull();
  });

  it('returns null for a zero-height frame', async () => {
    await expect(decodeImageData(QR_PIXELS, 64, 0)).resolves.toBeNull();
  });

  it('returns null when the buffer is too short for the stated dimensions', async () => {
    await expect(decodeImageData(new Uint8ClampedArray(8), 64, 64)).resolves.toBeNull();
  });

  it('reports null and warns when the decoder itself fails', async () => {
    vi.resetModules();
    vi.doMock('jsqr', () => ({
      default: () => {
        throw new Error('decoder exploded');
      },
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fresh = await import('../lib/qrScanner');

    await expect(fresh.decodeImageData(QR_PIXELS, QR_WIDTH, QR_WIDTH)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();

    vi.doUnmock('jsqr');
    vi.resetModules();
  });
});

describe('loadDecoder', () => {
  it('loads jsQR once and reuses it', async () => {
    const first = await loadDecoder();
    const second = await loadDecoder();
    expect(typeof first).toBe('function');
    expect(second).toBe(first);
  });
});

describe('classifyMediaError', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['PermissionDeniedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'no-camera'],
    ['DevicesNotFoundError', 'no-camera'],
    ['OverconstrainedError', 'no-camera'],
    ['NotReadableError', 'no-camera'],
    ['TrackStartError', 'no-camera'],
    ['SomethingElse', 'unknown'],
  ])('maps %s to %s', (name, kind) => {
    expect(classifyMediaError(mediaError(name)).kind).toBe(kind);
  });

  it('keeps the original message', () => {
    const error = mediaError('NotAllowedError');
    error.message = 'Permission denied by user';
    expect(classifyMediaError(error).message).toBe('Permission denied by user');
  });

  it('survives non-error values', () => {
    expect(classifyMediaError('nope').kind).toBe('unknown');
    expect(classifyMediaError(undefined).kind).toBe('unknown');
    expect(classifyMediaError(null).message).toContain('unknown');
  });
});

describe('support detection', () => {
  it('needs mediaDevices.getUserMedia for a camera', () => {
    expect(isCameraScanSupported()).toBe(false);
    stubMediaDevices(vi.fn());
    expect(isCameraScanSupported()).toBe(true);
  });

  it('needs a secure context, because getUserMedia does', () => {
    setSecureContext(true);
    expect(isSecureScanContext()).toBe(true);
    setSecureContext(false);
    expect(isSecureScanContext()).toBe(false);
  });
});

describe('decodeImageFile', () => {
  it('decodes a photo through createImageBitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', async () => ({
      width: QR_WIDTH,
      height: QR_WIDTH,
      close,
    }));
    const { drawImage } = stubCanvas();

    await expect(decodeImageFile(new Blob(['pretend png']))).resolves.toBe(PAYLOAD);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('downscales oversized photos before decoding', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 4000,
      height: 3000,
      close: vi.fn(),
    }));
    const { canvas } = stubCanvas();

    await decodeImageFile(new Blob(['big photo']));

    expect(canvas.width).toBe(MAX_SCAN_DIMENSION);
    expect(canvas.height).toBe(Math.round((3000 / 4000) * MAX_SCAN_DIMENSION));
  });

  it('gives up cleanly when neither bitmap nor object-URL decoding exists', async () => {
    // createImageBitmap rejects (an unsupported image type), and there is no
    // URL.createObjectURL to fall back to: the promise must still resolve.
    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('unsupported type');
    });
    vi.stubGlobal('URL', undefined);

    await expect(decodeImageFile(new Blob(['x']))).resolves.toBeNull();
  });

  it('is null when the canvas has no 2d context', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({
      width: QR_WIDTH,
      height: QR_WIDTH,
      close: vi.fn(),
    }));
    stubCanvasWithoutContext();

    await expect(decodeImageFile(new Blob(['x']))).resolves.toBeNull();
  });

  it('is null for a zero-sized bitmap', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({ width: 0, height: 0, close: vi.fn() }));

    await expect(decodeImageFile(new Blob(['x']))).resolves.toBeNull();
  });
});

describe('startCameraScan', () => {
  it('refuses to run on an insecure origin', async () => {
    setSecureContext(false);
    const onError = vi.fn();

    await expect(
      startCameraScan({ video: fakeVideo(), onDetect: vi.fn(), onError }),
    ).resolves.toBeNull();
    expect(onError.mock.calls[0][0].kind).toBe('not-secure-context');
  });

  it('reports an unsupported browser', async () => {
    const onError = vi.fn();

    await expect(
      startCameraScan({ video: fakeVideo(), onDetect: vi.fn(), onError }),
    ).resolves.toBeNull();
    expect(onError.mock.calls[0][0].kind).toBe('unsupported');
  });

  it('reports a denied camera permission', async () => {
    stubMediaDevices(async () => {
      throw mediaError('NotAllowedError');
    });
    const onError = vi.fn();

    await expect(
      startCameraScan({ video: fakeVideo(), onDetect: vi.fn(), onError }),
    ).resolves.toBeNull();
    expect(onError.mock.calls[0][0]).toMatchObject({ kind: 'permission-denied' });
  });

  it('asks for the rear camera and releases the stream when play() fails', async () => {
    const { stream, tracks } = fakeStream();
    const getUserMedia = vi.fn(async () => stream);
    stubMediaDevices(getUserMedia);
    const onError = vi.fn();
    const video = fakeVideo({
      play: vi.fn(async () => {
        throw mediaError('NotReadableError');
      }),
    } as unknown as Partial<HTMLVideoElement>);

    await expect(startCameraScan({ video, onDetect: vi.fn(), onError })).resolves.toBeNull();
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    expect(video.muted).toBe(true);
    expect(video.setAttribute).toHaveBeenCalledWith('playsinline', 'true');
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
    expect(onError.mock.calls[0][0].kind).toBe('no-camera');
  });

  it('detects a code from camera frames, once', async () => {
    vi.useFakeTimers();
    const { stream } = fakeStream();
    stubMediaDevices(async () => stream);
    stubCanvas();
    const onDetect = vi.fn();
    const onError = vi.fn();

    const stop = await startCameraScan({
      video: fakeVideo(),
      onDetect,
      onError,
      intervalMs: 100,
    });

    expect(stop).toBeTypeOf('function');
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    expect(onDetect).toHaveBeenCalledWith(PAYLOAD);

    await vi.advanceTimersByTimeAsync(500);
    await flushMicrotasks();
    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    stop?.();
  });

  it('waits for the first frame before decoding', async () => {
    vi.useFakeTimers();
    const { stream } = fakeStream();
    stubMediaDevices(async () => stream);
    const { getImageData } = stubCanvas();
    const onDetect = vi.fn();
    const video = fakeVideo({
      readyState: 0,
      videoWidth: 0,
    } as unknown as Partial<HTMLVideoElement>);

    const stop = await startCameraScan({ video, onDetect, onError: vi.fn(), intervalMs: 50 });
    await vi.advanceTimersByTimeAsync(150);
    await flushMicrotasks();
    expect(getImageData).not.toHaveBeenCalled();

    Object.assign(video, { readyState: 4, videoWidth: QR_WIDTH, videoHeight: QR_WIDTH });
    await vi.advanceTimersByTimeAsync(50);
    await flushMicrotasks();
    expect(onDetect).toHaveBeenCalledWith(PAYLOAD);

    stop?.();
  });

  it('stops the camera and the timer', async () => {
    vi.useFakeTimers();
    const { stream, tracks } = fakeStream();
    stubMediaDevices(async () => stream);
    // A blank frame: every decode returns null, so nothing is ever detected.
    stubCanvas(new Uint8ClampedArray(QR_WIDTH * QR_WIDTH * 4).fill(200));
    const onDetect = vi.fn();
    const video = fakeVideo();

    const stop = await startCameraScan({ video, onDetect, onError: vi.fn(), intervalMs: 50 });
    await vi.advanceTimersByTimeAsync(100);
    stop?.();

    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();

    const before = onDetect.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);
    expect(onDetect.mock.calls.length).toBe(before);
  });

  it('keeps scanning when a frame holds no code', async () => {
    vi.useFakeTimers();
    const { stream } = fakeStream();
    stubMediaDevices(async () => stream);
    stubCanvas(new Uint8ClampedArray(QR_WIDTH * QR_WIDTH * 4).fill(200));
    const onDetect = vi.fn();
    const onError = vi.fn();

    const stop = await startCameraScan({ video: fakeVideo(), onDetect, onError, intervalMs: 50 });
    await vi.advanceTimersByTimeAsync(250);

    expect(onDetect).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    stop?.();
  });

  it('clamps an absurd decode interval', async () => {
    vi.useFakeTimers();
    const { stream } = fakeStream();
    stubMediaDevices(async () => stream);
    stubCanvas();
    const onDetect = vi.fn();

    const stop = await startCameraScan({
      video: fakeVideo(),
      onDetect,
      onError: vi.fn(),
      intervalMs: 1,
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(onDetect).toHaveBeenCalledWith(PAYLOAD);
    stop?.();
  });
});

describe('ScanError shape', () => {
  it('always carries a kind and a message', () => {
    const error: ScanError = classifyMediaError(mediaError('NotAllowedError'));
    expect(Object.keys(error).sort()).toEqual(['kind', 'message']);
  });
});
