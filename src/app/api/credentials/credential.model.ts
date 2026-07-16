import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import { CREDENTIAL_TYPES, type TCredential } from "./credential.type";

const schema = new Schema<TCredential>({
  ...commonRecordFields,
  type: { type: String, enum: CREDENTIAL_TYPES, required: true },
  issuer: { type: String, required: true, trim: true, maxlength: 180 },
  issued_at: { type: Date, required: true },
  expires_at: { type: Date, default: null },
  credential_url: { type: String, trim: true, maxlength: 2_048 },
  credential_id: { type: String, trim: true, maxlength: 180 },
  verification_source: {
    type: String,
    enum: ["issuer", "document", "manual_review"],
  },
  verification_reference: { type: String, trim: true, maxlength: 240 },
  verified_at: { type: Date },
  verified_by: { type: Schema.Types.ObjectId, ref: "User" },
  visual_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
  proof_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

schema.pre(
  "validate",
  function validateCredential(this: HydratedDocument<TCredential>) {
    if (this.expires_at && this.issued_at >= this.expires_at) {
      throw new Error("Credential expiry must follow issue date");
    }
    if (this.status === "published") {
      if (this.claim_verification !== "verified") {
        throw new Error("Published credentials must be verified");
      }
      if (
        !this.verification_source ||
        !this.verification_reference ||
        !this.verified_at ||
        !this.verified_by
      ) {
        throw new Error("Published credentials require reviewer metadata");
      }
    }
  }
);

configureRepeatableRecordSchema(schema, {
  index_prefix: "credential",
  search_fields: ["title", "summary", "issuer"],
  additional_indexes: [
    [
      { type: 1, status: 1, issued_at: -1, sequence: 1, _id: 1 },
      {
        partialFilterExpression: { is_deleted: false },
        name: "credential_public_type_issued",
      },
    ],
  ],
});

const Credential =
  (mongoose.models.Credential as Model<TCredential>) ||
  mongoose.model<TCredential>("Credential", schema);

export default Credential;
