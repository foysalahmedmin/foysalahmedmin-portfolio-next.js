import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import {
  TESTIMONIAL_CONSENT_SCOPES,
  TESTIMONIAL_RELATIONSHIPS,
  TESTIMONIAL_SOURCE_TYPES,
  type TTestimonial,
} from "./testimonial.type";

const schema = new Schema<TTestimonial>({
  ...commonRecordFields,
  quote: { type: String, required: true, trim: true, maxlength: 2_000 },
  person_name: { type: String, required: true, trim: true, maxlength: 160 },
  person_role: { type: String, trim: true, maxlength: 160 },
  organization: { type: String, trim: true, maxlength: 180 },
  relationship: {
    type: String,
    enum: TESTIMONIAL_RELATIONSHIPS,
    required: true,
  },
  source_type: { type: String, enum: TESTIMONIAL_SOURCE_TYPES, required: true },
  source_reference: { type: String, trim: true, maxlength: 240 },
  source_label: { type: String, trim: true, maxlength: 160 },
  source_url: { type: String, trim: true, maxlength: 2_048 },
  consent_status: {
    type: String,
    enum: ["pending", "granted", "revoked"],
    default: "pending",
    required: true,
  },
  consent_scopes: {
    type: [String],
    enum: TESTIMONIAL_CONSENT_SCOPES,
    default: [],
  },
  consented_at: { type: Date },
  verified_at: { type: Date },
  verified_by: { type: Schema.Types.ObjectId, ref: "User" },
  avatar_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
  proof_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

schema.pre(
  "validate",
  function validateTestimonialTrust(this: HydratedDocument<TTestimonial>) {
    if (
      this.consent_status === "granted" &&
      (!this.consented_at || !this.consent_scopes.includes("public_site"))
    ) {
      throw new Error("Granted testimonials require explicit public consent");
    }
    if (this.status !== "published") return;
    if (this.claim_verification !== "verified") {
      throw new Error("Published testimonials must be verified");
    }
    if (
      this.consent_status !== "granted" ||
      !this.consented_at ||
      !this.consent_scopes.includes("public_site")
    ) {
      throw new Error("Published testimonials require explicit public consent");
    }
    if (!this.source_reference || !this.verified_at || !this.verified_by) {
      throw new Error(
        "Published testimonials require source and reviewer proof"
      );
    }
  }
);

configureRepeatableRecordSchema(schema, {
  index_prefix: "testimonial",
  search_fields: ["title", "summary", "quote", "person_name", "organization"],
  additional_indexes: [
    [
      {
        status: 1,
        consent_status: 1,
        claim_verification: 1,
        sequence: 1,
        _id: 1,
      },
      {
        partialFilterExpression: { is_deleted: false },
        name: "testimonial_public_trust_sequence",
      },
    ],
  ],
});

const Testimonial =
  (mongoose.models.Testimonial as Model<TTestimonial>) ||
  mongoose.model<TTestimonial>("Testimonial", schema);

export default Testimonial;
