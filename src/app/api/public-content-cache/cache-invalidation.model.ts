import {
  LEGACY_PUBLIC_CONTENT_DOMAINS,
  type TLegacyPublicContentDomain,
} from "@/lib/content/public-cache-tags";
import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type TPublicContentCacheInvalidationDocument = Document & {
  _id: Types.ObjectId;
  event_key: string;
  domain: TLegacyPublicContentDomain;
  tag: string;
  status: "pending" | "delivered";
  attempts: number;
  next_attempt_at: Date;
  delivered_at?: Date | null;
  last_error_code?: "framework_invalidation_failed" | null;
  created_at: Date;
  updated_at: Date;
};

const schema = new Schema<TPublicContentCacheInvalidationDocument>(
  {
    event_key: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 64,
      match: /^[0-9a-f-]{36}$/,
    },
    domain: {
      type: String,
      enum: LEGACY_PUBLIC_CONTENT_DOMAINS,
      required: true,
      immutable: true,
    },
    tag: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 96,
      match: /^portfolio:v1:[a-z0-9-]+$/,
    },
    status: {
      type: String,
      enum: ["pending", "delivered"],
      required: true,
      default: "pending",
    },
    attempts: { type: Number, min: 0, required: true, default: 0 },
    next_attempt_at: { type: Date, required: true, default: Date.now },
    delivered_at: { type: Date, default: null },
    last_error_code: {
      type: String,
      enum: ["framework_invalidation_failed", null],
      default: null,
    },
  },
  {
    collection: "public_content_cache_invalidations",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
  }
);

schema.index(
  { event_key: 1 },
  { unique: true, name: "public_content_cache_event_unique" }
);
schema.index(
  { status: 1, next_attempt_at: 1, created_at: 1 },
  { name: "public_content_cache_pending" }
);
schema.index(
  { delivered_at: 1 },
  {
    name: "public_content_cache_delivered_ttl",
    expireAfterSeconds: 7 * 24 * 60 * 60,
  }
);

const PublicContentCacheInvalidation =
  (mongoose.models
    .PublicContentCacheInvalidation as Model<TPublicContentCacheInvalidationDocument>) ||
  mongoose.model<TPublicContentCacheInvalidationDocument>(
    "PublicContentCacheInvalidation",
    schema
  );

export default PublicContentCacheInvalidation;
