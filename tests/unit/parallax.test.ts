import {
  calculateSectionProgress,
  clampUnit,
  normalizePointer,
} from "@/lib/motion/parallax";
import { describe, expect, it } from "vitest";

describe("parallax math", () => {
  it("produces deterministic section progress at entry, center, and exit", () => {
    const viewport = 1_000;
    const height = 1_000;

    expect(
      calculateSectionProgress({
        top: viewport,
        height,
        viewport_height: viewport,
      })
    ).toBe(0);
    expect(
      calculateSectionProgress({ top: 0, height, viewport_height: viewport })
    ).toBe(0.5);
    expect(
      calculateSectionProgress({
        top: -height,
        height,
        viewport_height: viewport,
      })
    ).toBe(1);
  });

  it("clamps malformed inputs without producing unsafe travel", () => {
    expect(clampUnit(Number.NaN)).toBe(0);
    expect(clampUnit(-1)).toBe(0);
    expect(clampUnit(2)).toBe(1);
    expect(normalizePointer(0, 1_000)).toBe(-1);
    expect(normalizePointer(500, 1_000)).toBe(0);
    expect(normalizePointer(1_000, 1_000)).toBe(1);
  });
});
