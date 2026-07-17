import User from "@/app/api/users/user.model";
import type { TUserDocument } from "@/app/api/users/user.type";
import type { ClientSession } from "mongoose";
import MfaChallenge, {
  type MfaChallengePurpose,
  type TMfaChallengeDocument,
} from "./mfa-challenge.model";
import MfaCredential, {
  type TMfaCredentialDocument,
} from "./mfa-credential.model";

const CHALLENGE_SECRETS =
  "+token_hash +user_state_hash +pending_secret_encrypted user purpose attempts max_attempts expires_at consumed_at";
const CREDENTIAL_SECRETS =
  "+encrypted_secret +recovery_code_hashes +last_used_counter";

const withSession = <T extends { session(session: ClientSession): T }>(
  query: T,
  session?: ClientSession
): T => (session ? query.session(session) : query);

export const hasCredential = async (
  userId: string,
  session?: ClientSession
): Promise<boolean> =>
  Boolean(await withSession(MfaCredential.exists({ user: userId }), session));

export const invalidateActiveChallenges = async (
  userId: string,
  now: Date,
  session?: ClientSession
): Promise<void> => {
  await MfaChallenge.updateMany(
    { user: userId, consumed_at: null },
    { $set: { consumed_at: now } },
    { session }
  );
};

export const createChallenge = async (
  input: {
    user: string;
    purpose: MfaChallengePurpose;
    token_hash: string;
    user_state_hash: string;
    pending_secret_encrypted?: string | null;
    expires_at: Date;
    max_attempts: number;
  },
  session?: ClientSession
): Promise<TMfaChallengeDocument> => {
  const [challenge] = await MfaChallenge.create(
    [input],
    session ? { session } : {}
  );
  return challenge!;
};

export const registerChallengeAttempt = async (
  tokenHash: string,
  purpose: MfaChallengePurpose,
  now: Date,
  session?: ClientSession
): Promise<TMfaChallengeDocument | null> =>
  await MfaChallenge.findOneAndUpdate(
    {
      token_hash: tokenHash,
      purpose,
      consumed_at: null,
      expires_at: { $gt: now },
      $expr: { $lt: ["$attempts", "$max_attempts"] },
    },
    { $inc: { attempts: 1 } },
    { new: true, session }
  ).select(CHALLENGE_SECRETS);

export const findChallengeForAudit = async (
  tokenHash: string,
  purpose: MfaChallengePurpose
): Promise<TMfaChallengeDocument | null> =>
  await MfaChallenge.findOne({ token_hash: tokenHash, purpose }).select(
    "+token_hash user purpose attempts max_attempts expires_at consumed_at"
  );

export const consumeChallenge = async (
  id: string,
  now: Date,
  session?: ClientSession
): Promise<boolean> => {
  const result = await MfaChallenge.updateOne(
    { _id: id, consumed_at: null, expires_at: { $gt: now } },
    { $set: { consumed_at: now } },
    { session }
  );
  return result.modifiedCount === 1;
};

export const createCredential = async (
  input: {
    user: string;
    encrypted_secret: string;
    recovery_code_hashes: string[];
    enabled_at: Date;
  },
  session?: ClientSession
): Promise<TMfaCredentialDocument | null> => {
  try {
    const [credential] = await MfaCredential.create(
      [input],
      session ? { session } : {}
    );
    return credential!;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return null;
    }
    throw error;
  }
};

export const findCredentialWithSecrets = async (
  userId: string,
  session?: ClientSession
): Promise<TMfaCredentialDocument | null> =>
  await withSession(
    MfaCredential.findOne({ user: userId }).select(CREDENTIAL_SECRETS),
    session
  );

export const consumeTotpCounter = async (
  credentialId: string,
  counter: number,
  session?: ClientSession
): Promise<boolean> => {
  const result = await MfaCredential.updateOne(
    {
      _id: credentialId,
      $or: [
        { last_used_counter: { $lt: counter } },
        { last_used_counter: null },
        { last_used_counter: { $exists: false } },
      ],
    },
    { $set: { last_used_counter: counter } },
    { session }
  );
  return result.modifiedCount === 1;
};

export const consumeRecoveryCodeHash = async (
  credentialId: string,
  recoveryHash: string,
  session?: ClientSession
): Promise<boolean> => {
  const result = await MfaCredential.updateOne(
    { _id: credentialId, recovery_code_hashes: recoveryHash },
    { $pull: { recovery_code_hashes: recoveryHash } },
    { session }
  );
  return result.modifiedCount === 1;
};

export const incrementUserMfaVersion = async (
  userId: string,
  expected: Pick<
    TUserDocument,
    "role" | "status" | "is_deleted" | "password_changed_at" | "mfa_version"
  >,
  session?: ClientSession
): Promise<TUserDocument | null> => {
  const expectedVersion = expected.mfa_version ?? 0;
  return await User.findOneAndUpdate(
    {
      $and: [
        {
          _id: userId,
          role: expected.role,
          status: expected.status,
          is_deleted: expected.is_deleted,
          password_changed_at: expected.password_changed_at,
        },
        expectedVersion === 0
          ? {
              $or: [{ mfa_version: 0 }, { mfa_version: { $exists: false } }],
            }
          : { mfa_version: expectedVersion },
      ],
    },
    { $inc: { mfa_version: 1 } },
    { new: true, session }
  ).select("+password_changed_at +is_deleted +mfa_version");
};

export const findEligibleUser = async (
  userId: string,
  session?: ClientSession
): Promise<TUserDocument | null> =>
  await withSession(
    User.findOne({
      _id: userId,
      status: { $ne: "blocked" },
    }).select("+password_changed_at +is_deleted +mfa_version"),
    session
  );

export const findResetEligibleUserByEmail = async (
  normalizedEmail: string,
  session: ClientSession
): Promise<TUserDocument | null> =>
  await User.findOne({
    email: normalizedEmail,
    status: { $ne: "blocked" },
  })
    .select("+password_changed_at +is_deleted +mfa_version")
    .session(session);

export const deleteCredentialForUser = async (
  userId: string,
  session: ClientSession
): Promise<boolean> => {
  const result = await MfaCredential.deleteOne({ user: userId }, { session });
  return result.deletedCount === 1;
};
