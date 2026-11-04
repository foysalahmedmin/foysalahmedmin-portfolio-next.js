import type {
  PillarAccent,
  PillarIconKey,
  PillarKey,
} from "@/lib/content/pillars";
import type { Document, Types } from "mongoose";

export const SITE_KEY = "primary" as const;
export const SITE_SCHEMA_VERSION = 1 as const;
export const SITE_SNAPSHOT_MAX_BYTES = 256 * 1024;

export type TSiteLinkKind =
  | "internal"
  | "external"
  | "email"
  | "phone"
  | "resume";

export type TSiteLink = {
  key: string;
  label: string;
  kind: TSiteLinkKind;
  href?: string;
  enabled: boolean;
  open_in_new_tab?: boolean;
};

export type TSiteSocialLink = {
  key: string;
  platform:
    | "github"
    | "linkedin"
    | "x"
    | "youtube"
    | "facebook"
    | "instagram"
    | "other";
  label: string;
  url: string;
  enabled: boolean;
};

export type TSitePillar = {
  key: PillarKey;
  label: string;
  order: number;
  enabled: boolean;
  headline?: string;
  summary?: string;
  client_outcome?: string;
  capabilities: string[];
  technologies: string[];
  cta?: TSiteLink;
  icon_key: PillarIconKey;
  accent: PillarAccent;
  fallback_visual_key: string;
  visual_file?: string;
  /** @deprecated Optional compatibility assertion; the File is authoritative. */
  visual_alt_text?: string;
  /** @deprecated Optional compatibility assertion; the File is authoritative. */
  visual_is_decorative?: boolean;
  seo_summary?: string;
};

export type TSiteIdentity = {
  public_name?: string;
  short_name?: string;
  canonical_url?: string;
  locale: "en";
  timezone?: string;
};

export type TSitePositioning = {
  canonical?: string;
  /** The page `h1`: the problem-first headline (the long forms stay below it). */
  headline?: string;
  compact?: string;
  mobile?: string;
  long?: string;
  short_bio?: string;
  long_bio?: string;
  client_promise?: string;
};

export type TSiteBrand = {
  logo_light_file?: string;
  logo_dark_file?: string;
  favicon_file?: string;
  profile_file?: string;
  resume_file?: string;
};

export type TSiteContact = {
  public_email?: string;
  email_visibility: "hidden" | "public";
  public_phone?: string;
  phone_visibility: "hidden" | "public";
  location?: string;
  availability: "unknown" | "available" | "limited" | "unavailable";
  availability_label?: string;
  availability_review_at?: string;
  response_promise?: string;
  working_hours?: string;
  map_policy: "hidden" | "city_only";
};

export type TSiteNavigation = {
  header: TSiteLink[];
  footer: TSiteLink[];
  legal: TSiteLink[];
};

export type TSiteFooter = {
  tagline?: string;
  copyright_name?: string;
  legal_notice?: string;
};

export type TSiteSeo = {
  default_title?: string;
  title_template?: string;
  default_description?: string;
  canonical_url?: string;
  default_og_file?: string;
  allow_indexing: boolean;
  verification?: {
    google?: string;
    bing?: string;
  };
};

export type TSiteExperienceDefaults = {
  theme: "system" | "light" | "dark";
  motion: "full" | "reduced" | "off";
  accent: PillarAccent;
  feature_flags: {
    show_availability: boolean;
    show_metrics: boolean;
    show_testimonials: boolean;
  };
};

export type TSiteFallbacks = {
  emergency_visual_key: "abstract-grid-v1";
  /** Legacy generic fallback retained for snapshots and clients without a pillar. */
  project_file?: string;
  project_files_by_pillar: Partial<Record<PillarKey, string>>;
  /** Legacy generic fallback retained for snapshots and clients without a pillar. */
  article_file?: string;
  article_files_by_pillar: Partial<Record<PillarKey, string>>;
  profile_file?: string;
};

export type TSiteProcessStep = {
  key: string;
  title: string;
  summary?: string;
  deliverable?: string;
  enabled: boolean;
};

export type TSiteVerification = "unverified" | "derived" | "verified";

export type TSiteMetric = {
  key: string;
  label: string;
  value?: string;
  verification: TSiteVerification;
  enabled: boolean;
  /** Case study slug the value is derived from. */
  source_slug?: string;
  /** `YYYY-MM-DD` the value was measured; a value older than the freshness window is not shown. */
  as_of?: string;
};

export type TSiteEngagementModel = {
  key: string;
  name: string;
  best_when?: string;
  you_get: string[];
  how_it_runs?: string;
  duration_label?: string;
  /** Shown only when `verification` is `verified`. */
  price_label?: string;
  verification: TSiteVerification;
  enabled: boolean;
};

/** A titled statement with one line of elaboration: commitments and "how I think" principles. */
export type TSiteCommitment = {
  key: string;
  title: string;
  summary: string;
  enabled: boolean;
};

export const SITE_WORKFLOW_NODE_KINDS = [
  "input",
  "automation",
  "agent",
  "review",
  "output",
] as const;
export type TSiteWorkflowNodeKind = (typeof SITE_WORKFLOW_NODE_KINDS)[number];

export type TSiteWorkflowExample = {
  title: string;
  caption: string;
  illustrative: true;
  nodes: {
    key: string;
    kind: TSiteWorkflowNodeKind;
    label: string;
    summary: string;
    on_failure?: string;
  }[];
  switch_off?: string;
};

export const SITE_DELIVERABLE_KINDS = [
  "decision_record",
  "diagram",
  "runbook",
  "report",
  "dry_run",
] as const;
export type TSiteDeliverableKind = (typeof SITE_DELIVERABLE_KINDS)[number];

