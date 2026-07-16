import mongoose, { Schema, type Model } from "mongoose";
import { CONTENT_ICON_KEYS } from "../repeatable-content/record.constants";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import type { TService } from "./service.type";

const schema = new Schema<TService>({
  ...commonRecordFields,
  outcome: { type: String, required: true, trim: true, maxlength: 600 },
  capabilities: { type: [String], required: true, default: [] },
  deliverables: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
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
