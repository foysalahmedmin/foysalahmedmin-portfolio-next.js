import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import {
  MAX_VIDEO_KEYWORDS,
  MAX_VIDEO_KEYWORD_LENGTH,
  VIDEO_ASPECT_RATIOS,
  VIDEO_SOURCE_TYPES,
} from "@/lib/content/video-contract";
import type { TVideoDocument, TVideoModel } from "./video.type";

const slugHistorySchema = new Schema(
  {
    slug: { type: String, required: true },
    changed_at: { type: Date, required: true },
  },
  { _id: false }
);

const videoSchema = new Schema<TVideoDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 96,
      match: CONTENT_SLUG_PATTERN,
    },
    slug_history: { type: [slugHistorySchema], default: [] },
    description: { type: String, trim: true, maxlength: 2_000 },
    keywords: {
      type: [{ type: String, trim: true, maxlength: MAX_VIDEO_KEYWORD_LENGTH }],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= MAX_VIDEO_KEYWORDS,
        message: `A video can have at most ${MAX_VIDEO_KEYWORDS} keywords`,
      },
    },
    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "VideoCategory",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aspect_ratio: {
      type: String,
      enum: VIDEO_ASPECT_RATIOS,
      default: "landscape",
      required: true,
    },
    source_type: {
      type: String,
      enum: VIDEO_SOURCE_TYPES,
      required: true,
    },
    video_file: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    youtube_url: { type: String, trim: true, maxlength: 2_048 },
    youtube_id: {
      type: String,
      trim: true,
      match: /^[A-Za-z0-9_-]{11}$/,
    },
    duration_seconds: { type: Number, min: 0, max: 86_400 },
    status: {
      type: String,
      enum: ["draft", "pending", "published", "archived"],
      default: "draft",
    },
    is_featured: { type: Boolean, default: false },
    published_at: {
      type: Date,
      required: function (this: TVideoDocument) {
        return this.status === "published";
      },
      default: function (this: TVideoDocument) {
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

// The two sources are mutually exclusive: a stored record can never point at
// both an uploaded file and a YouTube video, or at neither.
videoSchema.pre("validate", function checkVideoSource() {
  if (this.source_type === "youtube") {
    if (!this.youtube_id) this.invalidate("youtube_url", "A YouTube video is required");
    if (this.video_file) this.invalidate("video_file", "A YouTube video cannot also have an uploaded file");
  } else if (this.source_type === "upload") {
    if (!this.video_file) this.invalidate("video_file", "An uploaded video file is required");
    if (this.youtube_id || this.youtube_url) {
      this.invalidate("youtube_url", "An uploaded video cannot also have a YouTube link");
    }
  }
});

videoSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false, slug: { $type: "string" } },
    name: "unique_video_slug_active",
  }
);
videoSchema.index(
  { status: 1, aspect_ratio: 1, published_at: -1 },
  { name: "video_publication_aspect" }
);
videoSchema.index({ category: 1, status: 1 }, { name: "video_category_status" });

videoSchema.methods.toJSON = function () {
  return this.toObject();
};

applySoftDeletePlugin(videoSchema);

videoSchema.statics.isVideoExist = async function (_id: string) {
  return await this.findById(_id);
};

videoSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const Video =
  (mongoose.models.Video as TVideoModel) ||
  mongoose.model<TVideoDocument, TVideoModel>("Video", videoSchema, "videos");

export default Video;
