import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { createBehaviors } from "./behaviors";
import { createScroll } from "./scroll";
import type { Cleanup, MotionEngine, PointerSnapshot } from "./types";

export type { MotionEngine } from "./types";

/**
 * The motion engine: GSAP (core, ScrollTrigger, SplitText) and Lenis behind one object (docs plan 6.1).
 * This module is the only place the animation libraries are imported. It is loaded with a dynamic
 * import by `MotionEngineHost`, only for visitors with full motion and a fine pointer, so it is
 * absent from the initial bundle and from reduced, off and touch sessions.
 */
export function createEngine(options: { smooth: boolean }): MotionEngine {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // A long frame must not make scroll "catch up" in a jump
  gsap.ticker.lagSmoothing(0);
  // Mobile URL-bar collapse is not a layout change (F10)
  ScrollTrigger.config({ ignoreMobileResize: true });

  const scroll = createScroll({ smooth: options.smooth });

  // One pointer source for every pointer behaviour: a single passive listener, delivered on the
  // GSAP tick, so components never subscribe to pointer events themselves (F3)
  let pointer: PointerSnapshot = { x: 0, y: 0, active: false };
  let dirty = false;
  const pointerListeners = new Set<(pointer: PointerSnapshot) => void>();

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY, active: true };
    dirty = true;
  };
  const onLeave = (event: MouseEvent) => {
    if (event.relatedTarget) return;
    pointer = { ...pointer, active: false };
    dirty = true;
  };
  const tick = () => {
    if (!dirty) return;
    dirty = false;
    pointerListeners.forEach((listener) => listener(pointer));
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("mouseout", onLeave);
  gsap.ticker.add(tick);

  const onPointer: MotionEngine["onPointer"] = (listener) => {
    pointerListeners.add(listener);
    return () => pointerListeners.delete(listener);
  };

  const behaviors = createBehaviors({
    onPointer,
    onRefresh: scroll.onRefresh,
    refresh: scroll.refresh,
  });

  const cleanups: Cleanup[] = [
    () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
      gsap.ticker.remove(tick);
      pointerListeners.clear();
    },
    () => scroll.destroy(),
    () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    },
  ];

  return {
    gsap,
    ScrollTrigger,
    lenis: scroll.lenis,
    pointer: () => pointer,
    onPointer,
    onRefresh: scroll.onRefresh,
    scrollTo: scroll.scrollTo,
    refresh: scroll.refresh,
    stop: scroll.stop,
    start: scroll.start,
    behaviors,
    destroy() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
