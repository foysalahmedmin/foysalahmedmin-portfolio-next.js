import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type TContactSubmissionKeyDocument = Document & {
  _id: Types.ObjectId;
  key_hash: string;
  payload_hash: string;
  contact: Types.ObjectId;
  public_receipt: string;
  expires_at: Date;
  created_at: Date;
};

const contactSubmissionKeySchema = new Schema<TContactSubmissionKeyDocument>(
  {
    key_hash: { type: String, required: true, unique: true, immutable: true },
    payload_hash: { type: String, required: true, immutable: true },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      immutable: true,
      index: true,
    },
    public_receipt: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    expires_at: { type: Date, required: true, immutable: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

contactSubmissionKeySchema.index(
  { expires_at: 1 },
  { name: "contact_submission_key_expiry", expireAfterSeconds: 0 }
);

const ContactSubmissionKey =
  (mongoose.models
    .ContactSubmissionKey as Model<TContactSubmissionKeyDocument>) ||
  mongoose.model<TContactSubmissionKeyDocument>(
    "ContactSubmissionKey",
    contactSubmissionKeySchema
  );

export default ContactSubmissionKey;
