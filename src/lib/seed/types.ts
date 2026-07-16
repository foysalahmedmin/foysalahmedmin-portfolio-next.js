import type {
  ClientSession,
  Db,
  Document,
  MongoClient,
  ObjectId,
  WithId,
} from "mongodb";

export const SEED_STAGE_ORDER = [
  "admin",
  "media",
  "site",
  "categories",
  "repeatables",
  "projects_resources",
  "articles",
  "pages",
] as const;

export type SeedStage = (typeof SEED_STAGE_ORDER)[number];
export type SeedMode = "foundation" | "demo";
export type SeedEnvironment = "development" | "test" | "production";

export const SEED_ALLOWED_TARGET_COLLECTIONS = [
  "seed_media_intents",
  "sites",
  "article_categories",
  "project_categories",
  "services",
  "skill_groups",
  "skills",
  "timeline_entries",
  "credentials",
  "faqs",
  "testimonials",
  "legal_documents",
  "projects",
  "project_resources",
  "articles",
  "pages",
] as const;

export type SeedTargetCollection =
  (typeof SEED_ALLOWED_TARGET_COLLECTIONS)[number];

export type SeedTruthMarker = Readonly<{
  content_tier: "foundation" | "demo";
  truth_status: "verified_by_code" | "pending_owner_verification" | "derived";
  publication_policy:
    | "draft_only"
    | "non_production_only"
    | "eligible_after_review";
  synthetic: boolean;
}>;

export type SeedFileReference = Readonly<{
  file_id: string;
  field: string;
  purposes: readonly string[];
}>;

export type SeedMediaBinding = Readonly<{
  media_key: string;
  field_path: string;
  required: boolean;
  purposes: readonly string[];
}>;

export type PendingSeedMediaSource = Readonly<{
  kind: "pending_generated";
  requirement: string;
}>;

export type RepositorySeedMediaSource = Readonly<{
  kind: "repository_file";
  relative_path: string;
  source_sha256: string;
}>;

export type SeedMediaRequest = Readonly<{
  media_key: string;
  purpose: string;
  source: PendingSeedMediaSource | RepositorySeedMediaSource;
  metadata: Readonly<{
    name: string;
    source: "generated" | "uploaded";
    alt_text?: string;
    is_decorative?: boolean;
    provenance_key?: string;
  }>;
}>;

export type SeedRecordDefinition = Readonly<{
  stage: SeedStage;
  collection: SeedTargetCollection;
  seed_key: string;
  seed_version: number;
  lookup: Readonly<Document>;
  payload: Readonly<Document>;
  insert_only?: Readonly<Document>;
  update_only?: Readonly<Document>;
  truth: SeedTruthMarker;
  media_bindings?: readonly SeedMediaBinding[];
  file_references?: readonly SeedFileReference[];
  validate: (document: Readonly<Document>) => void;
}>;

export type SeedManifest = Readonly<{
  manifest_key: string;
  seed_version: number;
  mode: SeedMode;
  description: string;
  truth: SeedTruthMarker;
  media: readonly SeedMediaRequest[];
  records: readonly SeedRecordDefinition[];
}>;

export type SeedRecordMetadata = Readonly<{
  _id: string;
  manifest_key: string;
  target_collection: SeedTargetCollection;
  target_id: ObjectId;
  seed_key: string;
  seed_version: number;
  last_seed_hash: string;
  controlled_fields: readonly string[];
  truth: SeedTruthMarker;
  applied_at: Date;
}>;

export type SeedPlanAction =
  | "create"
  | "update"
  | "adopt"
  | "unchanged"
  | "conflict";

export type SeedRecordPlan = Readonly<{
  definition: SeedRecordDefinition;
  action: SeedPlanAction;
  reason:
    | "target_missing"
    | "seed_changed"
    | "matching_unmanaged_target"
    | "already_current"
    | "edited_target"
    | "unmanaged_target"
    | "managed_target_missing"
    | "target_identity_mismatch"
    | "seed_checksum_drift"
    | "seed_version_downgrade";
  desired_hash: string;
  current_hash?: string;
  changed_fields: readonly string[];
  target?: WithId<Document>;
  metadata?: SeedRecordMetadata;
}>;

export type SeedPlan = Readonly<{
  manifest_key: string;
  seed_version: number;
  checksum: string;
  media: readonly SeedMediaPlan[];
  records: readonly SeedRecordPlan[];
  counts: Readonly<Record<SeedPlanAction, number>>;
}>;

export type SeedMediaPlan = Readonly<{
  media_key: string;
  action: "pending_source" | "existing" | "would_create" | "created";
  file_id?: string;
  created_by_run?: boolean;
  source_sha256?: string;
}>;

export type SeedMediaGateway = Readonly<{
  inspect: (request: SeedMediaRequest) => Promise<SeedMediaPlan>;
  stage: (request: SeedMediaRequest) => Promise<SeedMediaPlan>;
  compensate: (item: SeedMediaPlan) => Promise<void>;
  validateReferences: (
    references: readonly SeedFileReference[],
    session: ClientSession
  ) => Promise<void>;
}>;

export type SeedRunOptions = Readonly<{
  client: MongoClient;
  db: Db;
  manifest: SeedManifest;
  environment: SeedEnvironment;
  dry_run: boolean;
  force: boolean;
  production_confirmation?: string;
  media_gateway?: SeedMediaGateway;
  now?: () => Date;
}>;

export type SeedActor = Readonly<{
  _id: ObjectId;
  role: "super-admin";
}>;
