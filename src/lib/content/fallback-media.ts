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

const heroFallbackByPillar: Record<PillarKey, FallbackMediaPresentation> = {
  frontend: {
    src: "/images/heroes/frontend.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#e8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADwAQCdASoQAAkAAwBWJZQCdAD1eD1WhoAA4nK/w9qB82+9sr3M/iAIc14Uhdr84M6W+8Xyn2RMUar0GJ/HghWAAAA=",
  },
  backend: {
    src: "/images/heroes/backend.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#c8c8b8",
    blur_data_url:
      "data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAAAQAgCdASoQAAkAAwBWJZQCw7EC1tmYzviAAP7nQKt+RUc2JjEym5M8LmfFDqKB1qn3h1Po2AAAAA==",
  },
  ai_automation: {
    src: "/images/heroes/ai-automation.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8c8b8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJYwCdAEfPGWxwQAA/vPGRCUb6WFKVvOg1g5AQ8qJHxSXP1fveVeugAA=",
  },
  system_design: {
    src: "/images/heroes/system-design-pilot.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJZQCdAEfkQKnAgAA/u/u+wgmKC6+yNz7CS7mdRi0R5XJ0xGltTAQAAA=",
  },
  // Placeholder: byte-identical copy of the system design visual until a
  // dedicated DevOps & Cloud hero is generated and passes the evidence gate.
  devops_cloud: {
    src: "/images/heroes/devops-cloud.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#d8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoQAAkAAwBWJZQCdAEfkQKnAgAA/u/u+wgmKC6+yNz7CS7mdRi0R5XJ0xGltTAQAAA=",
  },
  full_stack: {
    src: "/images/heroes/full-stack.master.png",
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: "#e8d8c8",
    blur_data_url:
      "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAADwAQCdASoQAAkAAwBWJYwCdAEKCjBG9lgA/vBdhPVpERSzaokdeH5SMC5AZKITn+83rdevzgJDdCtiF2f8KgAA",
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
