import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type { MetadataRoute } from "next";
import {
  getSiteDefaultDescription,
  getSiteDefaultTitle,
} from "./site-metadata";
import { normalizeMetadataMediaUrl, resolveMetadataBase } from "./metadata-url";

export const buildRobotsRoute = (
  site: TPublicSiteDto
): MetadataRoute.Robots => {
  const base = resolveMetadataBase(site);
  const indexable =
    site.content_source === "published" &&
    site.seo.allow_indexing &&
    Boolean(base);
  if (!indexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/_next"],
      },
    ],
    sitemap: new URL("/sitemap.xml", base!).toString(),
    host: base!.origin,
  };
};

export const buildManifestRoute = (
  site: TPublicSiteDto
): MetadataRoute.Manifest => {
  const faviconUrl = site.brand.favicon?.url;
  const favicon =
    site.content_source === "published" && faviconUrl
      ? normalizeMetadataMediaUrl(faviconUrl)
      : null;
  return {
    name:
      site.content_source === "published"
        ? site.identity.public_name || getSiteDefaultTitle(site)
        : getSiteDefaultTitle(site),
    short_name:
      site.content_source === "published"
        ? site.identity.short_name || site.identity.public_name || "Portfolio"
        : "Portfolio",
    description: getSiteDefaultDescription(site),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: favicon || "/logo.png",
        sizes: "any",
        type: favicon?.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "any",
      },
    ],
  };
};

export const getSitemapBase = (site: TPublicSiteDto): URL | null =>
  site.content_source === "published" && site.seo.allow_indexing
    ? (resolveMetadataBase(site) ?? null)
    : null;
