"use client";

import type { TSettingState } from "@/types/state.type";
import { useSyncExternalStore } from "react";

/**
 * The three visitor settings (theme, direction, language): a tiny external store persisted to
 * localStorage under the key `setting`, read by the inline script in the root layout before first paint.
 *
 * It replaces a Redux Toolkit store that held only these three fields and cost about 14 KB gzip on every
 * route (ADR 0009 initial-JS budget). The server snapshot is always the default state, so hydration
 * never mismatches; the client then moves to the saved state.
 */
const STORAGE_KEY = "setting";

const DEFAULTS: TSettingState = {
  theme: "system",
  direction: "ltr",
  language: "en",
};

const isAdminPath = (): boolean => {
  const path = window.location.pathname;
  return path === "/admin" || path.startsWith("/admin/");
};

/** First visit: dark on the public site (plan D-02), system in the admin. A saved choice always wins. */
const readInitial = (): TSettingState => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULTS, ...(JSON.parse(saved) as TSettingState) };
  } catch (error) {
    console.error("Error parsing setting from localStorage", error);
  }
  return isAdminPath() ? DEFAULTS : { ...DEFAULTS, theme: "dark" };
};

let current: TSettingState | undefined;
const listeners = new Set<() => void>();

export const getSetting = (): TSettingState => (current ??= readInitial());

const publish = (next: TSettingState, persist = true) => {
  current = next;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage can be blocked; the in-memory value still applies for this visit */
    }
  }
  listeners.forEach((listener) => listener());
};

const onStorage = (event: StorageEvent) => {
  if (event.key !== STORAGE_KEY) return;
  current = undefined;
  publish(readInitial(), false);
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

/** Subscribe to one slice of the settings. The selector must return a primitive or a stable reference. */
export function useSetting<T>(selector: (setting: TSettingState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSetting()),
    () => selector(DEFAULTS)
  );
}

export const setSetting = (next: TSettingState) => publish({ ...next });
export const clearSetting = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  publish(readInitial(), false);
};

export const setTheme = (theme: TSettingState["theme"]) =>
  publish({ ...getSetting(), theme });

const THEME_ORDER = ["light", "dark", "system"] as const;
export const toggleTheme = () => {
  const state = getSetting();
  const index = THEME_ORDER.indexOf(
    state.theme as (typeof THEME_ORDER)[number]
  );
  publish({ ...state, theme: THEME_ORDER[(index + 1) % THEME_ORDER.length] });
};

export const setLanguage = (language: TSettingState["language"]) =>
  publish({ ...getSetting(), language });
export const toggleLanguage = () => {
  const state = getSetting();
  publish({ ...state, language: state.language === "en" ? "bn" : "en" });
};

export const setDirection = (direction: TSettingState["direction"]) =>
  publish({ ...getSetting(), direction });
export const toggleDirection = () => {
  const state = getSetting();
  publish({ ...state, direction: state.direction === "ltr" ? "rtl" : "ltr" });
};

/** Test seam: forget the cached state so the next read starts from storage again. */
export const resetSettingStoreForTests = () => {
  current = undefined;
  listeners.clear();
};
