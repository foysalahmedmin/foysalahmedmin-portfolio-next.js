import type { TSettingState } from "@/types/state.type";

export type ThemeSetting = TSettingState["theme"];

/** The class the document carries for a theme setting: "system" resolves through the OS preference. */
export const resolveThemeMode = (theme: ThemeSetting): "dark" | "light" => {
  if (theme === "dark" || theme === "light") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/** Put the theme on the document element. Shared by the theme applier and the theme flip. */
export const applyThemeMode = (theme: ThemeSetting): void => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveThemeMode(theme));
};
