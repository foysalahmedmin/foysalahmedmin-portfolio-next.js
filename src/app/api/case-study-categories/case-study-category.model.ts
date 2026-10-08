import type {
  TCaseStudyCategoryDocument,
  TCaseStudyCategoryModel,
} from "./case-study-category.type";
import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";

const slugHistorySchema = new Schema(
  {
    slug: { type: String, required: true },
    changed_at: { type: Date, required: true },
  },
  { _id: false }
);

const caseStudyCategorySchema = new Schema<TCaseStudyCategoryDocument>(
  {
    parent: {
      type: Schema.Types.ObjectId,
      ref: "CaseStudyCategory",
    },
    icon: {
      type: String,
      default: "blocks",
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      trim: true,
      lowercase: true,
      minlength: [1, "Slug must be at least 1 character"],
      maxlength: [96, "Slug cannot exceed 96 characters"],
      match: [CONTENT_SLUG_PATTERN, "Slug must be canonical"],
    },
    slug_history: { type: [slugHistorySchema], default: [] },
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
    is_deleted: { type: Boolean, default: false, select: false },
    deleted_at: { type: Date, default: null, select: false },
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

caseStudyCategorySchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_case_study_category_name_active",
  }
);
caseStudyCategorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_case_study_category_slug_active",
  }
);

caseStudyCategorySchema.virtual("children", {
  ref: "CaseStudyCategory",
  localField: "_id",
  foreignField: "parent",
  match: { is_deleted: { $ne: true } },
});

caseStudyCategorySchema.methods.toJSON = function () {
  const category = this.toObject();
  return category;
};

applySoftDeletePlugin(caseStudyCategorySchema);

caseStudyCategorySchema.statics.isCategoryExist = async function (_id: string) {
  return await this.findById(_id);
};

caseStudyCategorySchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const CaseStudyCategory =
  (mongoose.models.CaseStudyCategory as TCaseStudyCategoryModel) ||
  mongoose.model<TCaseStudyCategoryDocument, TCaseStudyCategoryModel>(
    "CaseStudyCategory",
    caseStudyCategorySchema,
    "case_study_categories"
  );

export default CaseStudyCategory;
