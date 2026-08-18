import type {
  TProjectCategoryDocument,
  TProjectCategoryModel,
} from "./project-category.type";
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

const projectCategorySchema = new Schema<TProjectCategoryDocument>(
  {
    parent: {
      type: Schema.Types.ObjectId,
      ref: "ProjectCategory",
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

projectCategorySchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_project_category_name_active",
  }
);
projectCategorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_project_category_slug_active",
  }
);

projectCategorySchema.virtual("children", {
  ref: "ProjectCategory",
  localField: "_id",
  foreignField: "parent",
  match: { is_deleted: { $ne: true } },
});

projectCategorySchema.methods.toJSON = function () {
  const category = this.toObject();
  return category;
};

applySoftDeletePlugin(projectCategorySchema);

projectCategorySchema.statics.isCategoryExist = async function (_id: string) {
  return await this.findById(_id);
};

projectCategorySchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const ProjectCategory =
  (mongoose.models.ProjectCategory as TProjectCategoryModel) ||
  mongoose.model<TProjectCategoryDocument, TProjectCategoryModel>(
    "ProjectCategory",
    projectCategorySchema,
    "project_categories"
  );

export default ProjectCategory;
