import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type TMfaCredentialDocument = Document & {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  encrypted_secret: string;
  recovery_code_hashes: string[];
  last_used_counter?: number | null;
  enabled_at: Date;
  created_at: Date;
  updated_at: Date;
};

const mfaCredentialSchema = new Schema<TMfaCredentialDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    encrypted_secret: {
      type: String,
      required: true,
      immutable: true,
      select: false,
    },
    recovery_code_hashes: {
      type: [String],
      required: true,
      select: false,
      validate: {
        validator: (values: string[]) =>
          values.length > 0 &&
          values.length <= 20 &&
          values.every((value) => /^[a-f0-9]{64}$/.test(value)),
        message: "Invalid MFA recovery credential state",
      },
    },
    last_used_counter: {
      type: Number,
      default: null,
      min: 0,
      select: false,
    },
    enabled_at: { type: Date, required: true, immutable: true },
  },
  {
    collection: "auth_mfa_credentials",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

mfaCredentialSchema.index(
  { user: 1 },
  { unique: true, name: "unique_mfa_credential_user" }
);

mfaCredentialSchema.set("toJSON", {
  transform: (_document, value) => {
    const safeValue = value as unknown as Record<string, unknown>;
    delete safeValue.encrypted_secret;
    delete safeValue.recovery_code_hashes;
    delete safeValue.last_used_counter;
    return safeValue;
  },
});

const MfaCredential =
  (mongoose.models.MfaCredential as Model<TMfaCredentialDocument>) ||
  mongoose.model<TMfaCredentialDocument>("MfaCredential", mfaCredentialSchema);

export default MfaCredential;
