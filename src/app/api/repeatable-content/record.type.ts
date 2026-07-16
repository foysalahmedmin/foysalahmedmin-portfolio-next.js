import type { PillarKey } from "@/lib/content/pillars";
import type { SoftDeleteScope } from "@/lib/db/soft-delete";
import type { TFilePurpose, TFileReferenceModel } from "../files/file.type";
import type { ClientSession, Model, Types } from "mongoose";
import type { z } from "zod";

export const REPEATABLE_CONTENT_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export type TRepeatableContentStatus =
  (typeof REPEATABLE_CONTENT_STATUSES)[number];

export const CLAIM_VERIFICATION_STATES = [
  "unverified",
  "derived",
  "verified",
  "not_applicable",
] as const;
export type TClaimVerificationState =
  (typeof CLAIM_VERIFICATION_STATES)[number];

export const REPEATABLE_CONTENT_DOMAINS = [
  "service",
  "skill-group",
  "skill",
  "timeline-entry",
  "credential",
  "faq",
  "testimonial",
  "legal-document",
] as const;
export type TRepeatableContentDomain =
  (typeof REPEATABLE_CONTENT_DOMAINS)[number];

export type TRepeatableRecord = {
  _id: Types.ObjectId | string;
  contract_version: 1;
  slug: string;
  locale: "en";
  title: string;
  summary?: string;
  primary_pillar?: PillarKey;
  secondary_pillars: PillarKey[];
  sequence: number;
  status: TRepeatableContentStatus;
  published_at?: Date | string | null;
  first_published_at?: Date | string | null;
  is_featured: boolean;
  enabled: boolean;
  claim_verification: TClaimVerificationState;
  version: number;
  created_by: Types.ObjectId | string;
  updated_by: Types.ObjectId | string;
  is_deleted: boolean;
  deleted_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  search_text?: string;
};

export type TPublicMediaDto = {
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

export type TPublicRepeatableBaseDto = {
  slug: string;
  locale: "en";
  title: string;
  summary?: string;
  primary_pillar?: PillarKey;
  secondary_pillars: PillarKey[];
  sequence: number;
  is_featured: boolean;
  published_at: string;
};

export type TAdminRepeatableBaseDto = Omit<
  TPublicRepeatableBaseDto,
  "published_at"
> & {
  id: string;
  status: TRepeatableContentStatus;
  enabled: boolean;
  claim_verification: TClaimVerificationState;
  version: number;
  published_at?: string;
  first_published_at?: string;
  created_by: string;
  updated_by: string;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
};

export type TRepeatableFilterRule = Readonly<{
  field: string;
  kind: "enum" | "boolean" | "object_id";
  values?: readonly string[];
  public?: boolean;
}>;

export type TRepeatableFileField = Readonly<{
  field: string;
  cardinality: "one" | "many";
  purposes: readonly TFilePurpose[];
  public: boolean;
}>;

export type TRepeatableListQuery = Readonly<{
  page: number;
  limit: number;
  search?: string;
  sort: string;
  direction: 1 | -1;
  filters: Readonly<Record<string, string | boolean>>;
  deleted_scope: SoftDeleteScope;
}>;

export type TRepeatableCompositionQuery = Readonly<{
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}>;

export type TRepeatableDefinition<
  TRecord extends TRepeatableRecord = TRepeatableRecord,
  TPublicDto = unknown,
  TAdminDto = unknown,
> = Readonly<{
  domain: TRepeatableContentDomain;
  plural: string;
  model_name: TFileReferenceModel;
  collection_name: string;
  cache_tag: string;
  model: Model<TRecord>;
  create_schema: z.ZodType<Record<string, unknown>>;
  update_schema: z.ZodType<Record<string, unknown>>;
  public_fields: readonly string[];
  public_filter?: Readonly<Record<string, unknown>>;
  is_public_record_eligible?: (
    record: Readonly<Record<string, unknown>>
  ) => boolean;
  search_fields: readonly string[];
  filter_rules: Readonly<Record<string, TRepeatableFilterRule>>;
  sort_fields: readonly string[];
  file_fields: readonly TRepeatableFileField[];
  public_populates?: readonly Readonly<{
    path: string;
    select: string;
    match: Readonly<Record<string, unknown>>;
  }>[];
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => string[];
  get_async_publish_issues?: (
    record: Readonly<Record<string, unknown>>,
    session?: ClientSession
  ) => Promise<string[]>;
  to_public_dto: (record: Readonly<Record<string, unknown>>) => TPublicDto;
  to_admin_dto: (record: Readonly<Record<string, unknown>>) => TAdminDto;
}>;

export type TRepeatableBulkOperation =
  | "publish"
  | "archive"
  | "soft_delete"
  | "restore"
  | "feature"
  | "unfeature";

export type TCacheInvalidationRef = Readonly<{
  id: string;
  tag: string;
}>;

export type TMutationResult<T> = Readonly<{
  data: T;
  invalidations: readonly TCacheInvalidationRef[];
}>;
