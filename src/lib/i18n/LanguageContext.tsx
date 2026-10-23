/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight locale context: persisted selection, <html lang> syncing,
 * and a `t()` lookup with `{var}` interpolation and English fallback.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DATE_LOCALE, DictKey, HTML_LANG, Locale, dictionaries, en } from './dictionaries';

const STORAGE_KEY = 'prb.locale';

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-Hant' || saved === 'zh-Hans') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

interface LanguageValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  /** Tag for locale-aware date formatting. */
  dateLocale: string | undefined;
}

const LanguageContext = createContext<LanguageValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => en[key] ?? key,
  dateLocale: undefined,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLocale?: Locale }> = ({ children, initialLocale }) => {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      let text: string = dictionaries[locale][key] ?? en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [locale]
  );

  const value = useMemo<LanguageValue>(
    () => ({ locale, setLocale, t, dateLocale: DATE_LOCALE[locale] }),
    [locale, setLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}
