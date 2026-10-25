import {
  activeBeat,
  beatWeights,
  smoothstep,
  storyLength,
  storyTime,
} from "@/lib/motion/story";
import { describe, expect, it } from "vitest";

describe("scroll story clock", () => {
  it("is N minus 0.3 units long and maps progress linearly", () => {
    expect(storyLength(3)).toBeCloseTo(2.7, 10);
    expect(storyLength(1)).toBeCloseTo(0.7, 10);
    expect(storyTime(0, 3)).toBe(0);
    expect(storyTime(1, 3)).toBeCloseTo(2.7, 10);
    expect(storyTime(0.5, 3)).toBeCloseTo(1.35, 10);
    // out-of-range and non-finite progress are clamped, never NaN
    expect(storyTime(-1, 3)).toBe(0);
    expect(storyTime(4, 3)).toBeCloseTo(2.7, 10);
    expect(storyTime(Number.NaN, 3)).toBe(0);
  });

  it("changes the active beat in the middle of each changeover", () => {
    expect(activeBeat(0, 3)).toBe(0);
    expect(activeBeat(0.84, 3)).toBe(0);
    expect(activeBeat(0.86, 3)).toBe(1);
    expect(activeBeat(1.84, 3)).toBe(1);
    expect(activeBeat(1.86, 3)).toBe(2);
    expect(activeBeat(2.7, 3)).toBe(2);
    expect(activeBeat(99, 3)).toBe(2);
  });

  it("holds each beat for 0.7 and sums to one everywhere", () => {
    for (let step = 0; step <= 270; step += 1) {
      const time = step / 100;
      const weights = beatWeights(time, 3);
      expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
      for (const weight of weights) {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    }
    // Holds: the beat is whole until 0.7 after its start
    expect(beatWeights(0.69, 3)[0]).toBe(1);
    expect(beatWeights(1.0, 3)[1]).toBe(1);
    expect(beatWeights(1.69, 3)[1]).toBe(1);
    expect(beatWeights(2.0, 3)[2]).toBe(1);
    expect(beatWeights(2.7, 3)[2]).toBe(1);
    // Midway through a changeover the two beats are equal
    const mid = beatWeights(0.85, 3);
    expect(mid[0]).toBeCloseTo(0.5, 10);
    expect(mid[1]).toBeCloseTo(0.5, 10);
  });

  it("matches the prototype's camera weights for the three role beats", () => {
    const sm = (a: number, b: number, x: number) => smoothstep(a, b, x);
    for (const time of [0, 0.5, 0.8, 0.95, 1.3, 1.8, 1.95, 2.4]) {
      const a = sm(0.7, 1.0, time);
      const b = sm(1.7, 2.0, time);
      const expected = [1 - a, a * (1 - b), b];
      beatWeights(time, 3).forEach((weight, index) =>
        expect(weight).toBeCloseTo(expected[index]!, 10)
      );
    }
  });

  it("works for any number of beats", () => {
    expect(beatWeights(0, 1)).toEqual([1]);
    expect(beatWeights(1.5, 2).length).toBe(2);
    expect(activeBeat(1.8, 2)).toBe(1);
  });
});
