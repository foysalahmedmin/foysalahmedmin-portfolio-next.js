import "server-only";

import { readPageCompositionItems } from "@/app/api/pages/page-resolver.registry";
import {
  PAGE_RESOLVER_MAX_RECORDS,
  PAGE_RESOLVER_MAX_SECTION_READS,
  PAGE_RESOLVER_SECTION_CONCURRENCY,
  type TResolvedPageSection,
  type TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import * as PageRepository from "@/app/api/pages/page.repository";
import {
  PAGE_ROUTE_PATHS,
  type TPageDraftSnapshot,
  type TPagePublishedSnapshot,
  type TPageRouteKey,
  type TPageSection,
} from "@/app/api/pages/page.type";
import { parsePageDraftSnapshot } from "@/app/api/pages/page.validation";
import { readPublishedSite } from "@/lib/site/published-site";
import connectDB from "@/lib/db";

export class PublishedPageResolverError extends Error {
  readonly code: "PAGE_NOT_PUBLISHED" | "PAGE_RESOLVER_BUDGET_EXCEEDED";

  constructor(
    code: "PAGE_NOT_PUBLISHED" | "PAGE_RESOLVER_BUDGET_EXCEEDED",
    message: string
  ) {
    super(message);
    this.name = "PublishedPageResolverError";
    this.code = code;
  }
}

type TPublishedPageReaderResult = Readonly<{
  route_key: TPageRouteKey;
  revision: number;
  published_at: string;
  snapshot: TPageDraftSnapshot;
}>;

const draftFromPublished = (
  routeKey: TPageRouteKey,
  published: TPagePublishedSnapshot
): TPageDraftSnapshot => {
  const {
    revision: _revision,
    published_at: _publishedAt,
    published_by: _publishedBy,
    ...draft
  } = published;
  return parsePageDraftSnapshot(routeKey, draft);
};

export const readPublishedPageSnapshot = async (
  routeKey: TPageRouteKey
): Promise<TPublishedPageReaderResult> => {
  await connectDB();
  const page = await PageRepository.findPublishedPage(routeKey);
  if (!page?.published) {
    throw new PublishedPageResolverError(
      "PAGE_NOT_PUBLISHED",
      "The requested Page is not published."
    );
  }
  return {
    route_key: routeKey,
    revision: page.published.revision,
    published_at: new Date(page.published.published_at).toISOString(),
    snapshot: draftFromPublished(routeKey, page.published),
  };
};

const safeFilters = (
  section: TPageSection
): Readonly<Record<string, string | boolean>> => {
  if (section.source.mode !== "automatic") return {};
  return Object.fromEntries(
    Object.entries(section.source.filter).filter(
      (entry): entry is [string, string | boolean] =>
        typeof entry[1] === "string" || typeof entry[1] === "boolean"
    )
  );
};

const resolveSection = async (
  section: TPageSection,
  siteUsesEmergencyFallback: boolean
): Promise<TResolvedPageSection> => {
  if (section.source.mode === "system") {
    return {
      key: section.key,
      kind: section.kind,
      ...(section.heading ? { heading: section.heading } : {}),
      layout: section.layout,
      source_mode: "system",
      items: [],
      health: {
        status: siteUsesEmergencyFallback ? "partial" : "healthy",
        requested_records: 0,
        resolved_records: 0,
        omitted_records: 0,
        reason_codes: siteUsesEmergencyFallback
          ? ["site_emergency_fallback"]
          : [],
      },
    };
  }
  const requested =
    section.source.mode === "curated"
      ? section.source.ids.length
      : (section.item_limit ?? 1);
  try {
    const sourceFilter = safeFilters(section);
    const recordLimit = Math.min(24, requested);
    const items = (
      await readPageCompositionItems(section.kind, {
        ...(section.source.mode === "curated"
          ? { ids: section.source.ids }
          : {}),
        limit: recordLimit,
        filters: safeFilters(section),
      })
    ).slice(0, recordLimit);
    const omitted =
      section.source.mode === "curated"
        ? Math.max(0, requested - items.length)
        : 0;
    const status =
      section.source.mode === "curated"
        ? items.length === requested
          ? "healthy"
          : items.length
            ? "partial"
            : "unavailable"
        : items.length
          ? "healthy"
          : "empty";
    return {
      key: section.key,
      kind: section.kind,
      ...(section.heading ? { heading: section.heading } : {}),
      layout: section.layout,
      source_mode: section.source.mode,
      ...(section.source.mode === "automatic"
        ? { source_filter: sourceFilter }
        : {}),
      items,
      health: {
        status,
        requested_records: requested,
        resolved_records: items.length,
        omitted_records: omitted,
        reason_codes:
          section.source.mode === "curated" && omitted
            ? ["curated_reference_omitted"]
            : status === "empty"
              ? ["source_empty"]
              : [],
      },
    };
  } catch {
    return {
      key: section.key,
      kind: section.kind,
      ...(section.heading ? { heading: section.heading } : {}),
      layout: section.layout,
      source_mode: section.source.mode,
      ...(section.source.mode === "automatic"
        ? { source_filter: safeFilters(section) }
        : {}),
      items: [],
      health: {
        status: "unavailable",
        requested_records: requested,
        resolved_records: 0,
        omitted_records: section.source.mode === "curated" ? requested : 0,
        reason_codes: ["source_unavailable"],
      },
    };
  }
};

const mapWithConcurrency = async <TInput, TOutput>(
  inputs: readonly TInput[],
  limit: number,
  mapper: (input: TInput) => Promise<TOutput>
): Promise<TOutput[]> => {
  const results = new Array<TOutput>(inputs.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(inputs[index]!);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, inputs.length) }, () => worker())
  );
  return results;
};

