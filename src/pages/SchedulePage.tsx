import { ErrorBoundary } from '../components/ErrorBoundary';
import ScheduleTimeline from '../components/ScheduleTimeline';
import { useI18n } from '../i18n';

/**
 * `/schedule`
 *
 * The interactive age-based timeline. The heavy lifting lives in
 * `ScheduleTimeline`, which is kept as its own component because it is also the
 * printable artefact (`print-area`) that the browser's print dialog captures.
 */
export default function SchedulePage() {
  const { t } = useI18n();

  return (
    <div className="page-shell">
      <ErrorBoundary
        fallback={(error, reset) => (
          <div className="card-padded mx-auto max-w-xl text-center">
            <h1 className="section-title">{t('common.status.error')}</h1>
            <p className="section-subtitle mx-auto">{error.message}</p>
            <button type="button" className="btn-primary mt-6" onClick={reset}>
              {t('common.actions.retry')}
            </button>
          </div>
        )}
      >
        <ScheduleTimeline />
      </ErrorBoundary>
    </div>
  );
}
