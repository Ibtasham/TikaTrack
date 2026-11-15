import { useEffect, useRef, useState } from 'react';
import { CloudOff, RefreshCw, X } from 'lucide-react';

import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { useOnlineStatus, useServiceWorkerUpdate } from '../hooks';

/**
 * Connection + build status, rendered at the top of `<main>`.
 *
 * Three states matter to a user in the field:
 *
 *  1. **Offline** — say so explicitly, and say that nothing is lost. A health
 *     app that silently stops syncing erodes trust faster than one that admits
 *     the connection dropped.
 *  2. **Offline ready** — a one-off confirmation that the shell has been cached,
 *     so the promise "works without internet" is visibly true.
 *  3. **Update available** — a new build is waiting; reload on the user's terms
 *     rather than yanking the page mid-entry.
 *
 * It also owns service-worker registration, which is why it is mounted once
 * from `Layout`.
 */
export function AppStatus() {
  const { t, language } = useI18n();
  const toast = useToast();
  const online = useOnlineStatus();
  const { offlineReady, updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  const [updateDismissed, setUpdateDismissed] = useState(false);
  const announcedOfflineReady = useRef(false);

  useEffect(() => {
    if (!offlineReady || announcedOfflineReady.current) return;
    announcedOfflineReady.current = true;
    toast.success(t('common.offline.ready'), t('common.offline.readyBody'));
  }, [offlineReady, toast, t]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {!online && (
        <p
          role="status"
          className="animate-slide-up mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={language === 'bn' ? 'font-bangla' : undefined}>
            <strong className="font-semibold">{t('common.offline.title')}.</strong>{' '}
            {t('common.offline.body')}
          </span>
        </p>
      )}

      {updateAvailable && !updateDismissed && (
        <div
          role="status"
          className="animate-slide-up mt-3 flex items-center gap-3 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={`flex-1 ${language === 'bn' ? 'font-bangla' : ''}`}>
            <strong className="font-semibold">{t('common.update.title')}.</strong>{' '}
            {t('common.update.body')}
          </span>
          <button
            type="button"
            className="btn-primary btn-sm shrink-0"
            onClick={() => void applyUpdate()}
          >
            {t('common.update.action')}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm shrink-0"
            onClick={() => setUpdateDismissed(true)}
            aria-label={t('common.update.later')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default AppStatus;
