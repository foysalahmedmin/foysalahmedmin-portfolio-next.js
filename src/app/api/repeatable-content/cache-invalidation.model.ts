import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import {
  REPEATABLE_CONTENT_DOMAINS,
  type TRepeatableContentDomain,
} from "./record.type";

export type TRepeatableCacheInvalidationDocument = Document & {
  _id: Types.ObjectId;
  domain: TRepeatableContentDomain;
  target: Types.ObjectId;
  target_version: number;
  tag: string;
  status: "pending" | "delivered";
  attempts: number;
  next_attempt_at: Date;
  delivered_at?: Date | null;
  last_error_code?: "framework_invalidation_failed" | null;
  created_at: Date;
  updated_at: Date;
};

const schema = new Schema<TRepeatableCacheInvalidationDocument>(
  {
    domain: { type: String, enum: REPEATABLE_CONTENT_DOMAINS, required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    target_version: {
      type: Number,
      min: 1,
      max: 1_000_000_000,
      required: true,
    },
    tag: {
      type: String,
      required: true,
      maxlength: 128,
      match: /^portfolio:v1:[a-z0-9-]+$/,
    },
    status: {
      type: String,
      enum: ["pending", "delivered"],
      default: "pending",
    },
    attempts: { type: Number, min: 0, max: 100, default: 0 },
    next_attempt_at: { type: Date, required: true, default: Date.now },
    delivered_at: { type: Date, default: null },
    last_error_code: {
      type: String,
      enum: ["framework_invalidation_failed", null],
      default: null,
    },
  },
  {
    collection: "repeatable_cache_invalidations",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
  }
);

schema.index(
  { domain: 1, target: 1, target_version: 1 },
  { unique: true, name: "repeatable_cache_target_version_unique" }
);
schema.index(
  { status: 1, next_attempt_at: 1, created_at: 1 },
  { name: "repeatable_cache_retry_lease" }
);
schema.index(
  { delivered_at: 1 },
  {
    name: "repeatable_cache_delivered_ttl",
    expireAfterSeconds: 7 * 24 * 60 * 60,
  }
);

const RepeatableCacheInvalidation =
  (mongoose.models
    .RepeatableCacheInvalidation as Model<TRepeatableCacheInvalidationDocument>) ||
  mongoose.model<TRepeatableCacheInvalidationDocument>(
    "RepeatableCacheInvalidation",
    schema
  );

export default RepeatableCacheInvalidation;
