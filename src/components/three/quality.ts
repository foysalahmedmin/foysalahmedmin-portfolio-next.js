/**
 * Scene quality per tier (docs plan 6.3). Tier 3 is the full scene; tier 2 is simplified: no
 * antialiasing, a smaller shadow map, a shorter pulse trail, 30 frames a second and a lower pixel
 * ratio. Tiers 1 and 0 never create a renderer.
 */
export type SceneQuality = Readonly<{
  name: "full" | "simplified";
  antialias: boolean;
  /** Upper bound for the device pixel ratio. */
  maxPixelRatio: number;
  /** Frames per second cap; null is uncapped (the display refresh rate). */
  fpsCap: number | null;
  shadowMapSize: number;
  /** Bevel smoothness of the rounded blocks. */
  segments: number;
  /** Sprites in the pulse trail. */
  trail: number;
  /** Small lights running along the conduits (one instanced mesh). */
  packets: number;
  /** The camera follows the pointer (fine pointers on tier 3). */
  pointerRig: boolean;
}>;

export const QUALITY: Readonly<Record<"full" | "simplified", SceneQuality>> = {
  full: {
    name: "full",
    antialias: true,
    maxPixelRatio: 1.75,
    fpsCap: null,
    shadowMapSize: 2048,
    segments: 4,
    trail: 7,
    packets: 44,
    pointerRig: true,
  },
  simplified: {
    name: "simplified",
    antialias: false,
    maxPixelRatio: 1.25,
    fpsCap: 30,
    shadowMapSize: 1024,
    segments: 2,
    trail: 3,
    packets: 16,
    pointerRig: false,
  },
};
