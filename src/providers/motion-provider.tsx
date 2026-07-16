"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MotionPreference = "system" | "full" | "reduce" | "off";
export type EffectiveMotion = "full" | "reduced" | "off";
export type MotionCapability = "static" | "basic" | "full";

const STORAGE_KEY = "portfolio:motion-preference";

export function resolveMotionMode(input: {
  os_reduced: boolean;
  user_preference: MotionPreference;
  site_default: Exclude<MotionPreference, "system">;
}): EffectiveMotion {
  if (input.os_reduced) return "reduced";

  const preference =
    input.user_preference === "system"
      ? input.site_default
      : input.user_preference;

  if (preference === "off") return "off";
  if (preference === "reduce") return "reduced";
  return "full";
}

type MotionContextValue = {
  preference: MotionPreference;
  setPreference: (preference: MotionPreference) => void;
  effectiveMotion: EffectiveMotion;
  reducedMotion: boolean;
  canAnimate: boolean;
  capability: MotionCapability;
  documentVisible: boolean;
  hydrated: boolean;
};

const MotionContext = createContext<MotionContextValue | null>(null);

type MotionProviderProps = {
  children: ReactNode;
  siteDefault?: Exclude<MotionPreference, "system">;
};

function readStoredPreference(): MotionPreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (
      value === "system" ||
      value === "full" ||
      value === "reduce" ||
      value === "off"
    ) {
      return value;
    }
  } catch {
    // Storage may be disabled. The system preference remains the safe fallback.
  }
  return "system";
}

function detectCapability(): MotionCapability {
  if (typeof window === "undefined") return "static";
  if (!window.requestAnimationFrame || !window.IntersectionObserver) {
    return "static";
  }

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "full"
    : "basic";
}

export default function MotionProvider({
  children,
  siteDefault = "full",
}: MotionProviderProps) {
  const [hydrated, setHydrated] = useState(false);
  const [preference, setPreferenceState] = useState<MotionPreference>("system");
  const [osReduced, setOsReduced] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [capability, setCapability] = useState<MotionCapability>("static");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncMotionPreference = () => setOsReduced(query.matches);
    const syncVisibility = () =>
      setDocumentVisible(document.visibilityState === "visible");

    setPreferenceState(readStoredPreference());
    syncMotionPreference();
    syncVisibility();
    setCapability(detectCapability());
    setHydrated(true);

    query.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      query.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const effectiveMotion = hydrated
    ? resolveMotionMode({
        os_reduced: osReduced,
        user_preference: preference,
        site_default: siteDefault,
      })
    : "reduced";

  const setPreference = useCallback((next: MotionPreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The in-memory choice still applies for this visit.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = effectiveMotion;
    root.dataset.motionCapability = capability;
    root.dataset.documentVisible = String(documentVisible);
  }, [capability, documentVisible, effectiveMotion]);

  const value = useMemo<MotionContextValue>(
    () => ({
      preference,
      setPreference,
      effectiveMotion,
      reducedMotion: effectiveMotion !== "full",
      canAnimate:
        hydrated &&
        documentVisible &&
        effectiveMotion === "full" &&
        capability !== "static",
      capability,
      documentVisible,
      hydrated,
    }),
    [
      capability,
      documentVisible,
      effectiveMotion,
      hydrated,
      preference,
      setPreference,
    ]
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) throw new Error("useMotion must be used within MotionProvider");
  return context;
}

export function useReducedMotion() {
  return useMotion().reducedMotion;
}
