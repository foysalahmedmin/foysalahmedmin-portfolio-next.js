import type { TRole } from "@/types/jsonwebtoken.type";

export const AUDIT_SCHEMA_VERSION = 1 as const;
export const AUDIT_RETENTION_DAYS = 365;

export const AUDIT_ACTIONS = [
  "contact.submitted",
  "contact.anonymized",
  "contact.status.changed",
  "contact.delivery.retried",
  "contact.deleted",
  "contact.restored",
  "contact.permanently_deleted",
  "contact.exported",
  "contact.retention_hold.changed",
  "content.created",
  "content.updated",
  "content.published",
  "content.unpublished",
  "content.archived",
  "content.deleted",
  "content.restored",
  "content.permanently_deleted",
  "site.settings.updated",
  "page.created",
  "page.draft.updated",
  "page.published",
  "page.preview.created",
  "user.role.changed",
  "user.status.changed",
  "session.revoked",
  "session.revoked_all",
  "auth.signin.failed",
  "auth.mfa.enrolled",
  "auth.mfa.failed",
  "auth.mfa.reset",
  "auth.mfa.verified",
  "auth.mfa.recovery_used",
  "auth.refresh.reuse_detected",
  "file.permanently_deleted",
  "migration.executed",
  "legacy.imported",
] as const;

export type TAuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTOR_TYPES = [
  "anonymous",
  "user",
  "system",
  "migration",
] as const;
export type TAuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_TARGET_TYPES = [
  "contact",
  "article",
  "project",
  "article-category",
  "project-category",
  "service",
  "skill-group",
  "skill",
  "timeline-entry",
  "credential",
  "faq",
  "testimonial",
  "legal-document",
  "site",
  "page",
  "user",
  "session",
  "file",
  "migration",
  "legacy",
] as const;
export type TAuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export const AUDIT_OUTCOMES = ["success", "failure", "denied"] as const;
export type TAuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_SOURCES = ["admin", "api", "migration", "job"] as const;
export type TAuditSource = (typeof AUDIT_SOURCES)[number];

export const AUDIT_METADATA_KEYS = [
  "http_method",
  "request_channel",
  "content_type",
  "previous_state",
  "next_state",
  "previous_role",
  "next_role",
  "storage_provider",
  "security_signal",
  "migration_id",
  "result_count",
  "batch_size",
  "transactional",
  "held_count",
  "purged_count",
] as const;

export type TAuditMetadata = Partial<{
  http_method: string;
  request_channel: string;
  content_type: string;
  previous_state: string;
  next_state: string;
  previous_role: TRole | "redacted";
  next_role: TRole | "redacted";
  storage_provider: "cloudinary" | "gcp" | "local" | "redacted";
  security_signal: string;
  migration_id: string;
  result_count: number;
  batch_size: number;
  transactional: boolean;
  held_count: number;
  purged_count: number;
}>;

export type TAuditActorInput = Readonly<{
  type: TAuditActorType;
  id?: string;
  role?: TRole;
  session_id?: string;
}>;

export type TAuditTargetInput = Readonly<{
  type: TAuditTargetType;
  id: string;
  revision?: number;
}>;

export type TAppendAuditEventInput = Readonly<{
  action: TAuditAction;
  actor: TAuditActorInput;
  target: TAuditTargetInput;
  source: TAuditSource;
  outcome?: TAuditOutcome;
  summary_code: string;
  changed_fields?: readonly string[];
  reason_code?: string;
  metadata?: Readonly<Record<string, unknown>>;
  correlation_id?: string;
  correlation_hash?: string;
}>;

export type TAuditEventQuery = Readonly<{
  page: number;
  limit: number;
  from: Date;
  to: Date;
  action?: TAuditAction;
  actor_type?: TAuditActorType;
  actor_id?: string;
  target_type?: TAuditTargetType;
  target_id?: string;
  outcome?: TAuditOutcome;
  source?: TAuditSource;
  correlation_id?: string;
}>;

export type TAuditEventView = Readonly<{
  event_id: string;
  schema_version: typeof AUDIT_SCHEMA_VERSION;
  action: TAuditAction;
  actor: {
    type: TAuditActorType;
    id?: string;
    role?: TRole;
  };
  target: {
    type: TAuditTargetType;
    id: string;
    revision?: number;
  };
  outcome: TAuditOutcome;
  source: TAuditSource;
  summary_code: string;
  changed_fields: string[];
  reason_code?: string;
  metadata: TAuditMetadata;
  correlation_hash?: string;
  created_at: Date;
  retain_until: Date;
}>;
