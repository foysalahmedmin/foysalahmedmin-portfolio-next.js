import type {
  TPublicSiteDto,
  TPublicSiteMediaDto,
} from "@/app/api/site/site.type";
import { PILLAR_KEYS, type PillarKey } from "@/lib/content/pillars";
import {
  normalizeMetadataMediaUrl,
  normalizePublicRoutePath,
} from "./metadata-url";

export const DYNAMIC_OG_IMAGE_CONTRACT = Object.freeze({
  schema_version: 1 as const,
  width: 1200 as const,
  height: 630 as const,
  content_type: "image/png" as const,
  title_max_length: 120 as const,
  description_max_length: 240 as const,
});

export type TDynamicOgKind = "site" | "page" | "project" | "article";

export type TResolvedOgVisual =
  | {
      source: "managed_media";
      media_id: string;
      url: string;
      alt: string;
      width?: number;
      height?: number;
    }
  | {
      source: "code_fallback";
      fallback_visual_key: "abstract-grid-v1";
      alt: string;
      width: typeof DYNAMIC_OG_IMAGE_CONTRACT.width;
      height: typeof DYNAMIC_OG_IMAGE_CONTRACT.height;
    };

export type TDynamicOgInput = {
  schema_version: typeof DYNAMIC_OG_IMAGE_CONTRACT.schema_version;
  kind: TDynamicOgKind;
  title: string;
  description?: string;
  canonical_path: string;
  locale: "en";
  pillar?: PillarKey;
  visual: TResolvedOgVisual;
};

export type TDynamicOgBuildInput = {
  kind: TDynamicOgKind;
  title: string;
  description?: string;
  canonical_path: string;
  pillar?: PillarKey;
  image?: TPublicSiteMediaDto;
};

const boundedText = (
  value: string | undefined,
  maximum: number
): string | undefined => {
  const text = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text) return undefined;
  return text.slice(0, maximum);
};

const positiveDimension = (value: number | undefined): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;

const toManagedVisual = (
  media: TPublicSiteMediaDto | undefined,
  fallbackAlt: string
): Extract<TResolvedOgVisual, { source: "managed_media" }> | undefined => {
  if (!media?.id) return undefined;
  const url = normalizeMetadataMediaUrl(media.url);
  if (!url) return undefined;

  const width = positiveDimension(media.width);
  const height = positiveDimension(media.height);
  return {
    source: "managed_media",
    media_id: media.id,
    url,
    alt: boundedText(media.alt_text, 300) ?? fallbackAlt,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
};

const kindFallback = (
  site: TPublicSiteDto,
  kind: TDynamicOgKind
): TPublicSiteMediaDto | undefined => {
  if (kind === "project") return site.fallbacks.project;
  if (kind === "article") return site.fallbacks.article;
  return undefined;
};

export const buildDynamicOgInput = (
  site: TPublicSiteDto,
  input: TDynamicOgBuildInput
): TDynamicOgInput | null => {
  const title = boundedText(
    input.title,
    DYNAMIC_OG_IMAGE_CONTRACT.title_max_length
  );
  const canonicalPath = normalizePublicRoutePath(input.canonical_path);
  if (!title || !canonicalPath) return null;

  const candidates = [
    input.image,
    kindFallback(site, input.kind),
    site.seo.default_og,
  ];
  const visual =
    candidates
      .map((candidate) => toManagedVisual(candidate, title))
      .find((candidate) => candidate !== undefined) ??
    ({
      source: "code_fallback",
      fallback_visual_key: site.fallbacks.emergency_visual_key,
      alt: title,
      width: DYNAMIC_OG_IMAGE_CONTRACT.width,
      height: DYNAMIC_OG_IMAGE_CONTRACT.height,
    } satisfies TResolvedOgVisual);

  const description = boundedText(
    input.description,
    DYNAMIC_OG_IMAGE_CONTRACT.description_max_length
  );
  const pillar =
    input.pillar && PILLAR_KEYS.includes(input.pillar)
      ? input.pillar
      : undefined;

  return {
    schema_version: DYNAMIC_OG_IMAGE_CONTRACT.schema_version,
    kind: input.kind,
    title,
    ...(description ? { description } : {}),
    canonical_path: canonicalPath,
    locale: site.identity.locale,
    ...(pillar ? { pillar } : {}),
    visual,
  };
};
