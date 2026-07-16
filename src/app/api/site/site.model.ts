import { PILLAR_CONTRACT_VERSION } from "@/lib/content/pillars";
import mongoose, { Schema, type Model } from "mongoose";
import {
  SITE_KEY,
  SITE_SCHEMA_VERSION,
  type TSiteDocument,
  type TSiteDraftSnapshot,
  type TSitePublishedSnapshot,
} from "./site.type";
import { siteDraftSnapshotSchema } from "./site.validation";

const validateDraft = (value: TSiteDraftSnapshot): boolean =>
  siteDraftSnapshotSchema.safeParse(value).success;

const validatePublished = (value: TSitePublishedSnapshot | null): boolean => {
  if (value === null) return true;
  const {
    revision,
    published_at: publishedAt,
    published_by: publishedBy,
    ...draft
  } = value;
  return (
    Number.isSafeInteger(revision) &&
    revision >= 1 &&
    revision <= 1_000_000_000 &&
    !Number.isNaN(new Date(publishedAt).getTime()) &&
    /^[a-f0-9]{24}$/i.test(String(publishedBy)) &&
    siteDraftSnapshotSchema.safeParse(draft).success
  );
};

const siteSchema = new Schema<TSiteDocument>(
  {
    site_key: {
      type: String,
      enum: [SITE_KEY],
      default: SITE_KEY,
      required: true,
      immutable: true,
    },
    schema_version: {
      type: Number,
      enum: [SITE_SCHEMA_VERSION],
      default: SITE_SCHEMA_VERSION,
      required: true,
      immutable: true,
    },
    contract_version: {
      type: Number,
      enum: [PILLAR_CONTRACT_VERSION],
      default: PILLAR_CONTRACT_VERSION,
      required: true,
      immutable: true,
    },
    revision: {
      type: Number,
      min: 1,
      max: 1_000_000_000,
      required: true,
      default: 1,
      validate: Number.isSafeInteger,
    },
    draft: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: validateDraft,
        message: "Site draft does not match the versioned contract",
      },
    },
    published: {
      type: Schema.Types.Mixed,
      default: null,
      validate: {
        validator: validatePublished,
        message: "Published Site does not match the versioned contract",
      },
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    collection: "sites",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
    // The versioned Site snapshot deliberately contains empty, typed sections
    // while an editor is still preparing a draft. Mongoose minimizes empty
    // objects by default, which would make a freshly persisted neutral draft no
    // longer satisfy its own contract when it is read back.
    minimize: false,
    id: false,
  }
);

siteSchema.index({ site_key: 1 }, { unique: true, name: "site_key_1" });
siteSchema.index(
  { "published.published_at": -1 },
  {
    name: "site_published_at",
    partialFilterExpression: { "published.revision": { $type: "number" } },
  }
);

const Site =
  (mongoose.models.Site as Model<TSiteDocument>) ||
  mongoose.model<TSiteDocument>("Site", siteSchema);

export default Site;
