import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';

/**
 * The languages the app offers, in the order the picker shows them.
 *
 * Codes are uppercase because that is how the design labels them ("Language EN")
 * and how the picker reads. The locale passed to i18n-js is the lowercase form.
 */
export const LANGUAGES = ['EN', 'FR', 'DE', 'IT'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'EN';

/** Where the chosen language is remembered between launches. */
export const LANGUAGE_STORAGE_KEY = 'hestia.language';

export const i18n = new I18n({
  en,
  fr,
  de,
  it,
});

// A key missing from a translation falls back to English rather than rendering
// the key itself. Locales are kept at parity by scripts/checkLocales.js, but a
// visible English word beats "login.signIn" if one ever slips through.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

/** `EN` -> `en`, for i18n-js. */
export const toLocale = (code: LanguageCode): string => code.toLowerCase();

/**
 * The device's language, when the app offers it.
 *
 * `getLocales()` returns the user's preferred languages in order, so the first
 * supported one wins rather than only checking the top entry — someone whose
 * phone is set to Romansh with German second gets German, not English.
 */
export function deviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    const code = locale.languageCode?.toUpperCase();
    if (code && (LANGUAGES as readonly string[]).includes(code)) {
      return code as LanguageCode;
    }
  }
  return DEFAULT_LANGUAGE;
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
