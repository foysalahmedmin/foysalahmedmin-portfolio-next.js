import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import { MFA_CHALLENGE_MAX_ATTEMPTS } from "@/lib/auth/mfa-security";

export type MfaChallengePurpose = "enroll" | "verify";

export type TMfaChallengeDocument = Document & {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  purpose: MfaChallengePurpose;
  token_hash: string;
  user_state_hash: string;
  pending_secret_encrypted?: string | null;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  consumed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

const mfaChallengeSchema = new Schema<TMfaChallengeDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    purpose: {
      type: String,
      enum: ["enroll", "verify"],
      required: true,
      immutable: true,
    },
    token_hash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
    },
    user_state_hash: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f0-9]{64}$/,
      select: false,
    },
    pending_secret_encrypted: {
      type: String,
      default: null,
      immutable: true,
      select: false,
    },
    attempts: { type: Number, min: 0, default: 0, required: true },
    max_attempts: {
      type: Number,
      min: 1,
      max: MFA_CHALLENGE_MAX_ATTEMPTS,
      default: MFA_CHALLENGE_MAX_ATTEMPTS,
      required: true,
      immutable: true,
    },
    expires_at: { type: Date, required: true, immutable: true },
    consumed_at: { type: Date, default: null },
  },
  {
    collection: "auth_mfa_challenges",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

mfaChallengeSchema.index(
  { token_hash: 1 },
  { unique: true, name: "unique_mfa_challenge_token_hash" }
);
mfaChallengeSchema.index(
  { user: 1, consumed_at: 1, expires_at: 1 },
  { name: "mfa_challenge_user_state" }
);
mfaChallengeSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: "expire_mfa_challenges" }
);

mfaChallengeSchema.set("toJSON", {
  transform: (_document, value) => {
    const safeValue = value as unknown as Record<string, unknown>;
    delete safeValue.token_hash;
    delete safeValue.user_state_hash;
    delete safeValue.pending_secret_encrypted;
    return safeValue;
  },
});

const MfaChallenge =
  (mongoose.models.MfaChallenge as Model<TMfaChallengeDocument>) ||
  mongoose.model<TMfaChallengeDocument>("MfaChallenge", mfaChallengeSchema);

export default MfaChallenge;
