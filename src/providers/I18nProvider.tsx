import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  i18n,
  toLocale,
  deviceLanguage,
  isLanguageCode,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
} from '@/i18n';

type TranslateOptions = Record<string, unknown>;

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  /** `t('login.signIn')`, or `t('login.resetSent', { email })` to interpolate. */
  t: (key: string, options?: TranslateOptions) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: deviceLanguage(),
  setLanguage: () => {},
  t: (key) => key,
});

/**
 * Makes the app's language switchable at runtime.
 *
 * i18n-js is a plain object with a mutable `locale`, so changing it does not on
 * its own tell React anything. Holding the language in state and rebuilding `t`
 * when it changes is what re-renders every consumer — a stable `t` would leave
 * memoised subtrees showing the previous language.
 *
 * Startup order: the remembered choice, else the device's language when the app
 * offers it, else English.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const initial = deviceLanguage();
    i18n.locale = toLocale(initial);
    return initial;
  });

  // Restore the saved choice. Reading storage is async, so the first frame uses
  // the device language and this corrects it if the user picked something else.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (cancelled || !isLanguageCode(saved) || saved === language) return;
        i18n.locale = toLocale(saved);
        setLanguageState(saved);
      })
      .catch(() => {
        // A failed read just means we keep the device language.
      });
    return () => {
      cancelled = true;
    };
    // Runs once: later changes go through setLanguage, which writes storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    i18n.locale = toLocale(code);
    setLanguageState(code);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code).catch(() => {
      // Not fatal — the language still changes for this session.
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      // Depends on `language` so its identity changes with the locale.
      t: (key: string, options?: TranslateOptions) => i18n.t(key, options),
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `const { t, language, setLanguage } = useTranslation();` */
export function useTranslation() {
  return useContext(I18nContext);
}