export type TSiteDeliverableSample = {
  key: string;
  title: string;
  kind: TSiteDeliverableKind;
  /** Plain text, escaped at render. */
  excerpt: string;
  source_label: string;
  source_slug?: string;
  verification: TSiteVerification;
  enabled: boolean;
};

export type TSiteNextStep = {
  key: string;
  title: string;
  summary: string;
  enabled: boolean;
};

export type TSiteFit = {
  enabled: boolean;
  segments: { key: string; label: string; for_you_if: string }[];
  not_a_fit: string[];
};

export type TSiteFinder = {
  enabled: boolean;
  steps: {
    key: string;
    question: string;
    options: { key: string; label: string; tags: string[] }[];
  }[];
  outcomes: {
    engagement_key: string;
    when_tags: string[];
    reasoning: string;
  }[];
};

export type TSiteDraftSnapshot = {
  identity: TSiteIdentity;
  positioning: TSitePositioning;
  pillars: TSitePillar[];
  brand: TSiteBrand;
  contact: TSiteContact;
  navigation: TSiteNavigation;
  social_links: TSiteSocialLink[];
  primary_ctas: TSiteLink[];
  footer: TSiteFooter;
  seo: TSiteSeo;
  experience: TSiteExperienceDefaults;
  fallbacks: TSiteFallbacks;
  process: TSiteProcessStep[];
  metrics: TSiteMetric[];
  engagement_models: TSiteEngagementModel[];
  commitments: TSiteCommitment[];
  workflow_example?: TSiteWorkflowExample;
  deliverable_samples: TSiteDeliverableSample[];
  next_steps: TSiteNextStep[];
  fit: TSiteFit;
  principles: TSiteCommitment[];
  finder: TSiteFinder;
};

export type TSitePublishedSnapshot = TSiteDraftSnapshot & {
  revision: number;
  published_at: Date | string;
  published_by: string;
};

export type TSite = {
  _id: Types.ObjectId;
  site_key: typeof SITE_KEY;
  schema_version: typeof SITE_SCHEMA_VERSION;
  contract_version: 1;
  revision: number;
  draft: TSiteDraftSnapshot;
  published?: TSitePublishedSnapshot | null;
  created_by: Types.ObjectId | string;
  updated_by: Types.ObjectId | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface TSiteDocument extends TSite, Document {
  _id: Types.ObjectId;
}

export type TSiteAdminDto = {
  site_key: typeof SITE_KEY;
  schema_version: typeof SITE_SCHEMA_VERSION;
  contract_version: 1;
  revision: number;
  draft: TSiteDraftSnapshot;
  published: TSitePublishedSnapshot | null;
  updated_at: string;
};

export type TPublicSiteMediaDto = {
  id: string;
  url: string;
  alt_text?: string;
  is_decorative?: boolean;
  width?: number;
  height?: number;
  focal_point?: { x: number; y: number };
  dominant_color?: string;
  blur_data_url?: string;
};

export type TPublicSitePillarDto = Omit<
  TSitePillar,
  "visual_file" | "visual_alt_text" | "visual_is_decorative"
> & {
  visual?: TPublicSiteMediaDto;
};

export type TPublicSiteFallbacksDto = {
  emergency_visual_key: "abstract-grid-v1";
  project?: TPublicSiteMediaDto;
  project_by_pillar: Partial<Record<PillarKey, TPublicSiteMediaDto>>;
  article?: TPublicSiteMediaDto;
  article_by_pillar: Partial<Record<PillarKey, TPublicSiteMediaDto>>;
  profile?: TPublicSiteMediaDto;
};

export type TPublicSiteDto = {
  content_source: "published" | "emergency";
  site_key: typeof SITE_KEY;
  schema_version: typeof SITE_SCHEMA_VERSION;
  contract_version: 1;
  published_revision?: number;
  published_at?: string;
  identity: TSiteIdentity;
  positioning: TSitePositioning;
  pillars: TPublicSitePillarDto[];
  brand: {
    logo_light?: TPublicSiteMediaDto;
    logo_dark?: TPublicSiteMediaDto;
    favicon?: TPublicSiteMediaDto;
    profile?: TPublicSiteMediaDto;
    resume?: TPublicSiteMediaDto;
  };
  contact: Pick<
    TSiteContact,
    | "location"
    | "availability"
    | "availability_label"
    | "response_promise"
    | "working_hours"
    | "map_policy"
  > & {
    public_email?: string;
    public_phone?: string;
  };
  navigation: TSiteNavigation;
  social_links: TSiteSocialLink[];
  primary_ctas: TSiteLink[];
  footer: TSiteFooter;
  seo: Omit<TSiteSeo, "verification" | "default_og_file"> & {
    default_og?: TPublicSiteMediaDto;
  };
  experience: TSiteExperienceDefaults;
  fallbacks: TPublicSiteFallbacksDto;
  process: TSiteProcessStep[];
  metrics: TSiteMetric[];
  engagement_models: TSiteEngagementModel[];
  commitments: TSiteCommitment[];
  workflow_example?: TSiteWorkflowExample;
  deliverable_samples: TSiteDeliverableSample[];
  next_steps: TSiteNextStep[];
  fit?: TSiteFit;
  principles: TSiteCommitment[];
  finder?: TSiteFinder;
};

export type TSiteFileReferenceDescriptor = {
  id: string;
  field: string;
  purposes: readonly (
    | "logo"
    | "hero"
    | "social"
    | "profile"
    | "resume"
    | "project"
    | "article"
  )[];
};
