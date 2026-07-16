import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";
import type { TRole } from "@/types/jsonwebtoken.type";

export const SESSION_REVOCATION_REASONS = [
  "logout",
  "password-changed",
  "role-changed",
  "status-changed",
  "user-deleted",
  "administrator-revoked",
  "refresh-reuse-detected",
  "user-state-changed",
] as const;

export type SessionRevocationReason =
  (typeof SESSION_REVOCATION_REASONS)[number];

export type TAuthSessionDocument = Document & {
  _id: Types.ObjectId;
  sid: string;
  family_id: string;
  user: Types.ObjectId;
  refresh_token_hash: string;
  user_state_hash: string;
  role_snapshot: TRole;
  rotation_count: number;
  last_used_at: Date;
  expires_at: Date;
  mfa_verified_at?: Date | null;
  revoked_at?: Date | null;
  revocation_reason?: SessionRevocationReason | null;
  created_at: Date;
  updated_at: Date;
};

const authSessionSchema = new Schema<TAuthSessionDocument>(
  {
    sid: { type: String, required: true, immutable: true },
    family_id: { type: String, required: true, immutable: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    refresh_token_hash: {
      type: String,
      required: true,
      select: false,
    },
    user_state_hash: { type: String, required: true },
    role_snapshot: { type: String, required: true },
    rotation_count: { type: Number, required: true, min: 0, default: 0 },
    last_used_at: { type: Date, required: true, default: Date.now },
    expires_at: { type: Date, required: true },
    mfa_verified_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null },
    revocation_reason: {
      type: String,
      enum: [...SESSION_REVOCATION_REASONS, null],
      default: null,
    },
  },
  {
    collection: "auth_sessions",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

authSessionSchema.index(
  { sid: 1 },
  { unique: true, name: "unique_session_id" }
);
authSessionSchema.index({ family_id: 1, revoked_at: 1 });
authSessionSchema.index({ user: 1, revoked_at: 1, expires_at: 1 });
authSessionSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: "expire_auth_sessions" }
);

authSessionSchema.set("toJSON", {
  transform: (_document, value) => {
    const safeValue = value as unknown as Record<string, unknown>;
    delete safeValue.refresh_token_hash;
    delete safeValue.family_id;
    delete safeValue.sid;
    delete safeValue.user_state_hash;
    return safeValue;
  },
});

const AuthSession =
  (mongoose.models.AuthSession as Model<TAuthSessionDocument>) ||
  mongoose.model<TAuthSessionDocument>("AuthSession", authSessionSchema);

export default AuthSession;
