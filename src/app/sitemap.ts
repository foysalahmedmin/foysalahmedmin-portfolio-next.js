import { buildPublicSitemap } from "@/lib/metadata/public-sitemap";
import { readPublishedSite } from "@/lib/site/published-site";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildPublicSitemap(await readPublishedSite());
}
