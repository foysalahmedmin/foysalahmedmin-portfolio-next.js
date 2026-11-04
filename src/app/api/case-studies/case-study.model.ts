import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { richContentSchema } from "@/lib/content/rich-content-schema";
import {
  CASE_STUDY_ARCHITECTURE_LIMITS as ARCH,
  CASE_STUDY_ARCHITECTURE_NODE_KINDS,
  CASE_STUDY_CONSTRAINT_LIMITS,
  CASE_STUDY_ENGAGEMENT_TYPES,
  CASE_STUDY_LINK_VISIBILITIES,
  CASE_STUDY_OUTCOME_STATES,
  parseCaseStudyArchitecture,
} from "@/lib/content/case-study-contract";
import {
  SAFE_KEY_MAX_LENGTH,
  SAFE_KEY_PATTERN,
} from "@/lib/content/plain-text";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import type { TCaseStudyDocument, TCaseStudyModel } from "./case-study.type";

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
    description: { type: String, trim: true, maxlength: 500 },
    verification_state: {
      type: String,
      enum: CASE_STUDY_OUTCOME_STATES,
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

const listOf = (maxLength: number, maxItems: number) => ({
  type: [{ type: String, trim: true, maxlength: maxLength }],
  default: [],
  validate: {
    validator: (value: string[]) => value.length <= maxItems,
    message: `At most ${maxItems} entries are allowed`,
  },
});

const textField = (bounds: readonly [number, number], required = false) => ({
  type: String,
  trim: true,
  required,
  minlength: bounds[0],
  maxlength: bounds[1],
});
const keyField = (required = true) => ({
  type: String,
  required,
  trim: true,
  maxlength: SAFE_KEY_MAX_LENGTH,
  match: SAFE_KEY_PATTERN,
});

const architectureSchema = new Schema(
  {
    alt: textField(ARCH.alt, true),
    layers: { type: [textField(ARCH.layer, true)], default: [] },
    nodes: {
      type: [
        new Schema(
          {
            key: keyField(),
            label: textField(ARCH.node_label, true),
            layer: textField(ARCH.layer, true),
            kind: {
              type: String,
              enum: CASE_STUDY_ARCHITECTURE_NODE_KINDS,
              required: true,
            },
            note: textField(ARCH.node_note),
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    edges: {
      type: [
        new Schema(
          {
            from: keyField(),
            to: keyField(),
            label: textField(ARCH.edge_label),
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    steps: {
      type: [
        new Schema(
          {
            title: textField(ARCH.step_title, true),
            focus: { type: [keyField()], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const publicUrl = (label: string) => ({
  type: String,
  trim: true,
  maxlength: 2_048,
  validate: {
    validator: (value?: string | null) =>
      !value || isAllowedPublicProjectUrl(value),
    message: `${label} must be an allowlisted public HTTPS URL`,
  },
});

const caseStudySchema = new Schema<TCaseStudyDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 96,
      match: CONTENT_SLUG_PATTERN,
    },
    slug_history: { type: [slugHistorySchema], default: [] },
    description: { type: String, trim: true, maxlength: 300 },
    overview: { type: String, trim: true, maxlength: 5_000 },
    content: { type: String },
    rich_content: { type: richContentSchema, required: false },
    thumbnail: { type: Schema.Types.ObjectId, ref: "File", default: null },
    images: { type: [Schema.Types.ObjectId], ref: "File", default: [] },
    category: {
      type: Schema.Types.ObjectId,
      ref: "CaseStudyCategory",
      required: true,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    client_name: { type: String, trim: true, maxlength: 120 },
    show_client_name: { type: Boolean, default: false },
    client_industry: { type: String, trim: true, maxlength: 120 },
    client_location: { type: String, trim: true, maxlength: 120 },
    engagement_type: { type: String, enum: CASE_STUDY_ENGAGEMENT_TYPES },
    primary_pillar: { type: String, enum: PILLAR_KEYS },
    secondary_pillars: { type: [String], enum: PILLAR_KEYS, default: [] },
    role: { type: String, trim: true, maxlength: 500 },
    team_size: { type: Number, min: 1, max: 1_000 },
    duration_label: { type: String, trim: true, maxlength: 80 },
    started_at: {
      type: Date,
      validate: {
        validator: function (this: TCaseStudyDocument, value: Date) {
          return !(this.ended_at && value && value > this.ended_at);
        },
        message: "started_at cannot be after ended_at",
      },
    },
    ended_at: {
      type: Date,
      validate: {
        validator: function (this: TCaseStudyDocument, value: Date) {
          return !(this.started_at && value && value < this.started_at);
        },
        message: "ended_at cannot be before started_at",
      },
    },
    challenge: { type: String, trim: true, maxlength: 5_000 },
    approach: { type: String, trim: true, maxlength: 8_000 },
    solution: { type: String, trim: true, maxlength: 8_000 },
    key_decisions: listOf(2_000, 50),
    constraints: listOf(
      CASE_STUDY_CONSTRAINT_LIMITS.length,
      CASE_STUDY_CONSTRAINT_LIMITS.items
    ),
    architecture: {
      type: architectureSchema,
      required: false,
      // Limits and cross-references (layers, edges, focus) are checked once, by the shared contract parser.
      validate: {
        validator: (value?: { toObject(): unknown } | null) =>
          !value || parseCaseStudyArchitecture(value.toObject()).ok,
        message: "architecture does not satisfy the case study contract",
      },
    },
    results_summary: { type: String, trim: true, maxlength: 3_000 },
    outcomes: { type: [outcomeSchema], default: [] },
    tech_stack: listOf(60, 40),
    services: listOf(80, 30),
    learnings: listOf(2_000, 50),
    keywords: listOf(60, 20),
    live_url: publicUrl("live_url"),
    live_url_visibility: {
      type: String,
      enum: CASE_STUDY_LINK_VISIBILITIES,
      default: "hidden",
    },
    source_url: publicUrl("source_url"),
    source_url_visibility: {
      type: String,
      enum: CASE_STUDY_LINK_VISIBILITIES,
      default: "hidden",
    },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "archived"],
      default: "draft",
    },
    is_featured: { type: Boolean, default: false },
    published_at: {
      type: Date,
      required: function (this: TCaseStudyDocument) {
        return this.status === "published";
      },
      default: function (this: TCaseStudyDocument) {
        return this.status === "published" ? new Date() : undefined;
      },
      validate: {
        validator: function (value: Date) {
          if (this.expired_at && value) return value <= this.expired_at;
          return true;
        },
        message: "published_at cannot be after expired_at",
      },
    },
    expired_at: {
      type: Date,
      default: undefined,
      validate: {
        validator: function (value: Date) {
          if (this.published_at && value) return value >= this.published_at;
          return true;
        },
        message: "expired_at cannot be before published_at",
      },
    },
    layout: { type: String, default: "default" },
    is_deleted: { type: Boolean, default: false, select: false },
    deleted_at: { type: Date, default: null, select: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

caseStudySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false, slug: { $type: "string" } },
    name: "unique_case_study_slug_active",
  }
);
caseStudySchema.index(
  { status: 1, primary_pillar: 1, published_at: -1 },
  { name: "case_study_publication_pillar" }
);
caseStudySchema.index(
  { category: 1, status: 1 },
  { name: "case_study_category_status" }
);

caseStudySchema.methods.toJSON = function () {
  return this.toObject();
};

applySoftDeletePlugin(caseStudySchema);

caseStudySchema.statics.isCaseStudyExist = async function (_id: string) {
  return await this.findById(_id);
};

caseStudySchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const CaseStudy =
  (mongoose.models.CaseStudy as TCaseStudyModel) ||
  mongoose.model<TCaseStudyDocument, TCaseStudyModel>(
    "CaseStudy",
    caseStudySchema,
    "case_studies"
  );

export default CaseStudy;
