import { readRepoFile, stripComments } from "../helpers/contrast";
import {
  STAGGER,
  cssCubicBezier,
  cubicBezier,
  dur,
  ease,
  easeFn,
  routeShutterMs,
  staggerDelay,
  staggerDelays,
} from "@/lib/motion/tokens";
import { describe, expect, it } from "vitest";

const css = stripComments(readRepoFile("src/assets/styles/public/tokens.css"));
const engineCss = stripComments(
  readRepoFile("src/assets/styles/public/engine.css")
);

describe("motion tokens mirror the CSS variables", () => {
  it.each(Object.entries(dur))("dur.%s is %i ms in tokens.css", (name, ms) => {
    expect(css).toMatch(new RegExp(`--dur-${name}:\\s*${ms}ms`));
  });

  it.each(Object.entries(ease))("ease.%s matches its cubic-bezier", (name) => {
    const token = name as keyof typeof ease;
    expect(css).toContain(`--ease-${name}: ${cssCubicBezier(token)}`);
  });

  it("the route shutter duration matches the view-transition animation", () => {
    expect(engineCss).toContain(`route-shutter ${routeShutterMs}ms`);
  });
});

describe("cubicBezier", () => {
  it("is the identity for a linear curve", () => {
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    for (const x of [0, 0.1, 0.37, 0.5, 0.9, 1]) {
      expect(linear(x)).toBeCloseTo(x, 4);
    }
  });

  it("agrees with the CSS curve at known points", () => {
    // Standard CSS `ease-in-out` is cubic-bezier(0.42, 0, 0.58, 1); it is symmetric about (0.5, 0.5)
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 4);
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1, 4);
  });

  it.each(Object.keys(easeFn))(
    "%s starts at 0, ends at 1 and never goes backwards",
    (name) => {
      const fn = easeFn[name as keyof typeof easeFn];
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
      let previous = 0;
      for (let step = 1; step <= 200; step += 1) {
        const value = fn(step / 200);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  );

  it("signal is an entrance curve: most of the travel happens early", () => {
    expect(easeFn.signal(0.25)).toBeGreaterThan(0.6);
    expect(easeFn.snap(0.25)).toBeLessThan(0.25);
  });
});

describe("stagger caps", () => {
  it("spaces a small group one step apart", () => {
    expect(staggerDelays(4)).toEqual([0, 80, 160, 240]);
    expect(staggerDelays(1)).toEqual([0]);
    expect(staggerDelays(0)).toEqual([]);
  });

  it("keeps a whole group inside the 600 ms budget", () => {
    for (let count = 1; count <= STAGGER.group; count += 1) {
      const delays = staggerDelays(count);
      expect(delays[delays.length - 1]).toBeLessThanOrEqual(STAGGER.total);
      for (let index = 1; index < delays.length; index += 1) {
        expect(delays[index]! - delays[index - 1]!).toBeLessThanOrEqual(
          STAGGER.step
        );
      }
    }
  });

  it("brings a group larger than twelve in together", () => {
    expect(staggerDelays(13).every((delay) => delay === 0)).toBe(true);
    expect(staggerDelay(5, 40)).toBe(0);
  });

  it("returns 0 for an out-of-range index", () => {
    expect(staggerDelay(9, 4)).toBe(0);
    expect(staggerDelay(-3, 4)).toBe(0);
  });
});