export const resolvePageSnapshotUncached = async (
  input: Readonly<{
    route_key: TPageRouteKey;
    revision: number;
    resolved_at: string;
    snapshot: TPageDraftSnapshot;
    site: TPublicSiteDto;
  }>
): Promise<TResolvedPublishedPagePayload> => {
  const visibleSections = input.snapshot.sections.filter(
    (section) => section.visible
  );
  if (visibleSections.length > PAGE_RESOLVER_MAX_SECTION_READS) {
    throw new PublishedPageResolverError(
      "PAGE_RESOLVER_BUDGET_EXCEEDED",
      "The Page exceeds the resolver section budget."
    );
  }
  const sections = await mapWithConcurrency(
    visibleSections,
    PAGE_RESOLVER_SECTION_CONCURRENCY,
    (section) =>
      resolveSection(section, input.site.content_source !== "published")
  );
  const resolvedRecords = sections.reduce(
    (total, section) => total + section.health.resolved_records,
    0
  );
  if (resolvedRecords > PAGE_RESOLVER_MAX_RECORDS) {
    throw new PublishedPageResolverError(
      "PAGE_RESOLVER_BUDGET_EXCEEDED",
      "The Page exceeds the resolver record budget."
    );
  }
  const omittedRecords = sections.reduce(
    (total, section) => total + section.health.omitted_records,
    0
  );
  const healthySections = sections.filter(
    (section) => section.health.status === "healthy"
  ).length;
  return {
    page: {
      route_key: input.route_key,
      route_path: PAGE_ROUTE_PATHS[input.route_key],
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      published_revision: input.revision,
      published_at: input.resolved_at,
      seo: input.snapshot.seo,
    },
    site: input.site,
    sections,
    health: {
      status:
        healthySections === sections.length &&
        input.site.content_source === "published"
          ? "healthy"
          : "degraded",
      total_sections: sections.length,
      healthy_sections: healthySections,
      degraded_sections: sections.length - healthySections,
      resolved_records: resolvedRecords,
      omitted_records: omittedRecords,
    },
  };
};

export const resolvePublishedPageUncached = async (
  routeKey: TPageRouteKey
): Promise<TResolvedPublishedPagePayload> => {
  const [published, site] = await Promise.all([
    readPublishedPageSnapshot(routeKey),
    readPublishedSite(),
  ]);
  return await resolvePageSnapshotUncached({
    route_key: routeKey,
    revision: published.revision,
    resolved_at: published.published_at,
    snapshot: published.snapshot,
    site,
  });
};
