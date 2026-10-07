import { PILLAR_KEYS, type PillarKey } from "./pillars";

export { PILLAR_KEYS };
export type { PillarKey } from "./pillars";
export type FallbackMediaKind = "hero" | "project" | "article" | "profile";
export type FallbackMediaPresentation = Readonly<{
  src: string;
  focal_point?: Readonly<{ x: number; y: number }>;
  dominant_color?: string;
  blur_data_url?: string;
}>;

const fallbackByKind: Record<FallbackMediaKind, string> = {
  hero: "/images/fallback-hero.svg",
  project: "/images/fallback-project.svg",
  article: "/images/fallback-article.svg",
  profile: "/images/fallback-profile.svg",
};

// Each role reuses the generated hero that best fits it. The Software
// Developer role absorbs the former frontend, backend and full-stack lanes
// and shows the full-stack visual.
const heroFallbackByPillar: Record<PillarKey, FallbackMediaPresentation> = {
  system_architect: {
    src: "/images/heroes/system-design-pilot.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJZQCdAEfkQKnAgAA/u/u+wgmKC6+yNz7CS7mdRi0R5XJ0xGltTAQAAA=",
  },
  software_developer: {
    src: "/images/heroes/full-stack.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#e8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAADwAQCdASoQAAkAAwBWJYwCdAEKCjBG9lgA/vBdhPVpERSzaokdeH5SMC5AZKITn+83rdevzgJDdCtiF2f8KgAA",
  },
  ai_automation: {
    src: "/images/heroes/ai-automation.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8c8b8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJYwCdAEfPGWxwQAA/vPGRCUb6WFKVvOg1g5AQ8qJHxSXP1fveVeugAA=",
  },
};

export function getFallbackMediaPresentation(
  kind: FallbackMediaKind,
  pillar?: PillarKey
): FallbackMediaPresentation {
  if (kind === "hero" && pillar) return heroFallbackByPillar[pillar];
  return { src: fallbackByKind[kind] };
}

export function getFallbackMedia(
  kind: FallbackMediaKind,
  pillar?: PillarKey
): string {
  return getFallbackMediaPresentation(kind, pillar).src;
}
