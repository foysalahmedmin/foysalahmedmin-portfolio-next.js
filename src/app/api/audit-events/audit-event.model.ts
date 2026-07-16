import { randomUUID } from "node:crypto";
import {
  assertAuditActionTarget,
  assertSafeAuditCode,
  assertSafeAuditTargetId,
  getAuditRetentionDate,
  normalizeAuditHash,
  sanitizeAuditMetadata,
  sanitizeChangedFields,
} from "./audit-event.policy";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  AUDIT_SCHEMA_VERSION,
  AUDIT_SOURCES,
  AUDIT_TARGET_TYPES,
  type TAuditAction,
  type TAuditActorType,
  type TAuditMetadata,
  type TAuditOutcome,
  type TAuditSource,
  type TAuditTargetType,
} from "./audit-event.type";
import mongoose, {
  Schema,
  type ClientSession,
  type Document,
  type Model,
  type Query,
  type Types,
} from "mongoose";

const AUDIT_ROLES = [
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
  "subscriber",
  "user",
] as const;

export type TAuditEventDocument = Document & {
  _id: Types.ObjectId;
  event_id: string;
  schema_version: typeof AUDIT_SCHEMA_VERSION;
  action: TAuditAction;
  actor_type: TAuditActorType;
  actor_id?: string;
  actor_role?: (typeof AUDIT_ROLES)[number];
  session_hash?: string;
  target_type: TAuditTargetType;
  target_id: string;
  target_revision?: number;
  outcome: TAuditOutcome;
  source: TAuditSource;
  summary_code: string;
  changed_fields: string[];
  reason_code?: string;
  metadata: TAuditMetadata;
  correlation_hash?: string;
  retain_until: Date;
  created_at: Date;
  /** Temporary compatibility fields for contact intake and its rollback path. */
  entity_type?: "contact";
  entity_id?: Types.ObjectId;
};

const auditMetadataSchema = new Schema<TAuditMetadata>(
  {
    http_method: { type: String, maxlength: 16 },
    request_channel: { type: String, maxlength: 32 },
    content_type: { type: String, maxlength: 64 },
    previous_state: { type: String, maxlength: 64 },
    next_state: { type: String, maxlength: 64 },
    previous_role: { type: String, maxlength: 32 },
    next_role: { type: String, maxlength: 32 },
    storage_provider: { type: String, maxlength: 32 },
    security_signal: { type: String, maxlength: 64 },
    migration_id: { type: String, maxlength: 64 },
    result_count: { type: Number, min: 0, max: 1_000_000 },
    batch_size: { type: Number, min: 0, max: 1_000_000 },
    transactional: { type: Boolean },
    held_count: { type: Number, min: 0, max: 1_000_000 },
    purged_count: { type: Number, min: 0, max: 1_000_000 },
  },
  { _id: false, id: false, strict: "throw" }
);

const auditEventSchema = new Schema<TAuditEventDocument>(
  {
    event_id: {
      type: String,
      default: () => randomUUID(),
      required: true,
      immutable: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    },
    schema_version: {
      type: Number,
      default: AUDIT_SCHEMA_VERSION,
      enum: [AUDIT_SCHEMA_VERSION],
      required: true,
      immutable: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      immutable: true,
    },
    actor_type: {
      type: String,
      enum: AUDIT_ACTOR_TYPES,
      required: true,
      immutable: true,
    },
    actor_id: {
      type: String,
      immutable: true,
      match: /^[0-9a-f]{24}$/,
    },
    actor_role: {
      type: String,
      enum: AUDIT_ROLES,
      immutable: true,
    },
    session_hash: {
      type: String,
      match: /^[a-f0-9]{64}$/,
      immutable: true,
      select: false,
    },
    target_type: {
      type: String,
      enum: AUDIT_TARGET_TYPES,
      required: true,
      immutable: true,
    },
    target_id: {
      type: String,
      required: true,
      maxlength: 128,
      immutable: true,
    },
    target_revision: {
      type: Number,
      min: 0,
      max: 1_000_000_000,
      validate: Number.isSafeInteger,
      immutable: true,
    },
    outcome: {
      type: String,
      enum: AUDIT_OUTCOMES,
      default: "success",
      required: true,
      immutable: true,
    },
    source: {
      type: String,
      enum: AUDIT_SOURCES,
      required: true,
      immutable: true,
    },
    summary_code: {
      type: String,
      required: true,
      maxlength: 64,
      immutable: true,
    },
    changed_fields: {
      type: [String],
      default: [],
      immutable: true,
    },
    reason_code: {
      type: String,
      maxlength: 64,
      immutable: true,
    },
    metadata: {
      type: auditMetadataSchema,
      default: {},
      immutable: true,
    },
    correlation_hash: {
      type: String,
      match: /^[a-f0-9]{64}$/,
      immutable: true,
    },
    retain_until: {
      type: Date,
      default: () => getAuditRetentionDate(),
      required: true,
      immutable: true,
      validate: {
        validator: (value: Date) => {
          const retentionMs = value.getTime() - Date.now();
          return (
            retentionMs >= 364 * 24 * 60 * 60 * 1_000 &&
            retentionMs <= 366 * 24 * 60 * 60 * 1_000
          );
        },
        message: "Audit retention must use the fixed online retention policy",
      },
    },
    entity_type: {
      type: String,
      enum: ["contact"],
      immutable: true,
    },
    entity_id: {
      type: Schema.Types.ObjectId,
      immutable: true,
      index: true,
    },
  },
  {
    collection: "audit_events",
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
    strict: "throw",
  }
);

