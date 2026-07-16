import type {
  TPublicSiteDto,
  TPublicSiteMediaDto,
} from "@/app/api/site/site.type";
import { PILLAR_CONTRACT, type PillarKey } from "@/lib/content/pillars";
import type { Metadata } from "next";
import { buildRobotsPolicy } from "./noindex";
import { buildDynamicOgInput, type TDynamicOgKind } from "./open-graph";
import {
  buildCanonicalUrl,
  normalizeMetadataMediaUrl,
  resolveMetadataBase,
} from "./metadata-url";

export const FALLBACK_SITE_TITLE = "Engineering Portfolio";
export const FALLBACK_SITE_DESCRIPTION = `A portfolio spanning ${PILLAR_CONTRACT.map(
  ({ label }) => label
).join(", ")}.`;

const cleanText = (
  value: string | undefined,
  maximum: number
): string | undefined => {
  const text = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, maximum) : undefined;
};

const isValidTitleTemplate = (value: string): boolean =>
  value.split("%s").length === 2;

export const getSiteDefaultTitle = (site: TPublicSiteDto): string =>
  (site.content_source === "published"
    ? cleanText(site.seo.default_title, 120)
    : undefined) ?? FALLBACK_SITE_TITLE;

export const getSiteTitleTemplate = (site: TPublicSiteDto): string => {
  const configured =
    site.content_source === "published"
      ? cleanText(site.seo.title_template, 140)
      : undefined;
  return configured && isValidTitleTemplate(configured)
    ? configured
    : `%s | ${getSiteDefaultTitle(site)}`;
};

export const formatSiteTitle = (
  site: TPublicSiteDto,
  pageTitle?: string
): string => {
  const defaultTitle = getSiteDefaultTitle(site);
  const title = cleanText(pageTitle, 120);
  if (!title || title === defaultTitle) return defaultTitle;
  return getSiteTitleTemplate(site).replace("%s", title);
};

export const getSiteDefaultDescription = (site: TPublicSiteDto): string => {
  if (site.content_source !== "published") return FALLBACK_SITE_DESCRIPTION;
  return (
    cleanText(site.seo.default_description, 320) ??
    cleanText(site.positioning.short_bio, 320) ??
    cleanText(site.positioning.compact, 320) ??
    FALLBACK_SITE_DESCRIPTION
  );
};

export type TSocialMetadataInput = {
  pathname: string;
  title?: string;
  description?: string;
  kind?: TDynamicOgKind;
  image?: TPublicSiteMediaDto;
  pillar?: PillarKey;
};

export const buildSocialMetadata = (
  site: TPublicSiteDto,
  input: TSocialMetadataInput
): Pick<Metadata, "openGraph" | "twitter"> => {
  const title = formatSiteTitle(site, input.title);
  const description =
    cleanText(input.description, 320) ?? getSiteDefaultDescription(site);
  const kind = input.kind ?? "page";
  const canonical = buildCanonicalUrl(site, input.pathname);
  const ogInput = buildDynamicOgInput(site, {
    kind,
    title,
    description,
    canonical_path: input.pathname,
    image: input.image,
    pillar: input.pillar,
  });
  const managedImage =
    ogInput?.visual.source === "managed_media" ? ogInput.visual : undefined;
  const image = managedImage
    ? {
        url: managedImage.url,
        alt: managedImage.alt,
        ...(managedImage.width ? { width: managedImage.width } : {}),
        ...(managedImage.height ? { height: managedImage.height } : {}),
      }
    : undefined;
  const siteName =
    (site.content_source === "published"
      ? (cleanText(site.identity.short_name, 60) ??
        cleanText(site.identity.public_name, 120))
      : undefined) ?? getSiteDefaultTitle(site);

  return {
    openGraph: {
      type: kind === "article" ? "article" : "website",
      locale: site.identity.locale,
      title,
      description,
      siteName,
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
};

const buildIcons = (site: TPublicSiteDto): Metadata["icons"] => {
  if (site.content_source !== "published" || !site.brand.favicon) {
    return undefined;
  }
  const url = normalizeMetadataMediaUrl(site.brand.favicon.url);
  return url ? { icon: [{ url }] } : undefined;
};

export const buildSiteMetadata = (site: TPublicSiteDto): Metadata => {
  const metadataBase = resolveMetadataBase(site);
  const canonical = buildCanonicalUrl(site, "/");
  const description = getSiteDefaultDescription(site);
  const icons = buildIcons(site);

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: getSiteDefaultTitle(site),
      template: getSiteTitleTemplate(site),
    },
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: buildRobotsPolicy(site, "/"),
    ...(icons ? { icons } : {}),
    ...buildSocialMetadata(site, { pathname: "/", kind: "site" }),
  };
};

export type TPageMetadataInput = TSocialMetadataInput & {
  noTitleTemplate?: boolean;
};

export const buildPageMetadata = (
  site: TPublicSiteDto,
  input: TPageMetadataInput
): Metadata => {
  const title = cleanText(input.title, 120);
  const description =
    cleanText(input.description, 320) ?? getSiteDefaultDescription(site);
  const canonical = buildCanonicalUrl(site, input.pathname);

  return {
    ...(title
      ? { title: input.noTitleTemplate ? { absolute: title } : title }
      : {}),
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: buildRobotsPolicy(site, input.pathname),
    ...buildSocialMetadata(site, input),
  };
};
