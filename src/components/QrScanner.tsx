import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp, Loader2, ScanLine } from 'lucide-react';

import { useI18n } from '../i18n';
import {
  decodeImageFile,
  isCameraScanSupported,
  isSecureScanContext,
  startCameraScan,
  type ScanErrorKind,
  type StopScan,
} from '../lib/qrScanner';

const ERROR_KEYS: Record<ScanErrorKind, string> = {
  unsupported: 'passport.scanner.error.unsupported',
  'permission-denied': 'passport.scanner.error.permission',
  'no-camera': 'passport.scanner.error.noCamera',
  'not-secure-context': 'passport.scanner.error.insecure',
  'decode-failed': 'passport.scanner.error.decode',
  unknown: 'passport.scanner.error.unknown',
};

type ScannerState = 'idle' | 'starting' | 'scanning' | 'decoding';

/**
 * Read a TikaTrack passport QR from the camera or from a photo.
 *
 * Everything happens on the device: `jsQR` decodes pixels in the page, and the
 * payload is handed to the parent for signature verification. No frame is
 * uploaded anywhere, which is the only acceptable behaviour for a health record.
 *
 * The photo path is not a fallback for old browsers — it is the one that works
 * when the certificate is a printed card, a screenshot in a chat thread, or a
 * picture taken on someone else's phone.
 */
export function QrScanner({
  onPayload,
  className = '',
}: {
  onPayload: (payload: string) => void;
  className?: string;
}) {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<ScanErrorKind | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<StopScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cameraAvailable = isSecureScanContext() && isCameraScanSupported();

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setState('idle');
  }, []);

  // Never leave the camera light on after the user navigates away.
  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setState('starting');
    setError(null);
    const stopScan = await startCameraScan({
      video,
      onDetect: (payload) => {
        stopRef.current?.();
        stopRef.current = null;
        setState('idle');
        onPayload(payload);
      },
      onError: (scanError) => {
        setError(scanError.kind);
        setState('idle');
      },
    });

    if (stopScan) {
      stopRef.current = stopScan;
      setState('scanning');
    }
  }, [onPayload]);

  const handleFile = useCallback(
    async (file: File) => {
      setState('decoding');
      setError(null);
      const payload = await decodeImageFile(file);
      setState('idle');
      if (payload) onPayload(payload);
      else setError('decode-failed');
    },
    [onPayload],
  );

  const busy = state === 'starting' || state === 'decoding';

  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <p
        className={`flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
      >
        <ScanLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {t('passport.scanner.title')}
      </p>
      <p
        className={`mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
      >
        {t('passport.scanner.body')}
      </p>

      {(state === 'scanning' || state === 'starting') && (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-56 w-full object-cover"
            aria-label={t('passport.scanner.videoLabel')}
          />
          {/* Aiming guide. */}
          <div
            className="pointer-events-none absolute inset-0 m-auto h-36 w-36 rounded-lg border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]"
            aria-hidden="true"
          />
          {state === 'starting' && (
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white">
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {t('common.status.loading')}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cameraAvailable ? (
          state === 'scanning' || state === 'starting' ? (
            <button type="button" className="btn-secondary btn-sm" onClick={stop}>
              <CameraOff className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('passport.scanner.stop')}
              </span>
            </button>
          ) : (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void start()}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('passport.scanner.start')}
              </span>
            </button>
          )
        ) : (
          <p
            className={`flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
          >
            <CameraOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t(
              isSecureScanContext()
                ? 'passport.scanner.error.unsupported'
                : 'passport.scanner.error.insecure',
            )}
          </p>
        )}

        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="h-4 w-4" aria-hidden="true" />
          )}
          <span className={isBangla ? 'font-bangla' : undefined}>
            {t('passport.scanner.upload')}
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            // Reset so choosing the same photo twice still fires onChange.
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className={`mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
        >
          {t(ERROR_KEYS[error])}
        </p>
      )}
    </div>
  );
}

export default QrScanner;
