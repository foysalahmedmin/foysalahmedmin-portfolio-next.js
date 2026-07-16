import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type TSiteCacheInvalidationDocument = Document & {
  _id: Types.ObjectId;
  site: Types.ObjectId;
  revision: number;
  correlation_id: string;
  status: "pending" | "delivered";
  attempts: number;
  next_attempt_at: Date;
  delivered_at?: Date | null;
  last_error_code?: "framework_invalidation_failed" | null;
  created_at: Date;
  updated_at: Date;
};

const siteCacheInvalidationSchema = new Schema<TSiteCacheInvalidationDocument>(
  {
    site: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      immutable: true,
    },
    revision: {
      type: Number,
      min: 1,
      max: 1_000_000_000,
      required: true,
      immutable: true,
      validate: Number.isSafeInteger,
    },
    correlation_id: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 128,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
    },
    status: {
      type: String,
      enum: ["pending", "delivered"],
      default: "pending",
      required: true,
    },
    attempts: { type: Number, default: 0, min: 0, required: true },
    next_attempt_at: { type: Date, default: Date.now, required: true },
    delivered_at: { type: Date, default: null },
    last_error_code: {
      type: String,
      enum: ["framework_invalidation_failed", null],
      default: null,
    },
  },
  {
    collection: "site_cache_invalidations",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
  }
);

siteCacheInvalidationSchema.index(
  { site: 1, revision: 1 },
  { unique: true, name: "site_cache_revision_unique" }
);
siteCacheInvalidationSchema.index(
  { status: 1, next_attempt_at: 1, created_at: 1 },
  { name: "site_cache_pending_delivery" }
);
siteCacheInvalidationSchema.index(
  { delivered_at: 1 },
  {
    name: "site_cache_delivered_ttl",
    expireAfterSeconds: 7 * 24 * 60 * 60,
  }
);

const SiteCacheInvalidation =
  (mongoose.models
    .SiteCacheInvalidation as Model<TSiteCacheInvalidationDocument>) ||
  mongoose.model<TSiteCacheInvalidationDocument>(
    "SiteCacheInvalidation",
    siteCacheInvalidationSchema
  );

export default SiteCacheInvalidation;
