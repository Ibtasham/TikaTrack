/**
 * The two languages TikaTrack ships in.
 *
 * `en` — English
 * `bn` — Bangla (বাংলা)
 */
export type Language = 'en' | 'bn';

export const LANGUAGES = ['en', 'bn'] as const satisfies readonly Language[];

/** A localised string, e.g. `{ en: 'Home', bn: 'হোম' }`. */
export type LocalisedText = Record<Language, string>;

/** Flat map of dotted translation key -> string for one language. */
export type TranslationDictionary = Record<string, string>;

/** Every dictionary, keyed by language. */
export type TranslationTables = Record<Language, TranslationDictionary>;

/** Extra values substituted into `{0}`, `{1}`, … placeholders. */
export type TranslationArgs = ReadonlyArray<string | number>;

export interface I18n {
  /** Currently active language. */
  language: Language;
  /** The language the user has *not* selected — handy for toggle buttons. */
  otherLanguage: Language;
  /** Switch the active language (persisted). */
  setLanguage: (language: Language) => void;
  /** Flip between English and Bangla. */
  toggleLanguage: () => void;
  /** Translate `key`, optionally substituting positional `{0}`/`{1}` args. */
  t: (key: string, ...args: TranslationArgs) => string;
  /** `true` when a translation exists for `key` in the active language. */
  has: (key: string) => boolean;
}
