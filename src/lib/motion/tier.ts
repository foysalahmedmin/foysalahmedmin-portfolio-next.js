/**
 * Capability tiers (docs plan 6.3) and the policy that decides whether the motion engine loads.
 *
 * T3  WebGL2, fine pointer, 6+ cores, 8+ GB when reported, motion on: the full experience.
 * T2  Capable, but touch or a smaller device: simplified.
 * T1  Reduced motion, Save-Data, 2 GB or less, software renderer, or demoted at runtime: CSS only.
 * T0  No JavaScript, no WebGL2, forced colours or `?tier=0`: server-rendered content only.
 *
 * Everything here is pure so it can be tested without a browser. WebGL2 is not probed in Phase 2 (a
 * context is expensive to create); the 3D scene supplies `webgl2` and `softwareRenderer` in Phase 3,
 * and the governor may only ever step the tier down.
 */

export type Tier = 0 | 1 | 2 | 3;

export type EffectiveMotionMode = "full" | "reduced" | "off";

export type TierSignals = Readonly<{
  effectiveMotion: EffectiveMotionMode;
  finePointer: boolean;
  forcedColors: boolean;
  saveData: boolean;
  /** `navigator.hardwareConcurrency`; unknown counts as a small device. */
  cores?: number;
  /** `navigator.deviceMemory` in GB (Chromium only). */
  memoryGb?: number;
  /** `undefined` until the 3D scene has probed it. */
  webgl2?: boolean;
  softwareRenderer?: boolean;
  /** Set by the runtime governor after a sustained slow period. */
  demoted?: boolean;
}>;

export const TIERS: readonly Tier[] = [0, 1, 2, 3];

export const isTier = (value: unknown): value is Tier =>
  value === 0 || value === 1 || value === 2 || value === 3;

/** Parse the `?tier=` QA override (0 to 3). Anything else is ignored. */
export function parseTierOverride(
  value: string | null | undefined
): Tier | null {
  if (value === null || value === undefined || !/^[0-3]$/.test(value)) {
    return null;
  }
  return Number(value) as Tier;
}

export function resolveTier(
  signals: TierSignals,
  override: Tier | null = null
): Tier {
  if (override !== null) return override;
  if (signals.forcedColors || signals.webgl2 === false) return 0;
  if (
    signals.effectiveMotion !== "full" ||
    signals.saveData ||
    (signals.memoryGb !== undefined && signals.memoryGb <= 2) ||
    signals.softwareRenderer ||
    signals.demoted
  ) {
    return 1;
  }
  const strong =
    signals.finePointer &&
    (signals.cores ?? 0) >= 6 &&
    (signals.memoryGb === undefined || signals.memoryGb >= 8);
  return strong ? 3 : 2;
}

export type EnginePolicy = Readonly<{
  /** Load GSAP, ScrollTrigger and SplitText (the motion chunk). */
  load: boolean;
  /** Start Lenis smooth scroll. */
  smooth: boolean;
  /** Why the engine stays off, for the `data-motion-engine` attribute and the lab. */
  reason: "ready" | "motion" | "touch" | "tier";
}>;

/**
 * The engine is an enhancement for desktop-class visitors who want motion. It is absent for reduced
 * and off motion, for touch (those visitors get the CSS tier, which keeps the phone's initial and
 * deferred JavaScript small), and below tier 2. Lenis follows the same rule and only runs on a fine
 * pointer (docs plan 3.7, rule 6).
 */
export function resolveEnginePolicy(input: {
  tier: Tier;
  effectiveMotion: EffectiveMotionMode;
  finePointer: boolean;
}): EnginePolicy {
  if (input.effectiveMotion !== "full") {
    return { load: false, smooth: false, reason: "motion" };
  }
  if (!input.finePointer)
    return { load: false, smooth: false, reason: "touch" };
  if (input.tier < 2) return { load: false, smooth: false, reason: "tier" };
  return { load: true, smooth: true, reason: "ready" };
}

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** Read the static signals from the browser. No GPU context is created. */
export function readTierSignals(
  effectiveMotion: EffectiveMotionMode
): TierSignals {
  const nav = navigator as NavigatorHints;
  return {
    effectiveMotion,
    finePointer: window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
    saveData: Boolean(nav.connection?.saveData),
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
  };
}

const TIER_STORAGE_KEY = "portfolio:tier-override";

/**
 * The QA override survives navigation for the session: `?tier=N` sets it, `?tier=auto` clears it.
 * Storage can be blocked; the URL alone then still applies to the current page.
 */
export function readTierOverride(): Tier | null {
  try {
    const param = new URLSearchParams(window.location.search).get("tier");
    if (param === "auto") {
      window.sessionStorage.removeItem(TIER_STORAGE_KEY);
      return null;
    }
    const fromUrl = parseTierOverride(param);
    if (fromUrl !== null) {
      window.sessionStorage.setItem(TIER_STORAGE_KEY, String(fromUrl));
      return fromUrl;
    }
    return parseTierOverride(window.sessionStorage.getItem(TIER_STORAGE_KEY));
  } catch {
    return parseTierOverride(
      new URLSearchParams(window.location.search).get("tier")
    );
  }
}
