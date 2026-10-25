import { applyThemeMode, type ThemeSetting } from "@/lib/theme";
import { getSetting, setTheme } from "@/state/setting-store";

const ORDER: readonly ThemeSetting[] = ["light", "dark", "system"];

export const nextTheme = (current: ThemeSetting): ThemeSetting =>
  ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;

/**
 * The theme toggle with a circular reveal (M21): the new theme grows out of the button over 480 ms
 * as a View Transition, where the browser has them and motion is full. The class changes inside the
 * transition callback so the browser captures both states; everywhere else the theme just changes.
 * The setting store is updated either way, so the choice persists.
 */
export function flipTheme(origin: { x: number; y: number }): void {
  const next = nextTheme(getSetting().theme);
  const root = document.documentElement;
  const apply = () => {
    applyThemeMode(next);
    setTheme(next);
  };

  if (
    typeof document.startViewTransition !== "function" ||
    root.dataset.motion !== "full"
  ) {
    apply();
    return;
  }

  root.style.setProperty("--flip-x", `${Math.round(origin.x)}px`);
  root.style.setProperty("--flip-y", `${Math.round(origin.y)}px`);
  root.dataset.vt = "theme";
  const transition = document.startViewTransition(apply);
  void transition.finished
    .catch(() => undefined)
    .finally(() => {
      delete root.dataset.vt;
    });
}
