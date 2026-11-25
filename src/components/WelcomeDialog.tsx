import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarPlus, ShieldCheck, Users } from 'lucide-react';

import { useProfiles } from '../contexts/ProfilesContext';
import { useBodyScrollLock, useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';
import { localiseNumber } from '../lib/format';
import {
  dismissOnboarding,
  isOnboardingDismissed,
  moveStep,
  ONBOARDING_STEPS,
  shouldShowOnboarding,
} from '../lib/onboarding';

interface Step {
  icon: typeof ShieldCheck;
  titleKey: string;
  bodyKey: string;
  /** Present on the one step where leaving the tour is the right next action. */
  ctaKey?: string;
  to?: string;
}

/**
 * Mirrors `ONBOARDING_STEPS` in `lib/onboarding` — the order is asserted in the
 * tests, so the two cannot drift apart silently.
 */
const STEPS: Step[] = [
  {
    icon: ShieldCheck,
    titleKey: 'onboarding.privacy.title',
    bodyKey: 'onboarding.privacy.body',
  },
  {
    icon: Users,
    titleKey: 'onboarding.start.title',
    bodyKey: 'onboarding.start.body',
    ctaKey: 'onboarding.start.cta',
    to: '/tracker',
  },
  {
    icon: CalendarPlus,
    titleKey: 'onboarding.everywhere.title',
    bodyKey: 'onboarding.everywhere.body',
  },
];

/**
 * The first-run tour.
 *
 * Mounted once from `Layout`, so it also reaches a visitor who arrives on a deep
 * link. It is a dialog rather than a page because the alternative — an interstitial
 * route — is a place people get stuck when it fails to redirect.
 *
 * Deliberately *not* shown on a device that already holds records (`lib/
 * onboarding.shouldShowOnboarding`): someone who restored a backup does not need
 * to be told to add their first family member.
 */
export function WelcomeDialog() {
  const { t, language } = useI18n();
  const { profiles } = useProfiles();
  const isBangla = language === 'bn';

  const [dismissed, setDismissed] = useState(() => isOnboardingDismissed());
  const [index, setIndex] = useState(0);

  const show = shouldShowOnboarding(profiles.length, dismissed);
  const last = index >= ONBOARDING_STEPS.length - 1;
  const step = STEPS[Math.min(index, STEPS.length - 1)];
  const Icon = step.icon;

  const dialogRef = useFocusTrap<HTMLDivElement>(show, { onEscape: () => finish() });
  useBodyScrollLock(show);

  /**
   * Closing always records that the tour was seen, even when the write fails
   * (private browsing): reappearing on every navigation is worse than
   * reappearing on the next visit.
   */
  function finish() {
    dismissOnboarding();
    setDismissed(true);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-body"
        className="animate-scale-in relative w-full max-w-lg rounded-t-3xl border border-[var(--tt-border)] bg-[var(--tt-card)] p-6 shadow-2xl sm:rounded-3xl"
      >
        <p
          className={`text-xs font-semibold tracking-wide text-[var(--tt-accent)] uppercase ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('onboarding.eyebrow')}
        </p>

        <div className="mt-4 flex items-start gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]"
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </span>

          <div className="min-w-0">
            <h2
              id="welcome-title"
              className={`text-lg font-bold text-[var(--tt-ink)] ${isBangla ? 'font-bangla' : ''}`}
            >
              {t(step.titleKey)}
            </h2>
            <p
              id="welcome-body"
              className={`mt-2 text-sm leading-relaxed text-[var(--tt-ink-muted)] ${isBangla ? 'font-bangla' : ''}`}
            >
              {t(step.bodyKey)}
            </p>

            {step.ctaKey && step.to ? (
              <Link to={step.to} onClick={finish} className="btn-primary btn-sm mt-4 inline-flex">
                {t(step.ctaKey)}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label={t('onboarding.progress')}
          >
            {STEPS.map((entry, position) => (
              <span
                key={entry.titleKey}
                className={`h-2 rounded-full transition-all ${
                  position === index
                    ? 'w-6 bg-emerald-600 dark:bg-emerald-500'
                    : 'w-2 bg-neutral-300 dark:bg-neutral-700'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Announced on every step change; the visible dots are decorative. */}
          <p role="status" className="sr-only">
            {t(
              'onboarding.step',
              localiseNumber(index + 1, language),
              localiseNumber(STEPS.length, language),
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={finish}>
              <span className={isBangla ? 'font-bangla' : undefined}>{t('onboarding.skip')}</span>
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setIndex(moveStep(index, -1))}
              disabled={index === 0}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('common.actions.back')}
              </span>
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => (last ? finish() : setIndex(moveStep(index, 1)))}
            >
              <span className={isBangla ? 'font-bangla' : undefined}>
                {last ? t('onboarding.finish') : t('common.actions.next')}
              </span>
              {last ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
