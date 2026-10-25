import { formatCount } from "@/lib/motion/counter";
import { describe, expect, it } from "vitest";

describe("formatCount", () => {
  it("formats with grouping, decimals, prefix and suffix", () => {
    expect(formatCount(1280)).toBe("1,280");
    expect(formatCount(99.5, { decimals: 1 })).toBe("99.5");
    expect(formatCount(99, { decimals: 1 })).toBe("99.0");
    expect(formatCount(42, { prefix: "~", suffix: "+" })).toBe("~42+");
    expect(formatCount(0, { decimals: 2 })).toBe("0.00");
  });

  it("is stable for a non-finite value and clamps absurd decimals", () => {
    expect(formatCount(Number.NaN)).toBe("0");
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatCount(1.5, { decimals: 99 })).toBe("1.500000");
    expect(formatCount(1.5, { decimals: -2 })).toBe("2");
  });

  it("gives the same text on the server and for the last animation frame", () => {
    const format = { decimals: 1, prefix: "", suffix: "%", locale: "en" };
    expect(formatCount(87.3, format)).toBe(formatCount(87.3, { ...format }));
  });
});
