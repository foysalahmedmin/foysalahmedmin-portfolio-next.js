import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type PasswordResetStatus = "active" | "processing" | "used";

export type TPasswordResetDocument = Document & {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  token_hash: string;
  status: PasswordResetStatus;
  expires_at: Date;
  used_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

const passwordResetSchema = new Schema<TPasswordResetDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },
    token_hash: {
      type: String,
      required: true,
      immutable: true,
      unique: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["active", "processing", "used"],
      default: "active",
      required: true,
    },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null },
  },
  {
    collection: "password_reset_tokens",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

passwordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ user: 1, status: 1, created_at: -1 });

passwordResetSchema.set("toJSON", {
  transform: (_document, value) => {
    const safeValue = value as unknown as Record<string, unknown>;
    delete safeValue.token_hash;
    return safeValue;
  },
});

const PasswordReset =
  (mongoose.models.PasswordReset as Model<TPasswordResetDocument>) ||
  mongoose.model<TPasswordResetDocument>("PasswordReset", passwordResetSchema);

export default PasswordReset;
