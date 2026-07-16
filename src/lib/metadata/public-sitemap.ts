import "server-only";

import { getPublicArticles } from "@/app/api/articles/article.service";
import { getPublicProjects } from "@/app/api/projects/project.service";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type { MetadataRoute } from "next";
import { getSitemapBase } from "./metadata-routes";

const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/projects", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/articles", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
] as const;

type SlugRecord = Readonly<{
  slug: string;
  published_at?: string;
}>;

const collectPublishedSlugs = async (
  reader: (query: Record<string, unknown>) => Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number };
  }>
): Promise<SlugRecord[]> => {
  const records: SlugRecord[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await reader({
      page: String(page),
      limit: "50",
      sort: "-published_at",
    });
    for (const item of result.data) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (
        typeof row.slug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)
      )
        continue;
      records.push({
        slug: row.slug,
        ...(typeof row.published_at === "string"
          ? { published_at: row.published_at }
          : {}),
      });
    }
    if (
      records.length >= result.meta.total ||
      result.data.length < result.meta.limit
    )
      break;
  }
  return records;
};

export const buildPublicSitemap = async (
  site: TPublicSiteDto
): Promise<MetadataRoute.Sitemap> => {
  const base = getSitemapBase(site);
  if (!base) return [];

  const [projects, articles] = await Promise.all([
    collectPublishedSlugs(getPublicProjects),
    collectPublishedSlugs(getPublicArticles),
  ]).catch(() => [[], []] as const);
  const sitePublishedAt = site.published_at
    ? new Date(site.published_at)
    : undefined;

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: new URL(route.path, base).toString(),
      ...(sitePublishedAt && !Number.isNaN(sitePublishedAt.getTime())
        ? { lastModified: sitePublishedAt }
        : {}),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...projects.map((project) => ({
      url: new URL(`/projects/${project.slug}`, base).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...articles.map((article) => {
      const publishedAt = article.published_at
        ? new Date(article.published_at)
        : undefined;
      return {
        url: new URL(`/articles/${article.slug}`, base).toString(),
        ...(publishedAt && !Number.isNaN(publishedAt.getTime())
          ? { lastModified: publishedAt }
          : {}),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    }),
  ];
};
