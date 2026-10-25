import type { Tier } from "./tier";

/**
 * The runtime governor (docs plan 6.3): sample the frame rate for two seconds after the scene starts;
 * if the average is under 45 fps on tier 3 or 24 fps on tier 2, step down one tier for the session.
 * It never steps up. Pure, so it is tested without a GPU: feed it frame intervals, read the verdict.
 */
export const GOVERNOR = {
  windowMs: 2_000,
  /** Frames at the start are compiling shaders and uploading textures; they say nothing about steady state. */
  warmupFrames: 12,
  /** An interval this long is a hidden tab or a breakpoint, not a slow GPU. */
  ignoreOverMs: 1_000,
  minFps: { 3: 45, 2: 24 } as const,
} as const;

export type GovernorVerdict =
  | Readonly<{ state: "pending" }>
  | Readonly<{ state: "ok"; fps: number }>
  | Readonly<{ state: "demote"; fps: number; to: Tier }>;

export function createGovernor(tier: Tier) {
  const threshold =
    tier === 3 ? GOVERNOR.minFps[3] : tier === 2 ? GOVERNOR.minFps[2] : null;
  let frames = 0;
  let measured = 0;
  let elapsed = 0;
  let verdict: GovernorVerdict =
    threshold === null ? { state: "ok", fps: 0 } : { state: "pending" };

  return {
    /** Feed one frame interval in milliseconds. Returns the verdict so far (it settles once). */
    step(deltaMs: number): GovernorVerdict {
      if (verdict.state !== "pending") return verdict;
      frames += 1;
      if (frames <= GOVERNOR.warmupFrames || deltaMs > GOVERNOR.ignoreOverMs) {
        return verdict;
      }
      measured += 1;
      elapsed += deltaMs;
      if (elapsed < GOVERNOR.windowMs) return verdict;

      const fps = (measured * 1000) / elapsed;
      verdict =
        threshold !== null && fps < threshold
          ? { state: "demote", fps, to: (tier - 1) as Tier }
          : { state: "ok", fps };
      return verdict;
    },
  };
}
