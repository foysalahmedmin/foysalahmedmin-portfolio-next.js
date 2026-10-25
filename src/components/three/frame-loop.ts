import type { MotionEngine } from "@/lib/motion/engine/types";

export type FrameCallback = (timeMs: number, deltaMs: number) => void;

/**
 * One clock (docs plan 3.7.1): with the engine, frames come from the GSAP ticker that also drives
 * smooth scroll and ScrollTrigger; without it (touch, tier 2 on a phone) a single requestAnimationFrame
 * loop. Either way a hidden tab produces no frames. Returns the unsubscribe function.
 */
export function subscribeFrames(
  engine: MotionEngine | null,
  callback: FrameCallback
): () => void {
  if (engine) {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      callback(now, now - last);
      last = now;
    };
    engine.gsap.ticker.add(tick);
    return () => engine.gsap.ticker.remove(tick);
  }

  let frame = 0;
  let last = performance.now();
  const loop = (now: number) => {
    callback(now, now - last);
    last = now;
    frame = window.requestAnimationFrame(loop);
  };
  frame = window.requestAnimationFrame(loop);
  return () => window.cancelAnimationFrame(frame);
}
