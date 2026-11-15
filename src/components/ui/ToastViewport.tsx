import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast, type ToastType } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} satisfies Record<ToastType, typeof Info>;

const STYLES = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/70 dark:text-red-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-100',
} satisfies Record<ToastType, string>;

const ICON_COLOURS = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-sky-600 dark:text-sky-400',
} satisfies Record<ToastType, string>;

/**
 * Renders the active toasts. Mounted once, near the app root.
 *
 * The container is an ARIA live region so screen readers announce new toasts
 * without stealing focus.
 */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  const { t } = useI18n();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      role="region"
      aria-live="polite"
      aria-label={t('common.a11y.dialogClose') === 'Close dialog' ? 'Notifications' : 'নোটিফিকেশন'}
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`animate-slide-in-right pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur ${STYLES[toast.type]}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLOURS[toast.type]}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? <p className="mt-0.5 text-sm opacity-80">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-lg p-1 opacity-60 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={t('common.actions.close')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
