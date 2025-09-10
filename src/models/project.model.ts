import {
  TProject,
  TProjectDocument,
  TProjectModel,
} from "@/types/project.type";
import mongoose, { Query, Schema } from "mongoose";

const projectSchema = new Schema<TProjectDocument>(
  {
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

    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    status: {
      type: String,
      enum: ["planned", "in_progress", "on_hold", "completed", "cancelled"],
      default: "planned",
    },

    is_featured: {
      type: Boolean,
      default: false,
    },

    is_premium: {
      type: Boolean,
      default: false,
    },

    started_at: {
      type: Date,
      validate: {
        validator: function (this: TProjectDocument, value: Date) {
          return !(this.ended_at && value && value > this.ended_at);
        },
        message: "started_at cannot be after ended_at",
      },
    },

    ended_at: {
      type: Date,
      validate: {
        validator: function (this: TProjectDocument, value: Date) {
          return !(this.started_at && value && value < this.started_at);
        },
        message: "ended_at cannot be before started_at",
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

projectSchema.virtual("resources", {
  ref: "Resource",
  localField: "_id",
  foreignField: "project",
  match: { is_deleted: { $ne: true } },
});

projectSchema.virtual("resource_count", {
  ref: "Resource",
  localField: "_id",
  foreignField: "project",
  count: true,
  match: { is_deleted: { $ne: true } },
});

projectSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "project",
  match: { type: "project", is_deleted: { $ne: true } },
});

projectSchema.virtual("review_count", {
  ref: "Review",
  localField: "_id",
  foreignField: "project",
  count: true,
  match: { type: "project", is_deleted: { $ne: true } },
});

// toJSON override to remove sensitive fields from output
projectSchema.methods.toJSON = function () {
  const project = this.toObject();
  delete project.is_deleted;
  return project;
};

// Query middleware to exclude deleted categories
projectSchema.pre(/^find/, function (this: Query<TProject, TProject>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

projectSchema.pre(/^update/, function (this: Query<TProject, TProject>, next) {
  this.setQuery({
    ...this.getQuery(),
    is_deleted: { $ne: true },
  });
  next();
});

// Aggregation pipeline
projectSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
projectSchema.statics.isprojectExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
projectSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Project = mongoose.model<TProjectDocument, TProjectModel>(
  "Project",
  projectSchema
);
