import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { richContentSchema } from "@/lib/content/rich-content-schema";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import type { TArticleDocument, TArticleModel } from "./article.type";

const slugHistorySchema = new Schema(
  {
    slug: { type: String, required: true },
    changed_at: { type: Date, required: true },
  },
  { _id: false }
);

const bodyMetadataSchema = new Schema(
  {
    schema_version: { type: Number, enum: [1], required: true },
    word_count: { type: Number, min: 0, required: true },
    heading_count: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const articleSchema = new Schema<TArticleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 96,
      match: CONTENT_SLUG_PATTERN,
    },
    slug_history: { type: [slugHistorySchema], default: [] },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    excerpt: { type: String, trim: true, maxlength: 500 },
    content: {
      type: String,
      required: true,
    },
    rich_content: {
      type: richContentSchema,
      required: false,
    },
    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    images: {
      type: [Schema.Types.ObjectId],
      ref: "File",
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ArticleCategory",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    primary_pillar: { type: String, enum: PILLAR_KEYS },
    secondary_pillars: { type: [String], enum: PILLAR_KEYS, default: [] },
    topics: { type: [String], default: [] },
    reading_time_minutes: { type: Number, min: 1, max: 600 },
    reading_time_source: {
      type: String,
      enum: ["derived", "manual"],
      default: "derived",
    },
    body_metadata: { type: bodyMetadataSchema },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "archived"],
      default: "draft",
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_premium: {
      type: Boolean,
      default: false,
    },
    published_at: {
      type: Date,
      required: function (this: TArticleDocument) {
        return this.status === "published";
      },
      default: function (this: TArticleDocument) {
        return this.status === "published" ? new Date() : undefined;
      },
      validate: {
        validator: function (value: Date) {
          if (this.expired_at && value) {
            return value <= this.expired_at;
          }
          return true;
        },
        message: "published_at cannot be after expired_at",
      },
    },
    expired_at: {
      type: Date,
      default: undefined,
      validate: {
        validator: function (value: Date) {
          if (this.published_at && value) {
            return value >= this.published_at;
          }
          return true;
        },
        message: "expired_at cannot be before published_at",
      },
    },
    layout: {
      type: String,
      default: "default",
    },
    is_deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deleted_at: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

articleSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "target",
  match: { target_model: "Article", is_deleted: { $ne: true } },
});

articleSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false, slug: { $type: "string" } },
    name: "unique_article_slug_active",
  }
);
articleSchema.index(
  { status: 1, primary_pillar: 1, published_at: -1 },
  { name: "article_publication_pillar" }
);

articleSchema.virtual("review_count", {
  ref: "Review",
  localField: "_id",
  foreignField: "target",
  count: true,
  match: { target_model: "Article", is_deleted: { $ne: true } },
});

articleSchema.methods.toJSON = function () {
  const article = this.toObject();
  return article;
};

applySoftDeletePlugin(articleSchema);

articleSchema.statics.isArticleExist = async function (_id: string) {
  return await this.findById(_id);
};

articleSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const Article =
  (mongoose.models.Article as TArticleModel) ||
  mongoose.model<TArticleDocument, TArticleModel>("Article", articleSchema);

export default Article;
