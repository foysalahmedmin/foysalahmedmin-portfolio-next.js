import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import {
  FILE_PURPOSES,
  type TFileDocument,
  type TFileModel,
} from "./file.type";

const focalPointSchema = new Schema(
  {
    x: {
      type: Number,
      required: true,
      min: [0, "Focal point x must be between 0 and 1"],
      max: [1, "Focal point x must be between 0 and 1"],
    },
    y: {
      type: Number,
      required: true,
      min: [0, "Focal point y must be between 0 and 1"],
      max: [1, "Focal point y must be between 0 and 1"],
    },
  },
  { _id: false }
);

const fileSchema = new Schema<TFileDocument>(
  {
    filename: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    originalname: {
      type: String,
      required: [true, "Original name is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    url: {
      type: String,
      default: "",
      required: [
        function (this: TFileDocument) {
          return this.access === "public";
        },
        "A public delivery URL is required for public media",
      ],
      trim: true,
    },
    mimetype: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, "Size is required"],
      min: [0, "Size must be non-negative"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    provider: {
      type: String,
      enum: ["local", "gcs", "cloudinary"],
      required: [true, "Provider is required"],
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, "Caption cannot exceed 500 characters"],
    },
    alt_text: {
      type: String,
      trim: true,
      maxlength: [300, "Alt text cannot exceed 300 characters"],
    },
    is_decorative: {
      type: Boolean,
    },
    focal_point: { type: focalPointSchema },
    dominant_color: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^#[a-f0-9]{6}$/, "Dominant color must be a six-digit hex color"],
    },
    blur_data_url: {
      type: String,
      maxlength: [8192, "Blur placeholder is too large"],
      match: [
        /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/,
        "Blur placeholder must be a supported base64 image data URL",
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    lifecycle_state: {
      type: String,
      // `delete_failed` is read-only legacy data. New writes transition to
      // `error`; a later metadata migration can normalize old records.
      enum: [
        "uploading",
        "ready",
        "orphaned",
        "deleting",
        "error",
        "delete_failed",
      ],
      default: "ready",
    },
    purpose: {
      type: String,
      enum: FILE_PURPOSES,
      default: "generic",
      required: true,
    },
    access: {
      type: String,
      enum: ["public", "private"],
      default: "private",
      required: true,
    },
    source: {
      type: String,
      enum: ["uploaded", "generated"],
    },
    provenance: {
      _id: false,
      generator: { type: String, trim: true, maxlength: 160 },
      model: { type: String, trim: true, maxlength: 160 },
      prompt: { type: String, trim: true, maxlength: 8000, select: false },
      version: { type: String, trim: true, maxlength: 120 },
      seed: { type: String, trim: true, maxlength: 256, select: false },
      generated_at: Date,
      source_checksum: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^[a-f0-9]{64}$/,
      },
    },
    attribution: {
      _id: false,
      creator_name: { type: String, trim: true, maxlength: 200 },
      creator_url: { type: String, trim: true, maxlength: 2048 },
      source_url: { type: String, trim: true, maxlength: 2048 },
      credit_text: { type: String, trim: true, maxlength: 500 },
      license: {
        type: String,
        enum: [
          "owned",
          "client-provided",
          "cc0",
          "cc-by-4.0",
          "cc-by-sa-4.0",
          "unsplash",
          "other",
        ],
      },
      license_url: { type: String, trim: true, maxlength: 2048 },
    },
    checksum: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[a-f0-9]{64}$/,
    },
    metadata_status: {
      type: String,
      enum: ["complete", "incomplete"],
    },
    metadata_missing: {
      type: [
        {
          type: String,
          enum: [
            "provider",
            "purpose",
            "source",
            "checksum",
            "dimensions",
            "alt_text",
            "focal_point",
            "dominant_color",
            "blur_placeholder",
            "license",
            "attribution",
            "generated_provenance",
          ],
        },
      ],
      default: undefined,
    },
    idempotency_key: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
      select: false,
    },
    storage_version: {
      type: Number,
      min: 1,
      default: 1,
      required: true,
    },
    deletion_lease_token: {
      type: String,
      default: null,
      select: false,
    },
    deletion_lease_expires_at: {
      type: Date,
      default: null,
      select: false,
    },
    deletion_attempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    storage_error_code: {
      type: String,
      default: null,
      select: false,
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
    metadata: {
      path: String,
      bucket: String,
      storage_key: String,
      public_id: String,
      asset_id: String,
      cloud_name: String,
      folder: String,
      resource_type: {
        type: String,
        enum: ["image", "video", "raw"],
      },
      delivery_type: String,
      format: String,
      version: Number,
      etag: String,
      width: Number,
      height: Number,
      duration: Number,
      extension: String,
      file_type: String,
      immutable_key: String,
      checksum_algorithm: {
        type: String,
        enum: ["sha256"],
      },
      canonicalized_at: Date,
    },
    references: {
      type: [
        {
          model: {
            type: String,
            enum: [
              "Article",
              "Project",
              "User",
              "ArticleCategory",
              "ProjectCategory",
              "Review",
              "Contact",
              "ProjectResource",
              "Site",
              "Page",
              "Service",
              "SkillGroup",
              "Skill",
              "TimelineEntry",
              "Credential",
              "FAQ",
              "Testimonial",
              "LegalDocument",
            ],
            required: true,
          },
          entity: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: "references.model",
          },
          field: { type: String, required: true, trim: true },
          attached_at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

fileSchema.index({ author: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ provider: 1 });
fileSchema.index({ status: 1 });
fileSchema.index(
  { lifecycle_state: 1, updated_at: 1 },
  { name: "file_lifecycle_updated" }
);
fileSchema.index({ purpose: 1, access: 1 }, { name: "file_purpose_access" });
fileSchema.index(
  { metadata_status: 1, purpose: 1, updated_at: -1 },
  { name: "file_metadata_health" }
);
fileSchema.index(
  { author: 1, checksum: 1, purpose: 1, access: 1 },
  {
    name: "file_active_author_checksum_purpose_access_unique",
    unique: true,
    partialFilterExpression: {
      is_deleted: false,
      checksum: { $type: "string" },
    },
  }
);
fileSchema.index(
  { author: 1, idempotency_key: 1 },
  {
    name: "file_active_author_idempotency_unique",
    unique: true,
    partialFilterExpression: {
      is_deleted: false,
      idempotency_key: { $type: "string" },
    },
  }
);
fileSchema.index(
  { provider: 1, "metadata.storage_key": 1 },
  {
    name: "file_provider_storage_key_unique",
    unique: true,
    partialFilterExpression: {
      "metadata.storage_key": { $type: "string" },
    },
  }
);
fileSchema.index({ created_at: -1 });
fileSchema.index({ "references.model": 1, "references.entity": 1 });

fileSchema.methods.toJSON = function () {
  const file = this.toObject();
  delete file.deletion_lease_token;
  delete file.deletion_lease_expires_at;
  delete file.deletion_attempts;
  delete file.storage_error_code;
  return file;
};

applySoftDeletePlugin(fileSchema);

fileSchema.statics.isFileExist = async function (_id: string) {
  return await this.findById(_id);
};

export const File =
  (mongoose.models.File as TFileModel) ||
  mongoose.model<TFileDocument, TFileModel>("File", fileSchema);

export default File;
