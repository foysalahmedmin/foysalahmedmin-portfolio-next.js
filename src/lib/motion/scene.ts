import type { EffectiveMotionMode, Tier } from "./tier";

export type ScenePreference = "auto" | "still";

export type SceneDecision = Readonly<{
  mode: "canvas" | "poster";
  /** `full` is the tier 3 scene, `simplified` the tier 2 scene. */
  quality: "full" | "simplified" | null;
  reason: "ready" | "disabled" | "still" | "motion" | "tier";
}>;

/**
 * Whether the hero shows the live 3D canvas or only the poster. The poster is always rendered by the
 * server; this decides whether a canvas is added on top of it, in this order: the kill switches (the
 * environment flag and the site's motion default), the visitor's still-image choice, reduced or off
 * motion, then the capability tier.
 */
export function decideScene(input: {
  enabled: boolean;
  preference: ScenePreference;
  effectiveMotion: EffectiveMotionMode;
  tier: Tier;
}): SceneDecision {
  if (!input.enabled)
    return { mode: "poster", quality: null, reason: "disabled" };
  if (input.preference === "still") {
    return { mode: "poster", quality: null, reason: "still" };
  }
  if (input.effectiveMotion !== "full") {
    return { mode: "poster", quality: null, reason: "motion" };
  }
  if (input.tier >= 3)
    return { mode: "canvas", quality: "full", reason: "ready" };
  if (input.tier === 2) {
    return { mode: "canvas", quality: "simplified", reason: "ready" };
  }
  return { mode: "poster", quality: null, reason: "tier" };
}

/**
 * The kill switch read on the server: `PUBLIC_3D_ENABLED=0` (or `false`) turns the canvas off for every
 * visitor without a deploy of content, and so does a site whose motion default is set to "off" in the
 * admin. The seeded default is "reduced", which today is only the server-render default and is not
 * applied to visitors, so it does not switch the scene off; Phase 4 settles what the site default means.
 */
export function isScene3dEnabled(
  env: Readonly<{ PUBLIC_3D_ENABLED?: string | undefined }>,
  siteMotion: "full" | "reduced" | "off" | undefined
): boolean {
  const flag = env.PUBLIC_3D_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return siteMotion !== "off";
}
