/**
 * Motion tokens (docs plan 3.7). The single source in TypeScript; `src/assets/styles/public/tokens.css`
 * mirrors the same values as CSS variables and `tests/unit/motion-tokens.test.ts` keeps the two in step.
 * No new curves are added anywhere: springs are expressed as `quickTo` durations, not as easings.
 */

/** Durations in milliseconds. */
export const dur = {
  micro: 120, // hover, press
  fast: 200, // toggles, chips
  base: 360, // reveals, panels
  slow: 640, // line reveals, wipes
  scene: 1100, // chapter entrances
} as const;

export type DurToken = keyof typeof dur;

/** Cubic-bezier control points, `[x1, y1, x2, y2]`. */
export const ease = {
  signal: [0.16, 1, 0.3, 1], // default entrance (expo-out feel)
  settle: [0.22, 0.8, 0.2, 1], // layout settle
  snap: [0.7, 0, 0.2, 1], // exits and wipes
} as const;

export type EaseToken = keyof typeof ease;

/** Scroll-linked smoothing, seconds (ScrollTrigger `scrub`). Progress itself stays linear. */
export const scrubLag = 0.6;

/** Route shutter (M18) duration, milliseconds. Mirrored in engine.css as the view-transition animation. */
export const routeShutterMs = 420;

/** Headline line stagger, milliseconds. */
export const staggerLine = 80;

/** Stagger caps (doctrine 6): 60 to 90 ms per item, 600 ms in total, groups of 12 or fewer. */
export const STAGGER = { step: 80, total: 600, group: 12 } as const;

export const cssCubicBezier = (token: EaseToken): string =>
  `cubic-bezier(${ease[token].join(", ")})`;

/**
 * A cubic-bezier as a function `x -> y`, for libraries that take an ease function (GSAP) so the CSS
 * tokens and the scripted motion share exactly one set of curves.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): (progress: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    // Newton-Raphson first (fast and exact for almost every input), bisection when the slope is flat
    let t = progress;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - progress;
      if (Math.abs(error) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }

    let low = 0;
    let high = 1;
    t = progress;
    for (let i = 0; i < 24; i += 1) {
      const x = sampleX(t);
      if (Math.abs(x - progress) < 1e-6) break;
      if (x < progress) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };
}

/** The token curves as ease functions. */
export const easeFn = {
  signal: cubicBezier(...ease.signal),
  settle: cubicBezier(...ease.settle),
  snap: cubicBezier(...ease.snap),
} as const satisfies Record<EaseToken, (progress: number) => number>;

/**
 * Per-item delays (ms) for a group of `count` items. Items arrive one step apart, the whole group
 * takes at most `STAGGER.total`, and a group larger than `STAGGER.group` arrives together.
 */
export function staggerDelays(count: number): number[] {
  const size = Math.max(0, Math.floor(count));
  if (size === 0) return [];
  if (size > STAGGER.group) return Array.from({ length: size }, () => 0);
  const step = Math.min(STAGGER.step, STAGGER.total / Math.max(1, size - 1));
  return Array.from({ length: size }, (_, index) => Math.round(index * step));
}

/** Delay for item `index` of a group (see `staggerDelays`). */
export function staggerDelay(index: number, count: number): number {
  return staggerDelays(count)[Math.max(0, Math.floor(index))] ?? 0;
}
