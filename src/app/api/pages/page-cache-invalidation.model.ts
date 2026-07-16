import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import { PAGE_ROUTE_KEYS, type TPageRouteKey } from "./page.type";

export type TPageCacheInvalidationDocument = Document & {
  _id: Types.ObjectId;
  page: Types.ObjectId;
  revision: number;
  route_key: TPageRouteKey;
  correlation_id: string;
  status: "pending" | "delivered";
  attempts: number;
  next_attempt_at: Date;
  delivered_at?: Date | null;
  last_error_code?: "framework_invalidation_failed" | null;
  created_at: Date;
  updated_at: Date;
};

const schema = new Schema<TPageCacheInvalidationDocument>(
  {
    page: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: true,
      immutable: true,
    },
    revision: {
      type: Number,
      min: 1,
      max: 1_000_000_000,
      required: true,
      immutable: true,
    },
    route_key: {
      type: String,
      enum: PAGE_ROUTE_KEYS,
      required: true,
      immutable: true,
      maxlength: 32,
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
      required: true,
      default: "pending",
    },
    attempts: { type: Number, min: 0, default: 0, required: true },
    next_attempt_at: { type: Date, default: Date.now, required: true },
    delivered_at: { type: Date, default: null },
    last_error_code: {
      type: String,
      enum: ["framework_invalidation_failed", null],
      default: null,
    },
  },
  {
    collection: "page_cache_invalidations",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
  }
);

schema.index(
  { page: 1, revision: 1 },
  { unique: true, name: "page_cache_revision_unique" }
);
schema.index(
  { status: 1, next_attempt_at: 1, created_at: 1 },
  { name: "page_cache_pending_delivery" }
);
schema.index(
  { delivered_at: 1 },
  {
    name: "page_cache_delivered_ttl",
    expireAfterSeconds: 7 * 24 * 60 * 60,
  }
);

const PageCacheInvalidation =
  (mongoose.models
    .PageCacheInvalidation as Model<TPageCacheInvalidationDocument>) ||
  mongoose.model<TPageCacheInvalidationDocument>(
    "PageCacheInvalidation",
    schema
  );

export default PageCacheInvalidation;
