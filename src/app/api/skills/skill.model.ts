import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import {
  SKILL_EVIDENCE_SOURCES,
  SKILL_PROFICIENCY_LEVELS,
  type TSkill,
} from "./skill.type";

const schema = new Schema<TSkill>({
  ...commonRecordFields,
  group: {
    type: Schema.Types.ObjectId,
    ref: "SkillGroup",
    required: true,
  },
  proficiency_level: {
    type: String,
    enum: SKILL_PROFICIENCY_LEVELS,
    required: true,
  },
  evidence_source: { type: String, enum: SKILL_EVIDENCE_SOURCES },
  evidence_reference: {
    type: String,
    trim: true,
    maxlength: 240,
  },
  evidence_verified_at: { type: Date },
  evidence_verified_by: { type: Schema.Types.ObjectId, ref: "User" },
  years_experience: { type: Number, min: 0, max: 60 },
  keywords: { type: [String], default: [] },
  icon_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

schema.pre(
  "validate",
  function validateProficiencyEvidence(this: HydratedDocument<TSkill>) {
    if (this.status !== "published") return;
    if (!["derived", "verified"].includes(this.claim_verification)) {
      throw new Error("Published proficiency must be derived or verified");
    }
    if (!this.evidence_source || !this.evidence_reference) {
      throw new Error("Published proficiency requires evidence metadata");
    }
    if (
      this.claim_verification === "verified" &&
      (!this.evidence_verified_at || !this.evidence_verified_by)
    ) {
      throw new Error("Verified proficiency requires reviewer metadata");
    }
  }
);

configureRepeatableRecordSchema(schema, {
  index_prefix: "skill",
  search_fields: ["title", "summary", "keywords"],
  additional_indexes: [
    [
      { group: 1, status: 1, sequence: 1, _id: 1 },
      {
        partialFilterExpression: { is_deleted: false },
        name: "skill_public_group_sequence",
      },
    ],
  ],
});

const Skill =
  (mongoose.models.Skill as Model<TSkill>) ||
  mongoose.model<TSkill>("Skill", schema);

export default Skill;
