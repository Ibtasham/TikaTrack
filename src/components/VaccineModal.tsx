import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  Heart,
  Snowflake,
  Syringe,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails';
import { type Vaccine, vaccineColors } from '../data/vaccines';
import { useBodyScrollLock, useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';

interface VaccineModalProps {
  vaccine: Vaccine;
  onClose: () => void;
}

export function VaccineModal({ vaccine, onClose }: VaccineModalProps) {
  const { language, t } = useI18n();
  const isBangla = language === 'bn';
  const colorConfig = vaccineColors[vaccine.color] || vaccineColors.emerald;
  const clinical = getVaccineClinicalProfile(vaccine);

  // Without a trap, Tab walks out of the modal into the page behind it, and
  // without Escape the only way out is a mouse click on the close button.
  const dialogRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vaccine-modal-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--tt-border)] bg-[var(--tt-card)] shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clinical Header */}
        <div className="relative overflow-hidden rounded-t-2xl border-b border-[var(--tt-border)] bg-[var(--tt-subtle)]/55">
          <div className={`h-1.5 w-full ${colorConfig.bg}`} aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.a11y.dialogClose')}
            className="absolute top-4 right-4 rounded-lg border border-[var(--tt-border)] bg-[var(--tt-card)] p-2 text-[var(--tt-ink-muted)] transition-colors hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-start gap-4 p-6 pr-14">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--tt-border)] bg-[var(--tt-card)] text-2xl sm:h-14 sm:w-14 sm:text-3xl"
              aria-hidden="true"
            >
              {vaccine.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">
                {t(`vaccines.category.${vaccine.category}`)}
              </p>
              <h2
                id="vaccine-modal-title"
                className={`mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {vaccine.name[language]}
              </h2>
              <p className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.fullName[language]}
              </p>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-neutral-500 tabular-nums dark:text-neutral-400">
                <span>{t('vaccines.doses', vaccine.doses)}</span>
                <span aria-hidden="true">·</span>
                <span>{vaccine.introduced}</span>
                {vaccine.efficacy && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {vaccine.efficacy}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* Core Disease & Schedule + Pharmacology Hairline Grid */}
          <dl className="grid gap-px overflow-hidden rounded-xl border border-[var(--tt-border)] bg-[var(--tt-border)] sm:grid-cols-2">
            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <Heart className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                {t('vaccines.detail.disease')}
              </dt>
              <dd className={`mt-1.5 text-sm font-medium text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.disease[language]}
              </dd>
            </div>

            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <Calendar className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
                {t('vaccines.detail.schedule')}
              </dt>
              <dd className={`mt-1.5 text-sm font-medium text-[var(--tt-ink)] tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.schedule[language]}
              </dd>
            </div>

            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <FlaskConical className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
                {t('vaccines.detail.platform')}
              </dt>
              <dd className={`mt-1.5 text-sm text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}>
                {clinical.platform[language]}
              </dd>
            </div>

            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <Syringe className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
                {t('vaccines.detail.route')}
              </dt>
              <dd className={`mt-1.5 text-sm text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}>
                {clinical.route[language]} · <span className="font-mono text-xs tabular-nums">{clinical.doseVolume[language]}</span>
              </dd>
            </div>

            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <Snowflake className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                {t('vaccines.detail.coldChain')}
              </dt>
              <dd className={`mt-1.5 text-sm text-[var(--tt-ink)] tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                {clinical.coldChain[language]}
              </dd>
            </div>

            <div className="bg-[var(--tt-card)] p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--tt-ink-muted)] uppercase">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
                {t('vaccines.efficacy')}
              </dt>
              <dd className={`mt-1.5 text-sm text-[var(--tt-ink)] tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                <span className="font-mono font-semibold text-[var(--tt-accent)]">{vaccine.efficacy}</span> — {clinical.immunityProfile[language]}
              </dd>
            </div>
          </dl>

          {/* Description & Dosing Catch-Up */}
          <div className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div>
              <h3 className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                {t('vaccines.detail.description')}
              </h3>
              <p className={`mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.description[language]}
              </p>
            </div>

            <div>
              <h3 className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                {t('vaccines.detail.dosingProtocol')}
              </h3>
              <p className={`mt-1 text-sm leading-relaxed text-neutral-700 tabular-nums dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                {clinical.dosingProtocol[language]}
              </p>
            </div>

            <div>
              <h3 className={`flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t('vaccines.detail.specialPopulations')}
              </h3>
              <p className={`mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                {clinical.specialPopulations[language]}
              </p>
            </div>
          </div>

          {/* Safety, Contraindications & Aftercare */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <h3 className={`text-sm font-bold text-amber-950 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}>
                {t('vaccines.detail.commonEffects')}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-100/90 ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.commonEffects[language]}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900 dark:bg-red-950/30">
              <h3 className={`flex items-center gap-1.5 text-sm font-bold text-red-950 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}>
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {t('vaccines.detail.contraindications')}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed text-red-900 dark:text-red-100/90 ${isBangla ? 'font-bangla' : ''}`}>
                {vaccine.contraindications[language]}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
            <h3 className={`flex items-center gap-1.5 text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
              <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t('vaccines.detail.aftercare')}
            </h3>
            <p className={`mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
              {clinical.aftercare[language]}
            </p>
          </div>

          {/* Actions & Source */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <a
              href={vaccine.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex items-center gap-1.5 text-xs"
            >
              {vaccine.source}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/vaccines/${vaccine.id}`}
                onClick={onClose}
                className="btn-primary btn-sm whitespace-nowrap shrink-0"
              >
                {t('vaccines.detail.openFullProfile')}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost btn-sm whitespace-nowrap shrink-0"
              >
                {t('common.actions.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
