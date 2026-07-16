"use client";

import { normalizePointer } from "@/lib/motion/parallax";
import { useMotion } from "@/providers/motion-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type ParallaxFrame = Readonly<{
  viewport_width: number;
  viewport_height: number;
  scroll_y: number;
  pointer_x: number;
  pointer_y: number;
}>;

type ParallaxSubscriber = (frame: ParallaxFrame) => void;

type ParallaxContextValue = {
  subscribe: (subscriber: ParallaxSubscriber) => () => void;
  requestFrame: () => void;
};

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

export default function ParallaxProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { canAnimate, capability, documentVisible } = useMotion();
  const subscribers = useRef(new Set<ParallaxSubscriber>());
  const rafId = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const runFrame = useCallback(() => {
    rafId.current = null;
    if (!canAnimate || !documentVisible || !subscribers.current.size) return;

    const startedAt = performance.now();
    const frame: ParallaxFrame = {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      scroll_y: window.scrollY,
      pointer_x: pointer.current.x,
      pointer_y: pointer.current.y,
    };

    subscribers.current.forEach((subscriber) => subscriber(frame));

    if (process.env.NODE_ENV === "development") {
      window.dispatchEvent(
        new CustomEvent("portfolio:motion-frame", {
          detail: { duration_ms: performance.now() - startedAt },
        })
      );
    }
  }, [canAnimate, documentVisible]);

  const requestFrame = useCallback(() => {
    if (rafId.current !== null || !canAnimate || !documentVisible) return;
    rafId.current = window.requestAnimationFrame(runFrame);
  }, [canAnimate, documentVisible, runFrame]);

  const subscribe = useCallback(
    (subscriber: ParallaxSubscriber) => {
      subscribers.current.add(subscriber);
      requestFrame();
      return () => subscribers.current.delete(subscriber);
    },
    [requestFrame]
  );

  useEffect(() => {
    if (!canAnimate || !documentVisible) return;

    const onViewportChange = () => requestFrame();
    const onPointerMove = (event: PointerEvent) => {
      pointer.current = {
        x: normalizePointer(event.clientX, window.innerWidth),
        y: normalizePointer(event.clientY, window.innerHeight),
      };
      requestFrame();
    };

    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    if (capability === "full") {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
    requestFrame();

    return () => {
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("pointermove", onPointerMove);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [canAnimate, capability, documentVisible, requestFrame]);

  const value = useMemo(
    () => ({ subscribe, requestFrame }),
    [requestFrame, subscribe]
  );

  return (
    <ParallaxContext.Provider value={value}>
      {children}
    </ParallaxContext.Provider>
  );
}

export function useParallaxSource() {
  const context = useContext(ParallaxContext);
  if (!context) {
    throw new Error("useParallaxSource must be used within ParallaxProvider");
  }
  return context;
}
