import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type {
  TPageRouteKey,
  TPageSectionKind,
  TPageSeoOverrides,
} from "./page.type";
import type { TPageCompositionItem } from "./page-resolver.registry";

export const PAGE_RESOLVER_SECTION_CONCURRENCY = 4;
export const PAGE_RESOLVER_MAX_SECTION_READS = 20;
export const PAGE_RESOLVER_MAX_RECORDS = 480;

export const PAGE_SECTION_HEALTH_STATUSES = [
  "healthy",
  "empty",
  "partial",
  "unavailable",
] as const;
export type TPageSectionHealthStatus =
  (typeof PAGE_SECTION_HEALTH_STATUSES)[number];

export type TPageSectionHealthReason =
  | "site_emergency_fallback"
  | "source_empty"
  | "source_unavailable"
  | "curated_reference_omitted";

export type TResolvedPageSection = Readonly<{
  key: string;
  kind: TPageSectionKind;
  heading?: string;
  layout: string;
  source_mode: "system" | "curated" | "automatic";
  items: readonly TPageCompositionItem[];
  health: Readonly<{
    status: TPageSectionHealthStatus;
    requested_records: number;
    resolved_records: number;
    omitted_records: number;
    reason_codes: readonly TPageSectionHealthReason[];
  }>;
}>;

export type TResolvedPublishedPagePayload = Readonly<{
  page: Readonly<{
    route_key: TPageRouteKey;
    route_path: string;
    locale: "en";
    schema_version: 1;
    contract_version: 1;
    published_revision: number;
    published_at: string;
    seo: TPageSeoOverrides;
  }>;
  site: TPublicSiteDto;
  sections: readonly TResolvedPageSection[];
  health: Readonly<{
    status: "healthy" | "degraded";
    total_sections: number;
    healthy_sections: number;
    degraded_sections: number;
    resolved_records: number;
    omitted_records: number;
  }>;
}>;

export type THomePagePayload = TResolvedPublishedPagePayload & {
  page: TResolvedPublishedPagePayload["page"] & { route_key: "home" };
};
