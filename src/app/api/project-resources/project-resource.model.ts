import type {
  TProjectResourceDocument,
  TProjectResourceModel,
} from "./project-resource.type";
import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";

const projectResourceSchema = new Schema<TProjectResourceDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: [1, "Sequence must be at least 1"],
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
      validate: {
        validator: isAllowedPublicProjectUrl,
        message: "Resource URL must be an allowlisted public HTTPS URL",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    is_private: {
      type: Boolean,
      default: true,
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

projectResourceSchema.methods.toJSON = function () {
  const resource = this.toObject();
  return resource;
};

applySoftDeletePlugin(projectResourceSchema);

projectResourceSchema.statics.isResourceExist = async function (_id: string) {
  return await this.findById(_id);
};

projectResourceSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const ProjectResource =
  (mongoose.models.ProjectResource as TProjectResourceModel) ||
  mongoose.model<TProjectResourceDocument, TProjectResourceModel>(
    "ProjectResource",
    projectResourceSchema
  );

export default ProjectResource;
