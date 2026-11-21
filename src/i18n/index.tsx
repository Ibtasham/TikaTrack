import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  I18n,
  Language,
  TranslationArgs,
  TranslationDictionary,
  TranslationTables,
} from './types';
import { isLanguage, LANGUAGE_STORAGE_KEY, readStoredLanguage } from './storage';

import * as about from './dictionaries/about.en';
import * as aboutBn from './dictionaries/about.bn';
import * as analytics from './dictionaries/analytics.en';
import * as analyticsBn from './dictionaries/analytics.bn';
import * as app from './dictionaries/app.en';
import * as appBn from './dictionaries/app.bn';
import * as auth from './dictionaries/auth.en';
import * as authBn from './dictionaries/auth.bn';
import * as centres from './dictionaries/centres.en';
import * as centresBn from './dictionaries/centres.bn';
import * as coldchain from './dictionaries/coldchain.en';
import * as coldchainBn from './dictionaries/coldchain.bn';
import * as common from './dictionaries/common.en';
import * as commonBn from './dictionaries/common.bn';
import * as compare from './dictionaries/compare.en';
import * as compareBn from './dictionaries/compare.bn';
import * as dashboard from './dictionaries/dashboard.en';
import * as dashboardBn from './dictionaries/dashboard.bn';
import * as footer from './dictionaries/footer.en';
import * as footerBn from './dictionaries/footer.bn';
import * as growth from './dictionaries/growth.en';
import * as growthBn from './dictionaries/growth.bn';
import * as home from './dictionaries/home.en';
import * as homeBn from './dictionaries/home.bn';
import * as nav from './dictionaries/nav.en';
import * as navBn from './dictionaries/nav.bn';
import * as passport from './dictionaries/passport.en';
import * as passportBn from './dictionaries/passport.bn';
import * as privacy from './dictionaries/privacy.en';
import * as privacyBn from './dictionaries/privacy.bn';
import * as readiness from './dictionaries/readiness.en';
import * as readinessBn from './dictionaries/readiness.bn';
import * as reminders from './dictionaries/reminders.en';
import * as remindersBn from './dictionaries/reminders.bn';
import * as schedule from './dictionaries/schedule.en';
import * as scheduleBn from './dictionaries/schedule.bn';
import * as scheduler from './dictionaries/scheduler.en';
import * as schedulerBn from './dictionaries/scheduler.bn';
import * as tikabot from './dictionaries/tikabot.en';
import * as tikabotBn from './dictionaries/tikabot.bn';
import * as tracker from './dictionaries/tracker.en';
import * as trackerBn from './dictionaries/tracker.bn';
import * as vaccines from './dictionaries/vaccines.en';
import * as vaccinesBn from './dictionaries/vaccines.bn';
import * as confirm from './dictionaries/confirm.en';
import * as confirmBn from './dictionaries/confirm.bn';
import * as error from './dictionaries/error.en';
import * as errorBn from './dictionaries/error.bn';
import * as notFound from './dictionaries/notFound.en';
import * as notFoundBn from './dictionaries/notFound.bn';
import * as onboarding from './dictionaries/onboarding.en';
import * as onboardingBn from './dictionaries/onboarding.bn';

/**
 * Merge dictionaries in order; later entries win on key collisions.
 * Every English module exports `en`, every Bangla module exports `bn`.
 */
function mergeAll<K extends string>(...tables: Record<K, string>[]): Record<K, string> {
  return Object.assign({}, ...tables) as Record<K, string>;
}

const english: TranslationDictionary = mergeAll(
  app.en,
  common.en,
  nav.en,
  home.en,
  vaccines.en,
  schedule.en,
  scheduler.en,
  tracker.en,
  centres.en,
  coldchain.en,
  tikabot.en,
  analytics.en,
  reminders.en,
  readiness.en,
  compare.en,
  passport.en,
  dashboard.en,
  privacy.en,
  auth.en,
  about.en,
  footer.en,
  growth.en,
  confirm.en,
  error.en,
  notFound.en,
  onboarding.en,
);

const bangla: TranslationDictionary = mergeAll(
  appBn.bn,
  commonBn.bn,
  navBn.bn,
  homeBn.bn,
  vaccinesBn.bn,
  scheduleBn.bn,
  schedulerBn.bn,
  trackerBn.bn,
  centresBn.bn,
  coldchainBn.bn,
  tikabotBn.bn,
  analyticsBn.bn,
  remindersBn.bn,
  readinessBn.bn,
  compareBn.bn,
  passportBn.bn,
  dashboardBn.bn,
  privacyBn.bn,
  authBn.bn,
  aboutBn.bn,
  footerBn.bn,
  growthBn.bn,
  confirmBn.bn,
  errorBn.bn,
  notFoundBn.bn,
  onboardingBn.bn,
);

export const translations: TranslationTables = { en: english, bn: bangla };

/** Keys translated in English — used by the parity test. */
export const translationKeys = {
  en: Object.keys(english),
  bn: Object.keys(bangla),
} satisfies Record<Language, string[]>;

const I18nContext = createContext<I18n | null>(null);

function applyArgs(value: string, args: TranslationArgs): string {
  if (args.length === 0) return value;
  return value.replace(/\{(\d+)\}/g, (match, index: string) => {
    const replacement = args[Number(index)];
    return replacement === undefined ? match : String(replacement);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.setAttribute('lang', language);
    } catch {
      /* storage unavailable (private browsing) — the in-memory value still works */
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    if (isLanguage(next)) setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'en' ? 'bn' : 'en'));
  }, []);

  const value = useMemo<I18n>(() => {
    const table = translations[language];
    const fallback = translations.en;

    const t = (key: string, ...args: TranslationArgs): string => {
      const raw = table[key] ?? fallback[key];
      if (raw === undefined) {
        if (import.meta.env.DEV) {
          // Surfacing missing keys loudly during development beats shipping
          // raw keys to users by accident.
          console.warn(`[i18n] missing translation key: ${key}`);
        }
        return key;
      }
      return applyArgs(raw, args);
    };

    return {
      language,
      otherLanguage: language === 'en' ? 'bn' : 'en',
      setLanguage,
      toggleLanguage,
      t,
      has: (key: string) => key in table,
    };
  }, [language, setLanguage, toggleLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the active language plus the `t()` translator. */
export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return context;
}

/** Shorthand for components that only need `t` and the active language. */
export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}
