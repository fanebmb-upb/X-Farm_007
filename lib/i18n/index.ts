import { ro } from "./ro.ts";
import { translateDynamicRo } from "./dynamic.ts";

export type Locale = "ro" | "en";
export type TranslationParams = Record<string, string | number>;

export const LOCALES: Locale[] = ["ro", "en"];
export const DEFAULT_LOCALE: Locale = "ro";
export const LOCALE_COOKIE = "x-farm-lang";

export function parseLocale(value: unknown): Locale {
  return value === "en" || value === "ro" ? value : DEFAULT_LOCALE;
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * Interface text is written in English in the components and looked up here;
 * English is the key, so a missing Romanian entry falls back to English
 * (tests/i18n.test.ts checks that none are missing).
 */
export function translate(locale: Locale, text: string, params?: TranslationParams) {
  return interpolate(locale === "ro" ? ro[text] ?? text : text, params);
}

/** Text generated at runtime with numbers in it, such as event details and sensor names. */
export function translateDynamic(locale: Locale, text: string) {
  return locale === "ro" ? translateDynamicRo(text) : text;
}

export function intlLocale(locale: Locale) {
  return locale === "ro" ? "ro-RO" : "en-GB";
}
