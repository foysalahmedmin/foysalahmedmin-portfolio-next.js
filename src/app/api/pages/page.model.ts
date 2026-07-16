import mongoose, { Schema, type Model } from "mongoose";
import {
  PAGE_CONTRACT_VERSION,
  PAGE_ROUTE_KEYS,
  PAGE_SCHEMA_VERSION,
  type TPageDocument,
  type TPagePublishedSnapshot,
} from "./page.type";
import { parsePageDraftSnapshot } from "./page.validation";

const publishedDraft = (value: TPagePublishedSnapshot) => {
  const {
    revision: _revision,
    published_at: _publishedAt,
    published_by: _publishedBy,
    ...draft
  } = value;
  return draft;
};

const pageSchema = new Schema<TPageDocument>(
  {
    route_key: {
      type: String,
      enum: PAGE_ROUTE_KEYS,
      required: true,
      immutable: true,
    },
    locale: {
      type: String,
      enum: ["en"],
      required: true,
      default: "en",
      immutable: true,
    },
    schema_version: {
      type: Number,
      enum: [PAGE_SCHEMA_VERSION],
      required: true,
      default: PAGE_SCHEMA_VERSION,
      immutable: true,
    },
    contract_version: {
      type: Number,
      enum: [PAGE_CONTRACT_VERSION],
      required: true,
      default: PAGE_CONTRACT_VERSION,
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
    draft: { type: Schema.Types.Mixed, required: true },
    published: { type: Schema.Types.Mixed, default: null },
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
    collection: "pages",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
    id: false,
  }
);

pageSchema.pre("validate", function validatePageSnapshots() {
  this.draft = parsePageDraftSnapshot(this.route_key, this.draft);
  if (this.published) {
    const published = this.published as TPagePublishedSnapshot;
    if (
      !Number.isSafeInteger(published.revision) ||
      published.revision < 1 ||
      !published.published_at ||
      !/^[a-f0-9]{24}$/i.test(String(published.published_by))
    ) {
      throw new Error("Published Page metadata is invalid");
    }
    this.published = {
      ...parsePageDraftSnapshot(this.route_key, publishedDraft(published)),
      revision: published.revision,
      published_at: published.published_at,
      published_by: published.published_by,
    };
  }
});

pageSchema.index(
  { route_key: 1, locale: 1 },
  { unique: true, name: "page_route_locale_unique" }
);
pageSchema.index(
  { locale: 1, "published.revision": 1, route_key: 1 },
  {
    name: "page_published_route",
    partialFilterExpression: { "published.revision": { $type: "number" } },
  }
);
pageSchema.index(
  { updated_at: -1, route_key: 1 },
  { name: "page_admin_updated" }
);

const Page =
  (mongoose.models.Page as Model<TPageDocument>) ||
  mongoose.model<TPageDocument>("Page", pageSchema);

export default Page;
