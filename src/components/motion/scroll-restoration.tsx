"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEngine } from "./engine-provider";

/** How long to wait for the restored page to grow tall enough, in animation frames (about a second). */
const MAX_WAIT_FRAMES = 60;

/**
 * Back and forward return to the exact scroll position (docs plan 3.7.1, "Navigation feel"), with or
 * without smooth scroll. The browser's own restoration fights Lenis, and a client-rendered page is
 * often not tall enough yet at the moment it tries, so the position of each page is remembered when
 * it is left and put back once the page has rendered. A new navigation is left to Next.js, which
 * starts at the top. Pages are keyed by path; a hash in the URL is left to the browser.
 *
 * `history.pushState` is called before the new page scrolls to the top, so wrapping it records the
 * position the visitor actually left.
 */
export function ScrollRestoration() {
  const pathname = usePathname();
  const engine = useEngine();
  const engineRef = useRef(engine);
  const state = useRef({
    positions: new Map<string, number>(),
    key: pathname,
    lastY: 0,
    popping: false,
  });

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    const current = state.current;
    let popTimer: number | undefined;

    const onScroll = () => {
      if (window.location.pathname === current.key)
        current.lastY = window.scrollY;
    };
    const onPopState = () => {
      current.positions.set(current.key, current.lastY);
      current.popping = true;
      window.clearTimeout(popTimer);
      // A traversal that never changes the path (a hash) must not leak into the next navigation
      popTimer = window.setTimeout(() => {
        current.popping = false;
      }, 5_000);
    };

    const originalPush = window.history.pushState;
    const wrappedPush: History["pushState"] = (...args) => {
      current.positions.set(current.key, window.scrollY);
      current.popping = false;
      return originalPush.apply(window.history, args);
    };
    window.history.pushState = wrappedPush;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(popTimer);
      if (window.history.pushState === wrappedPush) {
        window.history.pushState = originalPush;
      }
    };
  }, []);

  // A page has rendered: restore it if we got here by back or forward
  useEffect(() => {
    const current = state.current;
    current.key = pathname;
    if (!current.popping || window.location.hash) {
      current.lastY = window.scrollY;
      return;
    }
    const target = current.positions.get(pathname);
    if (target === undefined) {
      current.popping = false;
      current.lastY = window.scrollY;
      return;
    }

    // `popping` is cleared when the position is applied, not here, so a repeated effect run (React
    // strict mode in development) restores again instead of finding nothing to do
    let frame = 0;
    let frames = 0;
    const settle = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room < target - 1 && frames++ < MAX_WAIT_FRAMES) {
        frame = window.requestAnimationFrame(settle);
        return;
      }
      const y = Math.min(target, Math.max(0, room));
      if (engineRef.current) {
        engineRef.current.scrollTo(y, { immediate: true, focus: false });
      } else {
        window.scrollTo(0, y);
      }
      current.lastY = y;
      current.popping = false;
    };
    frame = window.requestAnimationFrame(settle);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
