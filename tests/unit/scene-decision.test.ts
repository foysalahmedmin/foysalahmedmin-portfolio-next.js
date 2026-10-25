import { createGovernor, GOVERNOR } from "@/lib/motion/governor";
import { isSoftwareRenderer } from "@/lib/motion/gpu";
import { decideScene, isScene3dEnabled } from "@/lib/motion/scene";
import { describe, expect, it } from "vitest";

const base = {
  enabled: true,
  preference: "auto" as const,
  effectiveMotion: "full" as const,
  tier: 3 as const,
};

describe("decideScene", () => {
  it("adds a canvas on tiers 3 and 2, simplified on tier 2", () => {
    expect(decideScene(base)).toEqual({
      mode: "canvas",
      quality: "full",
      reason: "ready",
    });
    expect(decideScene({ ...base, tier: 2 })).toEqual({
      mode: "canvas",
      quality: "simplified",
      reason: "ready",
    });
  });

  it("is poster only on tiers 1 and 0", () => {
    for (const tier of [1, 0] as const) {
      expect(decideScene({ ...base, tier })).toEqual({
        mode: "poster",
        quality: null,
        reason: "tier",
      });
    }
  });

  it("applies the kill switch first, then the still-image choice, then reduced motion", () => {
    expect(
      decideScene({ ...base, enabled: false, preference: "still" }).reason
    ).toBe("disabled");
    expect(
      decideScene({ ...base, preference: "still", effectiveMotion: "off" })
        .reason
    ).toBe("still");
    expect(decideScene({ ...base, effectiveMotion: "reduced" }).reason).toBe(
      "motion"
    );
    expect(
      decideScene({ ...base, effectiveMotion: "off", tier: 1 }).reason
    ).toBe("motion");
  });
});

describe("isScene3dEnabled", () => {
  it("is on by default and off for the flag or a site whose motion default is off", () => {
    expect(isScene3dEnabled({}, "full")).toBe(true);
    expect(isScene3dEnabled({}, undefined)).toBe(true);
    for (const flag of ["0", "false", "FALSE", "off", " 0 "]) {
      expect(isScene3dEnabled({ PUBLIC_3D_ENABLED: flag }, "full")).toBe(false);
    }
    expect(isScene3dEnabled({ PUBLIC_3D_ENABLED: "1" }, "full")).toBe(true);
    // The seeded default ("reduced") is not a kill switch; an explicit "off" is
    expect(isScene3dEnabled({}, "reduced")).toBe(true);
    expect(isScene3dEnabled({}, "off")).toBe(false);
  });
});

describe("isSoftwareRenderer", () => {
  it("recognises the software rasterisers and not real GPUs", () => {
    for (const name of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "Microsoft Basic Render Driver",
      "Mesa Offscreen",
    ]) {
      expect(isSoftwareRenderer(name), name).toBe(true);
    }
    for (const name of [
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Adreno (TM) 650",
      "Mali-G78",
    ]) {
      expect(isSoftwareRenderer(name), name).toBe(false);
    }
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(isSoftwareRenderer("")).toBe(false);
  });
});

describe("runtime governor", () => {
  const feed = (tier: 3 | 2, interval: number, count = 400) => {
    const governor = createGovernor(tier);
    let verdict = governor.step(interval);
    for (
      let index = 1;
      index < count && verdict.state === "pending";
      index += 1
    ) {
      verdict = governor.step(interval);
    }
    return verdict;
  };

  it("keeps a smooth scene", () => {
    expect(feed(3, 16.7).state).toBe("ok");
    expect(feed(2, 33).state).toBe("ok"); // 30 fps is fine on tier 2
  });

  it("steps tier 3 down below 45 fps and tier 2 down below 24 fps, one tier at a time", () => {
    const slow3 = feed(3, 28); // ~36 fps
    expect(slow3).toMatchObject({ state: "demote", to: 2 });
    const slow2 = feed(2, 50); // 20 fps
    expect(slow2).toMatchObject({ state: "demote", to: 1 });
  });

  it("ignores the warm-up frames and hidden-tab gaps", () => {
    const governor = createGovernor(3);
    // Twelve slow warm-up frames while shaders compile do not count
    for (let index = 0; index < GOVERNOR.warmupFrames; index += 1) {
      expect(governor.step(400).state).toBe("pending");
    }
    // A five-second gap (tab hidden) is not a slow frame
    expect(governor.step(5_000).state).toBe("pending");
    let verdict = governor.step(16.7);
    for (
      let index = 0;
      index < 200 && verdict.state === "pending";
      index += 1
    ) {
      verdict = governor.step(16.7);
    }
    expect(verdict.state).toBe("ok");
  });

  it("decides once and never steps up", () => {
    const governor = createGovernor(3);
    let verdict = governor.step(60);
    for (
      let index = 0;
      index < 100 && verdict.state === "pending";
      index += 1
    ) {
      verdict = governor.step(60);
    }
    expect(verdict.state).toBe("demote");
    // Later fast frames cannot change the verdict
    for (let index = 0; index < 500; index += 1) governor.step(8);
    expect(governor.step(8)).toEqual(verdict);
  });
});
