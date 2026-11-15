/**
 * QR decoding: camera scanning and photo import.
 *
 * The passport page can already *issue* a signed QR code; without a decoder the
 * other half of the story — a health worker pointing a phone at a card to check
 * it — is impossible. Decoding is done locally with `jsQR`: no image ever leaves
 * the device, and the decoder is imported on demand so the ~50 kB only loads when
 * someone actually opens the scanner.
 *
 * Two entry points, because cameras are not reliable in the field:
 *   `startCameraScan`  — live `getUserMedia` frames
 *   `decodeImageFile`  — a photo of a card, which also works from a gallery
 *
 * Every failure is reported as a `ScanError` with a machine-readable kind so the
 * UI can say something useful ("allow camera access") instead of "error".
 */

import type jsQR from 'jsqr';

type Decoder = typeof jsQR;

/** Largest dimension sent to the decoder: bigger frames cost accuracy, not gain. */
export const MAX_SCAN_DIMENSION = 1200;

export type ScanErrorKind =
  | 'unsupported'
  | 'permission-denied'
  | 'no-camera'
  | 'not-secure-context'
  | 'decode-failed'
  | 'unknown';

export interface ScanError {
  kind: ScanErrorKind;
  message: string;
}

export interface CameraScanOptions {
  video: HTMLVideoElement;
  onDetect: (data: string) => void;
  onError: (error: ScanError) => void;
  /** Decode cadence. 250 ms is smooth on a mid-range phone. */
  intervalMs?: number;
}

export type StopScan = () => void;

let decoderPromise: Promise<Decoder> | null = null;

/** Load the decoder once, lazily. */
export function loadDecoder(): Promise<Decoder> {
  decoderPromise ??= import('jsqr').then((module) => (module.default ?? module) as Decoder);
  return decoderPromise;
}

export function isCameraScanSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/** `getUserMedia` needs HTTPS (or localhost); say so instead of failing silently. */
export function isSecureScanContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
}

/** Turn a `DOMException` from `getUserMedia` into something the UI can explain. */
export function classifyMediaError(error: unknown): ScanError {
  const name = typeof error === 'object' && error !== null ? (error as { name?: string }).name : '';
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return { kind: 'permission-denied', message };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return { kind: 'no-camera', message };
    case 'NotReadableError':
    case 'TrackStartError':
      return { kind: 'no-camera', message };
    default:
      return { kind: 'unknown', message };
  }
}

/**
 * Decode RGBA pixels — the format `getImageData` and `qrToRGBA` both produce.
 *
 * Returns the payload, or `null` when no QR code was found (which is the normal
 * case for most camera frames, not an error).
 */
export async function decodeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<string | null> {
  if (!data || width <= 0 || height <= 0 || data.length < width * height * 4) return null;
  try {
    const decode = await loadDecoder();
    // `attemptBoth` also reads inverted (light-on-dark) codes, which is what a
    // dark-mode screen or a photo of one looks like.
    const result = decode(data, width, height, { inversionAttempts: 'attemptBoth' });
    const payload = result?.data?.trim();
    return payload ? payload : null;
  } catch (error) {
    console.warn('[qr] decode failed', error);
    return null;
  }
}

function drawToPixels(
  source: CanvasImageSource,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } | null {
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(1, MAX_SCAN_DIMENSION / Math.max(width, height));
  const target = document.createElement('canvas');
  target.width = Math.max(1, Math.round(width * scale));
  target.height = Math.max(1, Math.round(height * scale));

  const context = target.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(source, 0, 0, target.width, target.height);
  const image = context.getImageData(0, 0, target.width, target.height);
  return { data: image.data, width: target.width, height: target.height };
}

/** Decode a photo (a `File` from an `<input type="file">`, or any Blob). */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const bitmap = await loadBitmap(file);
  if (!bitmap) return null;

  const width = 'width' in bitmap ? bitmap.width : 0;
  const height = 'height' in bitmap ? bitmap.height : 0;
  const pixels = drawToPixels(bitmap, width, height);
  bitmap.close?.();

  if (!pixels) return null;
  return decodeImageData(pixels.data, pixels.width, pixels.height);
}

/** Either decoder input type, with `close()` when the platform offers it. */
type BitmapLike = (ImageBitmap | HTMLImageElement) & { close?: () => void };

/** `createImageBitmap` where available, `<img>` + object URL everywhere else. */
async function loadBitmap(file: Blob): Promise<BitmapLike | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path */
    }
  }

  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('could not decode image'));
      image.src = url;
    });
    // The object URL has to outlive the draw call, so revoke it on the next tick.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return image;
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/**
 * Start scanning camera frames.
 *
 * Resolves to a `stop()` function, or `null` when the camera could not be
 * started (in which case `onError` has already been called).
 */
export async function startCameraScan(options: CameraScanOptions): Promise<StopScan | null> {
  const { video, onDetect, onError } = options;
  const intervalMs = Math.max(50, options.intervalMs ?? 250);

  if (!isSecureScanContext()) {
    onError({
      kind: 'not-secure-context',
      message: 'Camera access requires HTTPS (or localhost).',
    });
    return null;
  }
  if (!isCameraScanSupported()) {
    onError({ kind: 'unsupported', message: 'This browser cannot access a camera.' });
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch (error) {
    onError(classifyMediaError(error));
    return null;
  }

  video.srcObject = stream;
  // Muted + playsInline: without both, iOS refuses to play without a gesture.
  video.muted = true;
  video.setAttribute('playsinline', 'true');
  try {
    await video.play();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    onError(classifyMediaError(error));
    return null;
  }

  let stopped = false;
  let busy = false;
  let detected = false;

  const tick = async (): Promise<void> => {
    if (stopped || busy || detected) return;
    // `readyState < 2` means the first frame has not arrived yet.
    if (video.readyState < 2 || !video.videoWidth) return;

    busy = true;
    try {
      const pixels = drawToPixels(video, video.videoWidth, video.videoHeight);
      const payload = pixels
        ? await decodeImageData(pixels.data, pixels.width, pixels.height)
        : null;
      if (payload && !stopped && !detected) {
        detected = true;
        onDetect(payload);
      }
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
  };
}
