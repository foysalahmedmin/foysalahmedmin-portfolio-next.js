import {
  TCategory,
  TCategoryDocument,
  TCategoryModel,
} from "@/types/category.type";
import mongoose, { Query, Schema } from "mongoose";

const categorySchema = new Schema<TCategoryDocument>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    icon: {
      type: String,
      default: "blocks",
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: [true, "Code is required"],
      unique: true,
      trim: true,
      minlength: [1, "Code must be at least 1 character"],
      maxlength: [20, "Code cannot exceed 20 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    sequence: {
      type: Number,
      required: [true, "Sequence is required"],
      min: [1, "Sequence must be at least 1"],
      max: [100, "Sequence must be at most 100"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    tags: {
      type: [String],
      default: [],
    },
    layout: {
      type: String,
      default: "default",
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    is_deleted: { type: Boolean, default: false, select: false },
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

// Virtual field for children
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "category",
  match: { is_deleted: { $ne: true } },
});

// toJSON override to remove sensitive fields from output
categorySchema.methods.toJSON = function () {
  const category = this.toObject();
  delete category.is_deleted;
  return category;
};

// Query middleware to exclude deleted categories
categorySchema.pre(/^find/, function (this: Query<TCategory, TCategory>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

categorySchema.pre(
  /^update/,
  function (this: Query<TCategory, TCategory>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

// Aggregation pipeline
categorySchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
categorySchema.statics.isCategoryExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
categorySchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Category = mongoose.model<TCategoryDocument, TCategoryModel>(
  "Category",
  categorySchema
);
