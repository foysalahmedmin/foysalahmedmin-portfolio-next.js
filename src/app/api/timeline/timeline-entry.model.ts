import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import {
  TIMELINE_ENTRY_TYPES,
  type TTimelineEntry,
} from "./timeline-entry.type";

const schema = new Schema<TTimelineEntry>({
  ...commonRecordFields,
  type: { type: String, enum: TIMELINE_ENTRY_TYPES, required: true },
  organization: { type: String, required: true, trim: true, maxlength: 180 },
  position: { type: String, required: true, trim: true, maxlength: 180 },
  location: { type: String, trim: true, maxlength: 160 },
  started_at: { type: Date, required: true },
  ended_at: { type: Date, default: null },
  is_current: { type: Boolean, default: false },
  highlights: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  verification_source: {
    type: String,
    enum: ["document", "public_record", "manual_review"],
  },
  verification_reference: { type: String, trim: true, maxlength: 240 },
  verified_at: { type: Date },
  verified_by: { type: Schema.Types.ObjectId, ref: "User" },
  visual_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

schema.pre(
  "validate",
  function validateTimelineEntry(this: HydratedDocument<TTimelineEntry>) {
    if (this.is_current && this.ended_at) {
      throw new Error("A current timeline entry cannot have an end date");
    }
    if (this.ended_at && this.started_at > this.ended_at) {
      throw new Error("The timeline end date cannot precede the start date");
    }
    if (this.status === "published") {
      if (!["derived", "verified"].includes(this.claim_verification)) {
        throw new Error(
          "Published timeline claims must be derived or verified"
        );
      }
      if (!this.verification_source || !this.verification_reference) {
        throw new Error("Published timeline claims require evidence metadata");
      }
      if (
        this.claim_verification === "verified" &&
        (!this.verified_at || !this.verified_by)
      ) {
        throw new Error("Verified timeline claims require reviewer metadata");
      }
    }
  }
);

configureRepeatableRecordSchema(schema, {
  index_prefix: "timeline",
  search_fields: ["title", "summary", "organization", "position", "highlights"],
  additional_indexes: [
    [
      { type: 1, status: 1, started_at: -1, sequence: 1, _id: 1 },
      {
        partialFilterExpression: { is_deleted: false },
        name: "timeline_public_type_started",
      },
    ],
  ],
});

const TimelineEntry =
  (mongoose.models.TimelineEntry as Model<TTimelineEntry>) ||
  mongoose.model<TTimelineEntry>("TimelineEntry", schema, "timeline_entries");

export default TimelineEntry;
