import type {
  TPublicSiteFallbacksDto,
  TPublicSiteMediaDto,
} from "@/app/api/site/site.type";
import type { PillarKey } from "@/lib/content/pillars";

export type TPublicContentFallbackKind = "project" | "article";

export type TPublicContentFallbackInput = Readonly<{
  kind: TPublicContentFallbackKind;
  pillar?: PillarKey;
  fallbacks: TPublicSiteFallbacksDto;
  explicit?: TPublicSiteMediaDto;
}>;

/**
 * Resolves managed public media only. A caller remains responsible for its
 * code-owned SVG fallback when this returns undefined.
 */
export const resolvePublicContentFallback = ({
  kind,
  pillar,
  fallbacks,
  explicit,
}: TPublicContentFallbackInput): TPublicSiteMediaDto | undefined =>
  explicit ??
  (pillar ? fallbacks[`${kind}_by_pillar`][pillar] : undefined) ??
  fallbacks[kind];
