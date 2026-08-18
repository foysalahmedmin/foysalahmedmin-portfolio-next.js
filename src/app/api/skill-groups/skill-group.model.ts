import mongoose, { Schema, type Model } from "mongoose";
import { CONTENT_ICON_KEYS } from "../repeatable-content/record.constants";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import type { TSkillGroup } from "./skill-group.type";

const schema = new Schema<TSkillGroup>({
  ...commonRecordFields,
  description: { type: String, required: true, trim: true, maxlength: 1_200 },
  icon_key: { type: String, enum: CONTENT_ICON_KEYS },
  visual_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

configureRepeatableRecordSchema(schema, {
  index_prefix: "skill_group",
  search_fields: ["title", "summary", "description"],
});

const SkillGroup =
  (mongoose.models.SkillGroup as Model<TSkillGroup>) ||
  mongoose.model<TSkillGroup>("SkillGroup", schema, "skill_groups");

export default SkillGroup;
