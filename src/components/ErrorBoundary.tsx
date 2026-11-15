import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LifeBuoy } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time crashes so one broken component cannot white-screen the
 * whole app — and, crucially, so the user is told their locally stored records
 * are still safe.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[TikaTrack] uncaught render error', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <LifeBuoy className="h-9 w-9" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            TikaTrack hit an unexpected error
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            Your saved records are still on this device. Reload the page, or go home and try again.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-neutral-100 p-3 text-left text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {error.message}
          </pre>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow transition hover:bg-emerald-700"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                // BASE_URL, not '/': on a sub-path deploy (GitHub Pages project
                // site) '/' would leave the app entirely.
                window.location.assign(import.meta.env.BASE_URL);
              }}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Go home
            </button>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Health hotline:{' '}
            <a className="underline" href="tel:16263">
              16263
            </a>
          </p>
        </div>
      </div>
    );
  }
}
