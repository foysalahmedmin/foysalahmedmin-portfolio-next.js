import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import { CONTACT_PRIVACY_ACTIONS } from "./contact.validation";

export type TContactPrivacyRequestDocument = Document & {
  _id: Types.ObjectId;
  request_id: string;
  action: (typeof CONTACT_PRIVACY_ACTIONS)[number];
  email_hash: string;
  verification_hash: string;
  status: "active" | "processing" | "fulfilled";
  attempts: number;
  expires_at: Date;
  claimed_at?: Date | null;
  fulfilled_at?: Date | null;
  result_count?: number | null;
  created_at: Date;
  updated_at: Date;
};

const contactPrivacyRequestSchema = new Schema<TContactPrivacyRequestDocument>(
  {
    request_id: {
      type: String,
      required: true,
      immutable: true,
      unique: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    },
    action: {
      type: String,
      enum: CONTACT_PRIVACY_ACTIONS,
      required: true,
      immutable: true,
    },
    email_hash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      match: /^[a-f0-9]{64}$/,
    },
    verification_hash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      match: /^[a-f0-9]{64}$/,
    },
    status: {
      type: String,
      enum: ["active", "processing", "fulfilled"],
      required: true,
      default: "active",
    },
    attempts: { type: Number, required: true, default: 0, min: 0, max: 5 },
    expires_at: { type: Date, required: true, immutable: true },
    claimed_at: { type: Date, default: null },
    fulfilled_at: { type: Date, default: null },
    result_count: { type: Number, default: null, min: 0, max: 10_000 },
  },
  {
    collection: "contact_privacy_requests",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    strict: "throw",
  }
);

contactPrivacyRequestSchema.index(
  { expires_at: 1 },
  { name: "contact_privacy_request_expiry", expireAfterSeconds: 0 }
);
contactPrivacyRequestSchema.index(
  { status: 1, expires_at: 1 },
  { name: "contact_privacy_status_expiry" }
);

const ContactPrivacyRequest =
  (mongoose.models
    .ContactPrivacyRequest as Model<TContactPrivacyRequestDocument>) ||
  mongoose.model<TContactPrivacyRequestDocument>(
    "ContactPrivacyRequest",
    contactPrivacyRequestSchema
  );

export default ContactPrivacyRequest;
