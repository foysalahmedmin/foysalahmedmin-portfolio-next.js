import {
  TResource,
  TResourceDocument,
  TResourceModel,
} from "@/types/resource.type";
import mongoose, { Query, Schema } from "mongoose";

const resourceSchema = new Schema<TResourceDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    sequence: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["repository", "design", "documentation", "other"],
      default: "other",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    is_private: {
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

// toJSON override to remove sensitive fields from output
resourceSchema.methods.toJSON = function () {
  const article = this.toObject();
  delete article.is_deleted;
  return article;
};

// Query middleware to exclude deleted categories
resourceSchema.pre(/^find/, function (this: Query<TResource, TResource>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

resourceSchema.pre(
  /^update/,
  function (this: Query<TResource, TResource>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

// Aggregation pipeline
resourceSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
resourceSchema.statics.isArticleExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
resourceSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Resource = mongoose.model<TResourceDocument, TResourceModel>(
  "Resource",
  resourceSchema
);
