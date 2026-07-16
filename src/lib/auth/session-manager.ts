import User from "@/app/api/users/user.model";
import type { TUser } from "@/app/api/users/user.type";
import * as SessionRepository from "@/app/api/auth/session.repository";
import type { SessionRevocationReason } from "@/app/api/auth/session.model";
import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { TJwtPayload, TRole } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import {
  createSessionFamilyId,
  createSessionId,
  evaluateRefreshPresentation,
  getUserStateHash,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessTokenStrict,
  verifyRefreshTokenStrict,
} from "./session-security";

export type SessionPrincipal = Required<
  Pick<TJwtPayload, "_id" | "name" | "email" | "role">
> &
  Pick<TJwtPayload, "image" | "is_verified"> & {
    session_id: string;
    access_expires_at: Date;
  };

export type AuthTokenPair = {
  access_token: string;
  refresh_token: string;
  access_expires_at: Date;
  refresh_expires_at: Date;
  principal: SessionPrincipal;
};

type AuthUserRecord = Pick<
  TUser,
  | "name"
  | "email"
  | "image"
  | "role"
  | "status"
  | "is_verified"
  | "is_deleted"
  | "password_changed_at"
> & { _id: { toString(): string } };

const unauthorized = (): AppError =>
  new AppError(
    httpStatus.UNAUTHORIZED,
    "Your session is invalid or has expired. Please sign in again."
  );

const loadSessionUser = async (
  userId: string
): Promise<AuthUserRecord | null> =>
  (await setSoftDeleteScope(User.findById(userId), "with_deleted")
    .select(
      "name email image role status is_verified +password_changed_at +is_deleted"
    )
    .lean()) as AuthUserRecord | null;

const isEligible = (user: AuthUserRecord | null): boolean =>
  Boolean(user && !user.is_deleted && user.status !== "blocked");

const buildJwtPrincipal = (user: AuthUserRecord): TJwtPayload => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  image:
    typeof user.image === "string"
      ? user.image
      : user.image
        ? user.image.toString()
        : undefined,
  role: user.role,
  is_verified: Boolean(user.is_verified),
});

const buildPrincipal = (
  user: AuthUserRecord,
  sid: string,
  accessExpiresAt: Date
): SessionPrincipal => ({
  ...buildJwtPrincipal(user),
  role: user.role,
  session_id: sid,
  access_expires_at: accessExpiresAt,
});

export const createAuthSession = async (
  user: AuthUserRecord,
  options: { mfaVerifiedAt?: Date | null } = {}
): Promise<AuthTokenPair> => {
  await connectDB();
  if (!isEligible(user)) throw unauthorized();

  const sid = createSessionId();
  const familyId = createSessionFamilyId();
  const jwtPrincipal = buildJwtPrincipal(user);
  const access = signAccessToken(jwtPrincipal._id, sid);
  const refresh = signRefreshToken(user._id.toString(), sid, familyId, 0);

  await SessionRepository.create({
    sid,
    family_id: familyId,
    user: user._id.toString(),
    refresh_token_hash: hashRefreshToken(refresh.token),
    user_state_hash: getUserStateHash(user),
    role_snapshot: user.role,
    rotation_count: 0,
    last_used_at: new Date(),
    expires_at: refresh.expiresAt,
    mfa_verified_at: options.mfaVerifiedAt,
  });

  return {
    access_token: access.token,
    refresh_token: refresh.token,
    access_expires_at: access.expiresAt,
    refresh_expires_at: refresh.expiresAt,
    principal: buildPrincipal(user, sid, access.expiresAt),
  };
};

export const verifyAccessSessionToken = async (
  token: string
): Promise<SessionPrincipal> => {
  let claims;
  try {
    claims = verifyAccessTokenStrict(token);
  } catch {
    throw unauthorized();
  }

  await connectDB();
  const session = await SessionRepository.findBySid(claims.sid);
  const now = new Date();
  if (
    !session ||
    session.revoked_at ||
    session.expires_at.getTime() <= now.getTime() ||
    session.user.toString() !== claims._id
  ) {
    throw unauthorized();
  }

  const user = await loadSessionUser(claims._id);
  if (!user || user.is_deleted || user.status === "blocked") {
    await SessionRepository.revokeBySid(
      claims.sid,
      user?.is_deleted ? "user-deleted" : "status-changed"
    );
    throw unauthorized();
  }

  const currentStateHash = getUserStateHash(user);
  if (currentStateHash !== session.user_state_hash) {
    await SessionRepository.revokeFamily(
      session.family_id,
      "user-state-changed"
    );
    throw unauthorized();
  }

  await SessionRepository.touch(session.sid, now);
  return buildPrincipal(user, session.sid, new Date(claims.exp * 1_000));
};

