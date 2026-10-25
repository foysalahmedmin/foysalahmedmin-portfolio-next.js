"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's choice for the 3D hero scene: `auto` follows the capability tier, `still` always shows
 * the poster image (docs plan 6.4, "3D has an explicit still-image control"). Persisted to
 * localStorage and mirrored as `data-scene` on <html> so CSS can react. The scene itself arrives in
 * Phase 3; the control and the stored choice are ready now.
 */
export type ScenePreference = "auto" | "still";

const STORAGE_KEY = "portfolio:scene-preference";

const isPreference = (value: unknown): value is ScenePreference =>
  value === "auto" || value === "still";

let current: ScenePreference | undefined;
const listeners = new Set<() => void>();

const readStored = (): ScenePreference => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(value)) return value;
  } catch {
    /* storage can be blocked; auto is the safe default */
  }
  return "auto";
};

export const getScenePreference = (): ScenePreference => {
  current ??= readStored();
  return current;
};

export const setScenePreference = (next: ScenePreference): void => {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* the in-memory choice still applies for this visit */
  }
  document.documentElement.dataset.scene = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useScenePreference(): ScenePreference {
  return useSyncExternalStore(subscribe, getScenePreference, () => "auto");
}

/** Test seam: forget the cached choice so the next read starts from storage again. */
export const resetScenePreferenceForTests = () => {
  current = undefined;
  listeners.clear();
};
