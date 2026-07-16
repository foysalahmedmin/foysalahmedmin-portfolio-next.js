import {
  getWrappedIndex,
  shouldAutoplay,
  updatePauseReasons,
  type AutoplayPauseReason,
} from "@/lib/motion/autoplay";
import { describe, expect, it } from "vitest";

describe("autoplay controller policy", () => {
  it("does not restart while any pause reason remains", () => {
    let reasons: ReadonlySet<AutoplayPauseReason> = new Set();
    reasons = updatePauseReasons(reasons, "hover", true);
    reasons = updatePauseReasons(reasons, "focus", true);
    reasons = updatePauseReasons(reasons, "hover", false);

    expect(shouldAutoplay({ item_count: 5, pause_reasons: reasons })).toBe(
      false
    );

    reasons = updatePauseReasons(reasons, "focus", false);
    expect(shouldAutoplay({ item_count: 5, pause_reasons: reasons })).toBe(
      true
    );
  });

  it.each([
    "user",
    "hover",
    "focus",
    "hidden",
    "reduced-motion",
    "offscreen",
  ] as const)("honors the %s pause reason", (reason) => {
    expect(
      shouldAutoplay({ item_count: 5, pause_reasons: new Set([reason]) })
    ).toBe(false);
  });

  it("wraps manual and automatic navigation safely", () => {
    expect(getWrappedIndex(4, 5, 1)).toBe(0);
    expect(getWrappedIndex(0, 5, -1)).toBe(4);
    expect(getWrappedIndex(0, 0, 1)).toBe(0);
  });

  it("does not autoplay a single-item narrative", () => {
    expect(shouldAutoplay({ item_count: 1, pause_reasons: new Set() })).toBe(
      false
    );
  });
});
