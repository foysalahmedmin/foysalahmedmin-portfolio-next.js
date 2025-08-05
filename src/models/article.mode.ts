import {
  TArticle,
  TArticleDocument,
  TArticleModel,
} from "@/types/article.type";
import mongoose, { Query, Schema } from "mongoose";

const articleSchema = new Schema<TArticleDocument>(
  {
    sequence: {
      type: Number,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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
      type: String,
    },

    images: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
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
      required: function () {
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
      default: function (this: TArticleDocument) {
        if (this.status === "published") {
          const publishedAt = this.published_at || new Date();
          return new Date(publishedAt.getTime() + 1 * 24 * 60 * 60 * 1000);
        }
        return undefined;
      },
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

articleSchema.virtual("like_count", {
  ref: "Reaction",
  localField: "_id",
  foreignField: "article",
  count: true,
  match: { type: "like", is_deleted: { $ne: true } },
});

articleSchema.virtual("dislike_count", {
  ref: "Reaction",
  localField: "_id",
  foreignField: "article",
  count: true,
  match: { type: "dislike", is_deleted: { $ne: true } },
});

articleSchema.virtual("comment_count", {
  ref: "Comment",
  localField: "_id",
  foreignField: "article",
  count: true,
  match: { is_deleted: { $ne: true } },
});

// toJSON override to remove sensitive fields from output
articleSchema.methods.toJSON = function () {
  const article = this.toObject();
  delete article.is_deleted;
  return article;
};

// Query middleware to exclude deleted categories
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

// Aggregation pipeline
articleSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
articleSchema.statics.isArticleExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
articleSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Article = mongoose.model<TArticleDocument, TArticleModel>(
  "Article",
  articleSchema
);
