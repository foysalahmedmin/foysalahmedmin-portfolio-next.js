import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import {
  LEGAL_DOCUMENT_TYPES,
  type TLegalDocument,
} from "./legal-document.type";

const sectionSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      maxlength: 64,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    heading: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 10_000 },
  },
  { _id: false, strict: "throw" }
);

const schema = new Schema<TLegalDocument>({
  ...commonRecordFields,
  type: { type: String, enum: LEGAL_DOCUMENT_TYPES, required: true },
  document_version: {
    type: String,
    required: true,
    match: /^\d{1,4}\.\d{1,4}(?:\.\d{1,4})?$/,
  },
  effective_at: { type: Date, required: true },
  sections: { type: [sectionSchema], required: true },
  reviewed_at: { type: Date },
  reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  supersedes: {
    type: Schema.Types.ObjectId,
    ref: "LegalDocument",
    default: null,
  },
  document_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

schema.pre(
  "validate",
  function validateLegalDocument(this: HydratedDocument<TLegalDocument>) {
    if (
      new Set(this.sections.map(({ key }) => key)).size !== this.sections.length
    ) {
      throw new Error("Legal section keys must be unique");
    }
    if (
      this.status === "published" &&
      (!this.reviewed_at || !this.reviewed_by)
    ) {
      throw new Error("Published legal documents require a completed review");
    }
  }
);

configureRepeatableRecordSchema(schema, {
  index_prefix: "legal_document",
  search_fields: ["title", "summary", "sections.heading", "sections.body"],
  additional_indexes: [
    [
      { locale: 1, type: 1, document_version: 1 },
      {
        unique: true,
        partialFilterExpression: { is_deleted: false },
        name: "legal_document_active_type_version_unique",
      },
    ],
    [
      { type: 1, status: 1, effective_at: -1, _id: 1 },
      {
        partialFilterExpression: { is_deleted: false },
        name: "legal_document_public_type_effective",
      },
    ],
  ],
});

const LegalDocument =
  (mongoose.models.LegalDocument as Model<TLegalDocument>) ||
  mongoose.model<TLegalDocument>("LegalDocument", schema, "legal_documents");

export default LegalDocument;
