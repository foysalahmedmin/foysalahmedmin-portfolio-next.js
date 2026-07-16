import { PILLAR_KEYS, type PillarKey } from "./pillars";

export { PILLAR_KEYS };
export type { PillarKey } from "./pillars";
export type FallbackMediaKind = "hero" | "project" | "article" | "profile";

const fallbackByKind: Record<FallbackMediaKind, string> = {
  hero: "/images/fallback-hero.svg",
  project: "/images/fallback-project.svg",
  article: "/images/fallback-article.svg",
  profile: "/images/fallback-profile.svg",
};

export function getFallbackMedia(
  kind: FallbackMediaKind,
  _pillar?: PillarKey
): string {
  return fallbackByKind[kind];
}
