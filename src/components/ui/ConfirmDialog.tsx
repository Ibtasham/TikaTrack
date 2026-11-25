import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBodyScrollLock, useFocusTrap } from '../../hooks';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible replacement for `window.confirm()`.
 *
 * `confirm()` blocks the main thread, cannot be styled, is invisible to screen
 * readers inside SPAs and is disabled in some embedded webviews.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  // The trap handles Tab cycling, Escape and returning focus to the trigger.
  // `autoFocus: false` because a destructive dialog should land on its own
  // confirm button, not on whatever happens to be first.
  const dialogRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: onCancel,
    autoFocus: false,
  });

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-description' : undefined}
        className="animate-scale-in relative w-full max-w-md rounded-2xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              tone === 'danger'
                ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                : 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]'
            }`}
          >
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-[var(--tt-ink)]"
            >
              {title}
            </h2>
            {description ? (
              <div
                id="confirm-dialog-description"
                className="mt-1 text-sm text-[var(--tt-ink-muted)]"
              >
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
              tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
