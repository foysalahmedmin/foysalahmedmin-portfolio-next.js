import {
  parseTierOverride,
  resolveEnginePolicy,
  resolveTier,
  type TierSignals,
} from "@/lib/motion/tier";
import { describe, expect, it } from "vitest";

const desktop: TierSignals = {
  effectiveMotion: "full",
  finePointer: true,
  forcedColors: false,
  saveData: false,
  cores: 10,
  memoryGb: 8,
};

describe("resolveTier", () => {
  it("gives a capable desktop tier 3", () => {
    expect(resolveTier(desktop)).toBe(3);
    expect(resolveTier({ ...desktop, memoryGb: undefined })).toBe(3);
  });

  it("gives touch and smaller devices tier 2", () => {
    expect(resolveTier({ ...desktop, finePointer: false })).toBe(2);
    expect(resolveTier({ ...desktop, cores: 4 })).toBe(2);
    expect(resolveTier({ ...desktop, memoryGb: 4 })).toBe(2);
    expect(resolveTier({ ...desktop, cores: undefined })).toBe(2);
  });

  it("drops to tier 1 for reduced or off motion, Save-Data, little memory, software rendering or demotion", () => {
    expect(resolveTier({ ...desktop, effectiveMotion: "reduced" })).toBe(1);
    expect(resolveTier({ ...desktop, effectiveMotion: "off" })).toBe(1);
    expect(resolveTier({ ...desktop, saveData: true })).toBe(1);
    expect(resolveTier({ ...desktop, memoryGb: 2 })).toBe(1);
    expect(resolveTier({ ...desktop, softwareRenderer: true })).toBe(1);
    expect(resolveTier({ ...desktop, demoted: true })).toBe(1);
  });

  it("drops to tier 0 for forced colours or no WebGL2, and tier 0 beats tier 1", () => {
    expect(resolveTier({ ...desktop, forcedColors: true })).toBe(0);
    expect(resolveTier({ ...desktop, webgl2: false })).toBe(0);
    expect(
      resolveTier({ ...desktop, webgl2: false, effectiveMotion: "reduced" })
    ).toBe(0);
    expect(resolveTier({ ...desktop, webgl2: true })).toBe(3);
  });

  it("lets the QA override win", () => {
    expect(resolveTier({ ...desktop, forcedColors: true }, 3)).toBe(3);
    expect(resolveTier(desktop, 0)).toBe(0);
  });
});

describe("parseTierOverride", () => {
  it("accepts 0 to 3 and nothing else", () => {
    expect(parseTierOverride("0")).toBe(0);
    expect(parseTierOverride("3")).toBe(3);
    for (const bad of ["4", "-1", "auto", "", "01", "2.5", null, undefined]) {
      expect(parseTierOverride(bad)).toBeNull();
    }
  });
});

describe("resolveEnginePolicy", () => {
  const base = {
    tier: 3 as const,
    effectiveMotion: "full" as const,
    finePointer: true,
  };

  it("loads GSAP and Lenis for full motion, a fine pointer and tier 2 or above", () => {
    expect(resolveEnginePolicy(base)).toEqual({
      load: true,
      smooth: true,
      reason: "ready",
    });
    expect(resolveEnginePolicy({ ...base, tier: 2 }).load).toBe(true);
  });

  it("stays absent for reduced and off motion", () => {
    for (const effectiveMotion of ["reduced", "off"] as const) {
      expect(resolveEnginePolicy({ ...base, effectiveMotion })).toEqual({
        load: false,
        smooth: false,
        reason: "motion",
      });
    }
  });

  it("stays absent for touch", () => {
    expect(resolveEnginePolicy({ ...base, finePointer: false })).toEqual({
      load: false,
      smooth: false,
      reason: "touch",
    });
  });

  it("stays absent below tier 2", () => {
    expect(resolveEnginePolicy({ ...base, tier: 1 }).reason).toBe("tier");
    expect(resolveEnginePolicy({ ...base, tier: 0 }).load).toBe(false);
  });
});