export const rotateRefreshSession = async (
  token: string,
  beforeRotate?: (familyId: string) => Promise<void>
): Promise<AuthTokenPair> => {
  let claims;
  try {
    claims = verifyRefreshTokenStrict(token);
  } catch {
    throw unauthorized();
  }

  if (beforeRotate) await beforeRotate(claims.family_id);
  await connectDB();
  const session = await SessionRepository.findBySid(claims.sid);
  const now = new Date();
  if (!session) throw unauthorized();
  if (session.user.toString() !== claims._id) {
    await SessionRepository.revokeBySid(session.sid, "user-state-changed", now);
    throw unauthorized();
  }

  const presentedHash = hashRefreshToken(token);
  const presentation = evaluateRefreshPresentation({
    storedFamilyId: session.family_id,
    storedTokenHash: session.refresh_token_hash,
    storedRotation: session.rotation_count,
    presentedFamilyId: claims.family_id,
    presentedTokenHash: presentedHash,
    presentedRotation: claims.rotation,
  });
  if (presentation === "invalid-family") throw unauthorized();
  if (presentation === "reuse-detected") {
    await SessionRepository.revokeFamily(
      session.family_id,
      "refresh-reuse-detected",
      now
    );
    throw unauthorized();
  }

  if (session.revoked_at || session.expires_at.getTime() <= now.getTime()) {
    throw unauthorized();
  }

  const user = await loadSessionUser(claims._id);
  if (!user || user.is_deleted || user.status === "blocked") {
    await SessionRepository.revokeFamily(
      session.family_id,
      user?.is_deleted ? "user-deleted" : "status-changed",
      now
    );
    throw unauthorized();
  }

  if (getUserStateHash(user) !== session.user_state_hash) {
    await SessionRepository.revokeFamily(
      session.family_id,
      "user-state-changed",
      now
    );
    throw unauthorized();
  }

  const nextRotation = claims.rotation + 1;
  const access = signAccessToken(user._id.toString(), session.sid);
  const refresh = signRefreshToken(
    user._id.toString(),
    session.sid,
    session.family_id,
    nextRotation
  );
  const rotated = await SessionRepository.rotate({
    sid: session.sid,
    family_id: session.family_id,
    current_hash: presentedHash,
    current_rotation: claims.rotation,
    next_hash: hashRefreshToken(refresh.token),
    next_rotation: nextRotation,
    next_expiry: refresh.expiresAt,
    now,
  });

  if (!rotated) {
    await SessionRepository.revokeFamily(
      session.family_id,
      "refresh-reuse-detected",
      now
    );
    throw unauthorized();
  }

  return {
    access_token: access.token,
    refresh_token: refresh.token,
    access_expires_at: access.expiresAt,
    refresh_expires_at: refresh.expiresAt,
    principal: buildPrincipal(user, session.sid, access.expiresAt),
  };
};

export const revokeTokenSession = async (
  tokens: { accessToken?: string; refreshToken?: string },
  reason: SessionRevocationReason = "logout"
): Promise<void> => {
  await connectDB();
  if (tokens.refreshToken) {
    try {
      const claims = verifyRefreshTokenStrict(tokens.refreshToken);
      await SessionRepository.revokeFamily(claims.family_id, reason);
      return;
    } catch {
      // A valid access token can still identify the server session.
    }
  }
  if (tokens.accessToken) {
    try {
      const claims = verifyAccessTokenStrict(tokens.accessToken);
      await SessionRepository.revokeBySid(claims.sid, reason);
    } catch {
      // Logout is deliberately idempotent even for expired/invalid cookies.
    }
  }
};

export const revokeUserSessions = async (
  userId: string,
  reason: SessionRevocationReason
): Promise<number> => {
  await connectDB();
  return await SessionRepository.revokeForUser(userId, reason);
};

export const deleteUserSessions = async (userId: string): Promise<number> => {
  await connectDB();
  return await SessionRepository.deleteForUser(userId);
};

export const roleFromPrincipal = (principal: SessionPrincipal): TRole =>
  principal.role as TRole;
