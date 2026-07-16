import { resolveMotionMode } from "@/providers/motion-provider";
import { describe, expect, it } from "vitest";

describe("motion preference precedence", () => {
  it("keeps the OS reduced-motion preference as a safety cap", () => {
    expect(
      resolveMotionMode({
        os_reduced: true,
        user_preference: "full",
        site_default: "full",
      })
    ).toBe("reduced");
  });

  it("lets an explicit user reduction override the site default", () => {
    expect(
      resolveMotionMode({
        os_reduced: false,
        user_preference: "off",
        site_default: "full",
      })
    ).toBe("off");
    expect(
      resolveMotionMode({
        os_reduced: false,
        user_preference: "reduce",
        site_default: "full",
      })
    ).toBe("reduced");
  });

  it("uses the site default only when the user has no explicit choice", () => {
    expect(
      resolveMotionMode({
        os_reduced: false,
        user_preference: "system",
        site_default: "reduce",
      })
    ).toBe("reduced");
    expect(
      resolveMotionMode({
        os_reduced: false,
        user_preference: "full",
        site_default: "off",
      })
    ).toBe("full");
  });
});
