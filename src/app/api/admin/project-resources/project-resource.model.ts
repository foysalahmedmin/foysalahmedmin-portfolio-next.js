import {
  TProjectResource,
  TProjectResourceDocument,
  TProjectResourceModel,
} from "./project-resource.type";
import mongoose, { Query, Schema } from "mongoose";

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

projectResourceSchema.methods.toJSON = function () {
  const resource = this.toObject();
  delete resource.is_deleted;
  return resource;
};

projectResourceSchema.pre(
  /^find/,
  function (this: Query<TProjectResource, TProjectResource>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

projectResourceSchema.pre(
  /^update/,
  function (this: Query<TProjectResource, TProjectResource>, next) {
    this.setQuery({
      ...this.getQuery(),
      is_deleted: { $ne: true },
    });
    next();
  }
);

projectResourceSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

projectResourceSchema.statics.isResourceExist = async function (_id: string) {
  return await this.findById(_id);
};

projectResourceSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const ProjectResource =
  (mongoose.models.ProjectResource as TProjectResourceModel) ||
  mongoose.model<TProjectResourceDocument, TProjectResourceModel>(
    "ProjectResource",
    projectResourceSchema
  );

export default ProjectResource;

