"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { useI18n } from "@/components/i18n-provider";

const THEME_CHANGE_EVENT = "x-farm-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const { t } = useI18n();
  const label = t(next === "dark" ? "Switch to dark background" : "Switch to light background");

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice still applies until the page reloads.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={label} title={label}><Icon name={theme === "dark" ? "sun" : "moon"} size={17} /></button>;
}
