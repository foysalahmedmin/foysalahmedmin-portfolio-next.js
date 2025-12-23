import type { TReview, TReviewDocument, TReviewModel } from "./review.type";
import type { Query} from "mongoose";
import mongoose, { Schema } from "mongoose";

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
      default: "approved",
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

reviewSchema.index({ target: 1, target_model: 1, author: 1 }, { unique: true });

// toJSON override to remove sensitive fields from output
reviewSchema.methods.toJSON = function () {
  const review = this.toObject();
  delete review.is_deleted;
  return review;
};

// Query middleware to exclude deleted categories
reviewSchema.pre(/^find/, function (this: Query<TReview, TReview>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

reviewSchema.pre(/^update/, function (this: Query<TReview, TReview>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

// Aggregation pipeline
reviewSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
reviewSchema.statics.isReviewExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
reviewSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Review = mongoose.model<TReviewDocument, TReviewModel>(
  "Review",
  reviewSchema
);
