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
    src: "/images/hero/system-architect.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8d8d8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJZQCdAEfkQKnAgAA/u/u+wgmKC6+yNz7CS7mdRi0R5XJ0xGltTAQAAA=",
  },
  software_developer: {
    src: "/images/hero/software-developer.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#e8e8e8",
    blur_data_url:
      "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAADwAQCdASoQAAkAAwBWJYwCdAEKCjBG9lgA/vBdhPVpERSzaokdeH5SMC5AZKITn+83rdevzgJDdCtiF2f8KgAA",
  },
  ai_automation: {
    src: "/images/hero/ai-automation.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#c8c8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJYwCdAEfPGWxwQAA/vPGRCUb6WFKVvOg1g5AQ8qJHxSXP1fveVeugAA=",
  },
};

// A project without a picture gets the drawing of its role: a system blueprint, an application window or an
// automation flow. All three share one frame (4:3, monochrome on a grid), so a list of them reads as one set.
const projectArtByPillar: Record<PillarKey, string> = {
  system_architect: "/images/fallback/project-system-architect.svg",
  software_developer: "/images/fallback/project-software-developer.svg",
  ai_automation: "/images/fallback/project-ai-automation.svg",
};

export function getFallbackMediaPresentation(
  kind: FallbackMediaKind,
  pillar?: PillarKey
): FallbackMediaPresentation {
  if (kind === "hero" && pillar) return heroFallbackByPillar[pillar];
  if (kind === "project" && pillar) return { src: projectArtByPillar[pillar] };
  return { src: fallbackByKind[kind] };
}

export function getFallbackMedia(
  kind: FallbackMediaKind,
  pillar?: PillarKey
): string {
  return getFallbackMediaPresentation(kind, pillar).src;
}

const HERO_ART_BASE: Record<PillarKey, string> = {
  system_architect: "system-architect",
  software_developer: "software-developer",
  ai_automation: "ai-automation",
};

/** The generated hero art for a role, in the optimised sizes (desktop 1600x900, mobile 1080x1350). */
export function getHeroArt(pillar: PillarKey) {
  const name = `/images/hero/derivatives/${HERO_ART_BASE[pillar]}`;
  return {
    desktop: {
      avif: `${name}.desktop.q55.avif`,
      webp: `${name}.desktop.q82.webp`,
      width: 1600,
      height: 900,
    },
    mobile: {
      avif: `${name}.mobile.q52.avif`,
      webp: `${name}.mobile.q78.webp`,
      width: 1080,
      height: 1350,
    },
  } as const;
}
