"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeToDesktopQuery(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getServerDesktopSnapshot() {
  return false;
}

export function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktopQuery,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );
}
