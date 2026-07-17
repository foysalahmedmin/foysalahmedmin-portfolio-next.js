import "server-only";

import type {
  THomePagePayload,
  TResolvedPageSection,
  TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import type {
  TPageRouteKey,
  TPageSectionKind,
} from "@/app/api/pages/page.type";
import { PAGE_ROUTE_PATHS } from "@/app/api/pages/page.type";
import { readPublishedSite } from "@/lib/site/published-site";
import { getHomePagePayload, getPublishedPagePayload } from "./published-page";

const FALLBACK_PAGE_PUBLISHED_AT = "1970-01-01T00:00:00.000Z";

const emptySection = (
  key: string,
  kind: TPageSectionKind,
  layout: string
): TResolvedPageSection => ({
  key,
  kind,
  layout,
  source_mode: "system",
  items: [],
  health: {
    status: "unavailable",
    requested_records: 0,
    resolved_records: 0,
    omitted_records: 0,
    reason_codes: ["source_unavailable"],
  },
});

const FALLBACK_SECTIONS: Readonly<
  Partial<Record<TPageRouteKey, readonly TResolvedPageSection[]>>
> = Object.freeze({
  home: [
    emptySection("hero", "site-hero", "immersive"),
    emptySection("services", "service-collection", "cards"),
    emptySection("skills", "skill-group-collection", "matrix"),
    emptySection("projects", "project-collection", "featured"),
    emptySection("articles", "article-collection", "featured"),
    emptySection("contact", "contact-cta", "banner"),
  ],
  about: [
    emptySection("introduction", "site-introduction", "split"),
    emptySection("skills", "skill-group-collection", "matrix"),
    emptySection("timeline", "timeline", "timeline"),
    emptySection("credentials", "credential-collection", "compact"),
    emptySection("faqs", "faq-list", "accordion"),
    emptySection("contact", "contact-cta", "banner"),
  ],
  projects: [
    emptySection("projects", "project-collection", "grid"),
    emptySection("contact", "contact-cta", "banner"),
  ],
  articles: [
    emptySection("articles", "article-collection", "grid"),
    emptySection("contact", "contact-cta", "banner"),
  ],
  contact: [
    emptySection("contact", "contact-form", "split"),
    emptySection("faqs", "faq-list", "accordion"),
  ],
  privacy: [emptySection("privacy", "legal-document", "document")],
  terms: [emptySection("terms", "legal-document", "document")],
});

const buildFallbackPayload = async (
  routeKey: TPageRouteKey
): Promise<TResolvedPublishedPagePayload> => {
  const site = await readPublishedSite();
  const sections = FALLBACK_SECTIONS[routeKey] ?? [];
  return {
    page: {
      route_key: routeKey,
      route_path: PAGE_ROUTE_PATHS[routeKey],
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      published_revision: 0,
      published_at: FALLBACK_PAGE_PUBLISHED_AT,
      seo: { noindex: true },
    },
    site,
    sections,
    health: {
      status: "degraded",
      total_sections: sections.length,
      healthy_sections: 0,
      degraded_sections: sections.length,
      resolved_records: 0,
      omitted_records: 0,
    },
  };
};

export const getPublicPagePayloadOrFallback = async (
  routeKey: TPageRouteKey
): Promise<TResolvedPublishedPagePayload> => {
  try {
    return await getPublishedPagePayload(routeKey);
  } catch {
    return await buildFallbackPayload(routeKey);
  }
};

export const getHomePagePayloadOrFallback =
  async (): Promise<THomePagePayload> => {
    try {
      return await getHomePagePayload();
    } catch {
      return (await buildFallbackPayload("home")) as THomePagePayload;
    }
  };
