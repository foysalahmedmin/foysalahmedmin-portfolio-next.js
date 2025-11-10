import {
  TProjectCategory,
  TProjectCategoryDocument,
  TProjectCategoryModel,
} from "@/types/project-category.type";
import mongoose, { Query, Schema } from "mongoose";

const projectCategorySchema = new Schema<TProjectCategoryDocument>(
  {
    parent: {
      type: Schema.Types.ObjectId,
      ref: "ProjectCategory",
    },
    icon: {
      type: String,
      default: "blocks",
    },
    thumbnail: {
      type: String,
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
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [1, "Slug must be at least 1 character"],
      maxlength: [50, "Slug cannot exceed 50 characters"],
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

projectCategorySchema.virtual("children", {
  ref: "ProjectCategory",
  localField: "_id",
  foreignField: "parent",
  match: { is_deleted: { $ne: true } },
});

projectCategorySchema.methods.toJSON = function () {
  const category = this.toObject();
  delete category.is_deleted;
  return category;
};

projectCategorySchema.pre(
  /^find/,
  function (this: Query<TProjectCategory, TProjectCategory>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

projectCategorySchema.pre(
  /^update/,
  function (this: Query<TProjectCategory, TProjectCategory>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

projectCategorySchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

projectCategorySchema.statics.isCategoryExist = async function (_id: string) {
  return await this.findById(_id);
};

projectCategorySchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const ProjectCategory =
  (mongoose.models.ProjectCategory as TProjectCategoryModel) ||
  mongoose.model<TProjectCategoryDocument, TProjectCategoryModel>(
    "ProjectCategory",
    projectCategorySchema
  );

export default ProjectCategory;