auditEventSchema.pre("validate", function normalizeAndValidateAuditEvent() {
  if (!this.target_type && this.entity_type) {
    this.target_type = this.entity_type;
  }
  if (!this.target_id && this.entity_id) {
    this.target_id = this.entity_id.toString();
  }
  if (
    this.target_type === "contact" &&
    /^[0-9a-f]{24}$/i.test(this.target_id) &&
    !this.entity_id
  ) {
    this.entity_type = "contact";
    this.entity_id = new mongoose.Types.ObjectId(this.target_id);
  }
  if (!this.summary_code && this.action) {
    this.summary_code = this.action.replaceAll(".", "_");
  }
  if (!this.source) {
    this.source =
      this.action === "contact.anonymized"
        ? "job"
        : this.actor_type === "migration"
          ? "migration"
          : "api";
  }
  if (this.actor_type === "user") {
    if (!this.actor_id || !this.actor_role) {
      throw new Error("User audit actors require an ID and role snapshot");
    }
  } else if (this.actor_id || this.actor_role || this.session_hash) {
    throw new Error(
      "Non-user audit actors cannot contain user identity fields"
    );
  }

  assertAuditActionTarget(this.action, this.target_type);
  this.target_id = assertSafeAuditTargetId(this.target_id);
  this.summary_code = assertSafeAuditCode(this.summary_code, "audit summary");
  if (this.reason_code) {
    this.reason_code = assertSafeAuditCode(this.reason_code, "audit reason");
  }
  this.changed_fields = sanitizeChangedFields(this.changed_fields);
  this.metadata = sanitizeAuditMetadata(this.metadata);
  this.correlation_hash = normalizeAuditHash(this.correlation_hash);
});

auditEventSchema.pre("save", function rejectExistingDocumentSave() {
  if (!this.isNew) {
    throw new Error("Audit events are append-only");
  }
});

type GuardedAuditQuery = Query<unknown, TAuditEventDocument>;
const allowedCompensationQueries = new WeakSet<object>();

const rejectAuditMutation = function rejectAuditMutation(
  this: GuardedAuditQuery
) {
  if (!allowedCompensationQueries.has(this)) {
    throw new Error("Audit events are append-only");
  }
};

for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const) {
  auditEventSchema.pre(operation, rejectAuditMutation);
}

auditEventSchema.pre(
  "deleteOne",
  { document: true, query: false },
  function rejectAuditDocumentDeletion() {
    throw new Error("Audit events are append-only");
  }
);
auditEventSchema.pre("bulkWrite", function rejectAuditBulkWrite() {
  throw new Error("Audit events are append-only");
});
auditEventSchema.pre("insertMany", function rejectAuditInsertMany() {
  throw new Error("Audit events must be appended through the audit service");
});

auditEventSchema.index({ event_id: 1 }, { unique: true, name: "event_id_1" });
auditEventSchema.index(
  { created_at: -1, _id: -1 },
  { name: "audit_created_at_desc" }
);
auditEventSchema.index({ action: 1, created_at: -1 });
auditEventSchema.index(
  { target_type: 1, target_id: 1, created_at: -1 },
  { name: "audit_target_timeline" }
);
auditEventSchema.index(
  { actor_type: 1, actor_id: 1, created_at: -1 },
  { name: "audit_actor_timeline" }
);
auditEventSchema.index(
  { retain_until: 1 },
  { expireAfterSeconds: 0, name: "audit_retention_ttl" }
);

const AuditEvent =
  (mongoose.models.AuditEvent as Model<TAuditEventDocument>) ||
  mongoose.model<TAuditEventDocument>("AuditEvent", auditEventSchema);

export const deleteCompensatedContactAuditEvents = async (input: {
  contact_id: Types.ObjectId | string;
  session?: ClientSession;
}) => {
  const targetId = input.contact_id.toString();
  const query = AuditEvent.deleteMany({
    action: "contact.submitted",
    target_type: "contact",
    target_id: targetId,
    entity_type: "contact",
    entity_id: input.contact_id,
  });
  if (input.session) query.session(input.session);
  allowedCompensationQueries.add(query);
  return await query;
};

export default AuditEvent;
