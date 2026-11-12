"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { intlLocale, LOCALE_COOKIE, translate, translateDynamic, type Locale, type TranslationParams } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string, params?: TranslationParams) => string;
  td: (text: string) => string;
  formatDate: (timestamp: string, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (text, params) => translate(locale, text, params),
    td: (text) => translateDynamic(locale, text),
    formatDate: (timestamp, options = { hour: "2-digit", minute: "2-digit", hour12: false }) => new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Europe/Bucharest", ...options }).format(new Date(timestamp)),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const next: Locale = locale === "ro" ? "en" : "ro";
  const label = t("Switch language to {language}", { language: next === "ro" ? "română" : "English" });
  return <button className="theme-toggle language-toggle" type="button" onClick={() => setLocale(next)} aria-label={label} title={label}>{next.toUpperCase()}</button>;
}
