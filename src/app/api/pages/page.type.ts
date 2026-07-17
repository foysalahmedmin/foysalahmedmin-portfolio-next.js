import type { TRole } from "@/types/jsonwebtoken.type";
import type { Document, Types } from "mongoose";

export const PAGE_SCHEMA_VERSION = 1 as const;
export const PAGE_CONTRACT_VERSION = 1 as const;
export const PAGE_SNAPSHOT_MAX_BYTES = 64 * 1024;
export const PAGE_SECTION_MAX = 20;
export const PAGE_SECTION_ITEM_MAX = 24;
export const PAGE_GRAPH_RECORD_MAX = PAGE_SECTION_MAX * PAGE_SECTION_ITEM_MAX;

export const PAGE_ROUTE_KEYS = [
  "home",
  "about",
  "projects",
  "articles",
  "contact",
  "privacy",
  "terms",
] as const;
export type TPageRouteKey = (typeof PAGE_ROUTE_KEYS)[number];

export const PAGE_ROUTE_PATHS: Readonly<Record<TPageRouteKey, string>> = {
  home: "/",
  about: "/about",
  projects: "/projects",
  articles: "/articles",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
};

export const PAGE_SECTION_KINDS = [
  "site-hero",
  "site-introduction",
  "pillar-showcase",
  "architecture-workflow",
  "process-steps",
  "metrics-strip",
  "project-collection",
  "article-collection",
  "service-collection",
  "skill-group-collection",
  "timeline",
  "credential-collection",
  "faq-list",
  "testimonial-collection",
  "legal-document",
  "contact-form",
  "contact-cta",
] as const;
export type TPageSectionKind = (typeof PAGE_SECTION_KINDS)[number];

export type TPageSectionSource =
  | { mode: "system" }
  | { mode: "curated"; ids: string[] }
  | { mode: "automatic"; filter: Readonly<Record<string, unknown>> };

export type TPageSection = {
  key: string;
  kind: TPageSectionKind;
  visible: boolean;
  heading?: string;
  layout: string;
  item_limit?: number;
  source: TPageSectionSource;
};

export type TPageSeoOverrides = {
  title?: string;
  description?: string;
  noindex: boolean;
};

export type TPageDraftSnapshot = {
  seo: TPageSeoOverrides;
  sections: TPageSection[];
};

export type TPagePublishedSnapshot = TPageDraftSnapshot & {
  revision: number;
  published_at: Date | string;
  published_by: Types.ObjectId | string;
};

export type TPage = {
  _id: Types.ObjectId;
  route_key: TPageRouteKey;
  locale: "en";
  schema_version: typeof PAGE_SCHEMA_VERSION;
  contract_version: typeof PAGE_CONTRACT_VERSION;
  revision: number;
  draft: TPageDraftSnapshot;
  published?: TPagePublishedSnapshot | null;
  created_by: Types.ObjectId | string;
  updated_by: Types.ObjectId | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface TPageDocument extends Omit<TPage, "_id">, Document {
  _id: Types.ObjectId;
}

export type TPageActor = Readonly<{
  id: string;
  role: TRole;
  session_id: string;
}>;

export type TPageMutationContext = Readonly<{
  actor: TPageActor;
  request_id: string;
}>;

export type TPageAdminDto = Readonly<{
  id: string;
  route_key: TPageRouteKey;
  route_path: string;
  locale: "en";
  schema_version: 1;
  contract_version: 1;
  revision: number;
  draft: TPageDraftSnapshot;
  published: TPagePublishedSnapshot | null;
  updated_at: string;
}>;

export type TPageReferenceDomain =
  | "project"
  | "article"
  | "service"
  | "skill-group"
  | "timeline-entry"
  | "credential"
  | "faq"
  | "testimonial"
  | "legal-document";

export type TPublicPageReference = Readonly<{
  domain: TPageReferenceDomain;
  slug: string;
}>;

export type TPublicPageSection = Readonly<
  Omit<TPageSection, "source"> & {
    source:
      | { mode: "system" }
      | { mode: "curated"; references: readonly TPublicPageReference[] }
      | {
          mode: "automatic";
          filter: Readonly<Record<string, unknown>>;
        };
  }
>;

export type TPublicPageDto = Readonly<{
  route_key: TPageRouteKey;
  route_path: string;
  locale: "en";
  schema_version: 1;
  contract_version: 1;
  published_revision: number;
  published_at: string;
  seo: TPageSeoOverrides;
  sections: readonly TPublicPageSection[];
}>;
