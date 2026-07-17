import AuthSession, {
  type SessionRevocationReason,
  type TAuthSessionDocument,
} from "./session.model";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { ClientSession } from "mongoose";

export type CreateSessionInput = {
  sid: string;
  family_id: string;
  user: string;
  refresh_token_hash: string;
  user_state_hash: string;
  role_snapshot: TRole;
  rotation_count: number;
  last_used_at: Date;
  expires_at: Date;
  mfa_verified_at?: Date | null;
};

export const create = async (
  input: CreateSessionInput,
  session?: ClientSession
): Promise<TAuthSessionDocument> => {
  const [created] = await AuthSession.create(
    [input],
    session ? { session } : {}
  );
  return created!;
};

export const findBySid = async (
  sid: string
): Promise<TAuthSessionDocument | null> =>
  await AuthSession.findOne({ sid }).select("+refresh_token_hash");

export const rotate = async (input: {
  sid: string;
  family_id: string;
  current_hash: string;
  current_rotation: number;
  next_hash: string;
  next_rotation: number;
  next_expiry: Date;
  now: Date;
}): Promise<TAuthSessionDocument | null> =>
  await AuthSession.findOneAndUpdate(
    {
      sid: input.sid,
      family_id: input.family_id,
      refresh_token_hash: input.current_hash,
      rotation_count: input.current_rotation,
      revoked_at: null,
      expires_at: { $gt: input.now },
    },
    {
      $set: {
        refresh_token_hash: input.next_hash,
        rotation_count: input.next_rotation,
        expires_at: input.next_expiry,
        last_used_at: input.now,
      },
    },
    { new: true }
  ).select("+refresh_token_hash");

export const touch = async (sid: string, now: Date): Promise<void> => {
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1_000);
  await AuthSession.updateOne(
    {
      sid,
      revoked_at: null,
      last_used_at: { $lt: fiveMinutesAgo },
    },
    { $set: { last_used_at: now } }
  );
};

export const revokeFamily = async (
  familyId: string,
  reason: SessionRevocationReason,
  now = new Date()
): Promise<number> => {
  const result = await AuthSession.updateMany(
    { family_id: familyId, revoked_at: null },
    { $set: { revoked_at: now, revocation_reason: reason } }
  );
  return result.modifiedCount;
};

export const revokeBySid = async (
  sid: string,
  reason: SessionRevocationReason,
  now = new Date()
): Promise<number> => {
  const result = await AuthSession.updateMany(
    { sid, revoked_at: null },
    { $set: { revoked_at: now, revocation_reason: reason } }
  );
  return result.modifiedCount;
};

export const revokeForUser = async (
  userId: string,
  reason: SessionRevocationReason,
  now = new Date(),
  session?: ClientSession
): Promise<number> => {
  const result = await AuthSession.updateMany(
    { user: userId, revoked_at: null },
    { $set: { revoked_at: now, revocation_reason: reason } },
    { session }
  );
  return result.modifiedCount;
};

export const deleteForUser = async (userId: string): Promise<number> => {
  const result = await AuthSession.deleteMany({ user: userId });
  return result.deletedCount;
};
