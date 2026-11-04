import mongoose, { Schema, type Model } from "mongoose";
import {
  SAFE_KEY_MAX_LENGTH,
  SAFE_KEY_PATTERN,
} from "@/lib/content/plain-text";
import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import { CONTENT_ICON_KEYS } from "../repeatable-content/record.constants";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import { SERVICE_PROBLEMS_MAX, type TService } from "./service.type";

const problemSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: SAFE_KEY_MAX_LENGTH,
      match: SAFE_KEY_PATTERN,
    },
    pain: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    approach: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 500,
    },
    deliverable: { type: String, trim: true, minlength: 2, maxlength: 240 },
    outcome: { type: String, trim: true, minlength: 2, maxlength: 300 },
    case_slug: {
      type: String,
      trim: true,
      maxlength: 96,
      match: CONTENT_SLUG_PATTERN,
    },
  },
  { _id: false, strict: "throw" }
);

const schema = new Schema<TService>({
  ...commonRecordFields,
  outcome: { type: String, required: true, trim: true, maxlength: 600 },
  capabilities: { type: [String], required: true, default: [] },
  deliverables: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  problems: {
    type: [problemSchema],
    default: [],
    validate: {
      validator: (value: unknown[]) => value.length <= SERVICE_PROBLEMS_MAX,
      message: `At most ${SERVICE_PROBLEMS_MAX} problems are allowed`,
    },
  },
  icon_key: { type: String, enum: CONTENT_ICON_KEYS },
  visual_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

configureRepeatableRecordSchema(schema, {
  index_prefix: "service",
  search_fields: ["title", "summary", "outcome", "capabilities"],
});

const Service =
  (mongoose.models.Service as Model<TService>) ||
  mongoose.model<TService>("Service", schema);

export default Service;
