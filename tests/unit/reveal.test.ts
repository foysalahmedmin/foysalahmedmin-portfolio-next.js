import {
  getRevealVariantFromClassNames,
  normalizeRevealDelay,
} from "@/lib/motion/reveal";
import { describe, expect, it } from "vitest";

describe("reveal contract", () => {
  it("maps every supported legacy class to the declarative variant", () => {
    expect(getRevealVariantFromClassNames(["card", "fade-up"])).toBe("up");
    expect(getRevealVariantFromClassNames(["fade-down"])).toBe("down");
    expect(getRevealVariantFromClassNames(["fade-left"])).toBe("left");
    expect(getRevealVariantFromClassNames(["fade-right"])).toBe("right");
    expect(getRevealVariantFromClassNames(["scale-in"])).toBe("scale");
    expect(getRevealVariantFromClassNames(["skew-up"])).toBe("skew-up");
    expect(getRevealVariantFromClassNames(["unrelated"])).toBeNull();
  });

  it("clamps animation delays to the reviewed range", () => {
    expect(normalizeRevealDelay(-100)).toBe(0);
    expect(normalizeRevealDelay(125.4)).toBe(125);
    expect(normalizeRevealDelay(10_000)).toBe(1_200);
    expect(normalizeRevealDelay(Number.NaN)).toBe(0);
  });
});
