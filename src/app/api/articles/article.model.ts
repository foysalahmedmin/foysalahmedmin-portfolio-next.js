import type { Query } from "mongoose";
import mongoose, { Schema } from "mongoose";
import type { TArticle, TArticleDocument, TArticleModel } from "./article.type";

const articleSchema = new Schema<TArticleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: true,
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

articleSchema.virtual("review_count", {
  ref: "Review",
  localField: "_id",
  foreignField: "target",
  count: true,
  match: { target_model: "Article", is_deleted: { $ne: true } },
});

articleSchema.methods.toJSON = function () {
  const article = this.toObject();
  delete article.is_deleted;
  return article;
};

articleSchema.pre(/^find/, function (this: Query<TArticle, TArticle>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

articleSchema.pre(/^update/, function (this: Query<TArticle, TArticle>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

articleSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

articleSchema.statics.isArticleExist = async function (_id: string) {
  return await this.findById(_id);
};

articleSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Article =
  (mongoose.models.Article as TArticleModel) ||
  mongoose.model<TArticleDocument, TArticleModel>("Article", articleSchema);

export default Article;
