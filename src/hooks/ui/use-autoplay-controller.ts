"use client";

import {
  getWrappedIndex,
  shouldAutoplay,
  updatePauseReasons,
  type AutoplayPauseReason,
} from "@/lib/motion/autoplay";
import { useMotion } from "@/providers/motion-provider";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

const SESSION_PAUSE_KEY = "portfolio:autoplay-paused";

type UseAutoplayControllerInput = {
  itemCount: number;
  activeIndex: number;
  onChange: (index: number, source: "automatic" | "manual") => void;
  intervalMs?: number;
  label?: (index: number) => string;
};

export function useAutoplayController({
  itemCount,
  activeIndex,
  onChange,
  intervalMs = 7_000,
  label = (index) => `Item ${index + 1} of ${itemCount}`,
}: UseAutoplayControllerInput) {
  const { effectiveMotion, documentVisible } = useMotion();
  const rootRef = useRef<HTMLElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [pauseReasons, setPauseReasons] = useState<
    ReadonlySet<AutoplayPauseReason>
  >(new Set(["offscreen"]));
  const [timerGeneration, setTimerGeneration] = useState(0);
  const [manualAnnouncement, setManualAnnouncement] = useState("");

  const setPauseReason = useCallback(
    (reason: AutoplayPauseReason, paused: boolean) => {
      setPauseReasons((current) => updatePauseReasons(current, reason, paused));
    },
    []
  );

  useEffect(() => {
    try {
      setPauseReason(
        "user",
        window.sessionStorage.getItem(SESSION_PAUSE_KEY) === "true"
      );
    } catch {
      // Session storage is an enhancement; controls remain available.
    }
  }, [setPauseReason]);

  useEffect(() => {
    setPauseReason("hidden", !documentVisible);
    setPauseReason("reduced-motion", effectiveMotion !== "full");
  }, [documentVisible, effectiveMotion, setPauseReason]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !window.IntersectionObserver) {
      setPauseReason("offscreen", false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPauseReason("offscreen", !entry?.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [setPauseReason]);

  useEffect(() => {
    if (
      !shouldAutoplay({ item_count: itemCount, pause_reasons: pauseReasons })
    ) {
      return;
    }

    const delay = Math.max(6_000, intervalMs);
    const timer = window.setTimeout(() => {
      onChange(getWrappedIndex(activeIndex, itemCount, 1), "automatic");
      setTimerGeneration((value) => value + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    intervalMs,
    itemCount,
    onChange,
    pauseReasons,
    timerGeneration,
  ]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(0, index), Math.max(0, itemCount - 1));
      onChange(next, "manual");
      setManualAnnouncement(label(next));
      setTimerGeneration((value) => value + 1);
    },
    [itemCount, label, onChange]
  );

  const next = useCallback(
    () => goTo(getWrappedIndex(activeIndex, itemCount, 1)),
    [activeIndex, goTo, itemCount]
  );
  const previous = useCallback(
    () => goTo(getWrappedIndex(activeIndex, itemCount, -1)),
    [activeIndex, goTo, itemCount]
  );

  const userPaused = pauseReasons.has("user");
  const toggleUserPause = useCallback(() => {
    const nextPaused = !userPaused;
    setPauseReason("user", nextPaused);
    try {
      window.sessionStorage.setItem(SESSION_PAUSE_KEY, String(nextPaused));
    } catch {
      // The state still applies until navigation/unmount.
    }
  }, [setPauseReason, userPaused]);

  const rootProps = {
    ref: (node: HTMLElement | null) => {
      rootRef.current = node;
    },
    onMouseEnter: (_event: MouseEvent<HTMLElement>) =>
      setPauseReason("hover", true),
    onMouseLeave: (_event: MouseEvent<HTMLElement>) =>
      setPauseReason("hover", false),
    onFocusCapture: (_event: FocusEvent<HTMLElement>) =>
      setPauseReason("focus", true),
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setPauseReason("focus", false);
      }
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      pointerStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
        return;
      }
      if (deltaX < 0) next();
      else previous();
    },
  };

  return {
    rootProps,
    pauseReasons,
    isPaused: pauseReasons.size > 0,
    userPaused,
    toggleUserPause,
    goTo,
    next,
    previous,
    manualAnnouncement,
  };
}
