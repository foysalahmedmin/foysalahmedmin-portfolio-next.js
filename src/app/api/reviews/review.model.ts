import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import type { TReviewDocument, TReviewModel } from "./review.type";

const reviewSchema = new Schema<TReviewDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    target_model: {
      type: String,
      enum: ["Project", "Article"],
      required: true,
    },

    target: {
      type: Schema.Types.ObjectId,
      refPath: "target_model",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    is_edited: {
      type: Boolean,
      default: false,
    },

    edited_at: {
      type: Date,
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

reviewSchema.index(
  { target: 1, target_model: 1, author: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_review_target_author_active",
  }
);

// toJSON override to remove sensitive fields from output
reviewSchema.methods.toJSON = function () {
  const review = this.toObject();
  return review;
};

applySoftDeletePlugin(reviewSchema);

// Static methods
reviewSchema.statics.isReviewExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
reviewSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const Review =
  (mongoose.models.Review as TReviewModel) ||
  mongoose.model<TReviewDocument, TReviewModel>("Review", reviewSchema);
