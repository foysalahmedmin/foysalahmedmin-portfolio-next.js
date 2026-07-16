import {
  RICH_CONTENT_POLICY_VERSION,
  RICH_CONTENT_SCHEMA_VERSION,
  type RichContentDocument,
} from "@/lib/content/rich-content";
import { Schema } from "mongoose";

const architectureNodeSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false, strict: "throw" }
);

const architectureEdgeSchema = new Schema(
  {
    from: { type: String, required: true, trim: true, maxlength: 80 },
    to: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false, strict: "throw" }
);

const contentBlockSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["rich_text", "code", "quote", "callout", "media", "architecture"],
    },
    html: { type: String, maxlength: 200_000 },
    code: { type: String, maxlength: 100_000 },
    language: { type: String, trim: true, maxlength: 40 },
    caption: { type: String, trim: true, maxlength: 500 },
    quote: { type: String, maxlength: 5_000 },
    attribution: { type: String, trim: true, maxlength: 300 },
    tone: { type: String, enum: ["info", "success", "warning"] },
    title: { type: String, trim: true, maxlength: 300 },
    body: { type: String, maxlength: 10_000 },
    file: { type: Schema.Types.ObjectId, ref: "File" },
    alt: { type: String, trim: true, maxlength: 500 },
    description: { type: String, maxlength: 2_000 },
    nodes: {
      type: [architectureNodeSchema],
      default: undefined,
      validate: {
        validator: (nodes: unknown[]) => !nodes || nodes.length <= 40,
        message: "Architecture blocks support at most 40 nodes",
      },
    },
    edges: {
      type: [architectureEdgeSchema],
      default: undefined,
      validate: {
        validator: (edges: unknown[]) => !edges || edges.length <= 80,
        message: "Architecture blocks support at most 80 edges",
      },
    },
  },
  { _id: false, strict: "throw" }
);

contentBlockSchema.pre("validate", function validateBlock() {
  const block = this as unknown as Record<string, unknown>;
  const requiredByType: Record<string, string[]> = {
    rich_text: ["html"],
    code: ["code"],
    quote: ["quote"],
    callout: ["tone", "body"],
    media: ["file", "alt"],
    architecture: ["title", "nodes", "edges"],
  };

  const fields = requiredByType[String(block.type)] ?? [];
  for (const field of fields) {
    const value = block[field];
    if (value === undefined || value === null || value === "") {
      this.invalidate(field, `${field} is required for ${String(block.type)}`);
    }
  }
});

export const richContentSchema = new Schema<RichContentDocument>(
  {
    schema_version: {
      type: Number,
      enum: [RICH_CONTENT_SCHEMA_VERSION],
      required: true,
      default: RICH_CONTENT_SCHEMA_VERSION,
    },
    sanitizer_policy_version: {
      type: Number,
      enum: [RICH_CONTENT_POLICY_VERSION],
      required: true,
      default: RICH_CONTENT_POLICY_VERSION,
    },
    blocks: {
      type: [contentBlockSchema],
      required: true,
      validate: {
        validator: (blocks: unknown[]) =>
          blocks.length > 0 && blocks.length <= 100,
        message: "Rich content must contain between 1 and 100 blocks",
      },
    },
  },
  { _id: false, strict: "throw" }
);
