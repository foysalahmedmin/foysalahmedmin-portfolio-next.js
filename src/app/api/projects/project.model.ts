import type { TProjectDocument, TProjectModel } from "./project.type";
import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { richContentSchema } from "@/lib/content/rich-content-schema";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import {
  LINK_VISIBILITIES,
  OUTCOME_VERIFICATION_STATES,
  PROJECT_DELIVERY_STATUSES,
  PROJECT_PUBLICATION_STATUSES,
  PROJECT_TYPES,
  isAllowedPublicProjectUrl,
} from "@/lib/content/portfolio-contract";

const slugHistorySchema = new Schema(
  {
    slug: { type: String, required: true },
    changed_at: { type: Date, required: true },
  },
  { _id: false }
);

const outcomeSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    value: { type: String, required: true, trim: true, maxlength: 120 },
    verification_state: {
      type: String,
      enum: OUTCOME_VERIFICATION_STATES,
      required: true,
    },
    evidence_reference: {
      type: String,
      trim: true,
      maxlength: 500,
      required: function (this: { verification_state?: string }) {
        return this.verification_state === "verified";
      },
    },
  },
  { _id: false }
);

const projectSchema = new Schema<TProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 96,
      match: CONTENT_SLUG_PATTERN,
    },
    slug_history: { type: [slugHistorySchema], default: [] },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    content: {
      type: String,
      required: true,
    },

    rich_content: {
      type: richContentSchema,
      required: false,
    },

    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },

    images: {
      type: [Schema.Types.ObjectId],
      ref: "File",
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "ProjectCategory",
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    collaborators: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    primary_pillar: { type: String, enum: PILLAR_KEYS },
    secondary_pillars: { type: [String], enum: PILLAR_KEYS, default: [] },
    delivery_status: { type: String, enum: PROJECT_DELIVERY_STATUSES },
    publication_status: {
      type: String,
      enum: PROJECT_PUBLICATION_STATUSES,
      default: "draft",
    },
    project_type: { type: String, enum: PROJECT_TYPES },
    problem: { type: String, trim: true, maxlength: 5_000 },
    constraints: { type: [String], default: [] },
    role: { type: String, trim: true, maxlength: 1_000 },
    architecture: { type: String, trim: true, maxlength: 10_000 },
    decisions: { type: [String], default: [] },
    implementation: { type: String, trim: true, maxlength: 10_000 },
    security: { type: String, trim: true, maxlength: 10_000 },
    performance_reliability: {
      type: String,
      trim: true,
      maxlength: 10_000,
    },
    outcomes: { type: [outcomeSchema], default: [] },
    learnings: { type: [String], default: [] },
    live_url: {
      type: String,
      trim: true,
      maxlength: 2_048,
      validate: {
        validator: (value?: string | null) =>
          !value || isAllowedPublicProjectUrl(value),
        message: "live_url must be an allowlisted public HTTPS URL",
      },
    },
    live_url_visibility: {
      type: String,
      enum: LINK_VISIBILITIES,
      default: "hidden",
    },
    source_url: {
      type: String,
      trim: true,
      maxlength: 2_048,
      validate: {
        validator: (value?: string | null) =>
          !value || isAllowedPublicProjectUrl(value),
        message: "source_url must be an allowlisted public HTTPS URL",
      },
    },
    source_url_visibility: {
      type: String,
      enum: LINK_VISIBILITIES,
      default: "hidden",
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

projectSchema.virtual("resources", {
  ref: "ProjectResource",
  localField: "_id",
  foreignField: "project",
  match: { is_deleted: { $ne: true } },
});

projectSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false, slug: { $type: "string" } },
    name: "unique_project_slug_active",
  }
);
projectSchema.index(
  { publication_status: 1, primary_pillar: 1 },
  { name: "project_publication_pillar" }
);

projectSchema.virtual("resource_count", {
  ref: "ProjectResource",
  localField: "_id",
  foreignField: "project",
  count: true,
  match: { is_deleted: { $ne: true } },
});

projectSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "target",
  match: { target_model: "Project", is_deleted: { $ne: true } },
});

projectSchema.virtual("review_count", {
  ref: "Review",
  localField: "_id",
  foreignField: "target",
  count: true,
  match: { target_model: "Project", is_deleted: { $ne: true } },
});

// toJSON override to remove sensitive fields from output
projectSchema.methods.toJSON = function () {
  const project = this.toObject();
  return project;
};

applySoftDeletePlugin(projectSchema);

// Static methods
projectSchema.statics.isProjectExist = async function (_id: string) {
  return await this.findById(_id);
};

// Instance methods
projectSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const Project =
  (mongoose.models.Project as TProjectModel) ||
  mongoose.model<TProjectDocument, TProjectModel>("Project", projectSchema);

export default Project;
