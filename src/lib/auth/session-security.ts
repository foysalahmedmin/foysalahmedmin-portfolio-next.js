import { createHash, randomUUID } from "node:crypto";
import { ENV } from "@/config";
import type { TUser } from "@/app/api/users/user.type";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const AUTH_TOKEN_ISSUER = "foysalahmedmin-portfolio";
export const AUTH_TOKEN_AUDIENCE = "foysalahmedmin-admin";

export type AccessTokenClaims = JwtPayload & {
  _id: string;
  sid: string;
  token_use: "access";
  iat: number;
  exp: number;
};

export type RefreshTokenClaims = JwtPayload & {
  _id: string;
  sid: string;
  family_id: string;
  rotation: number;
  token_use: "refresh";
  iat: number;
  exp: number;
};

type SessionUserState = Pick<
  TUser,
  "role" | "status" | "is_deleted" | "password_changed_at"
>;

const isMongoId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const isOpaqueId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d-]{20,80}$/i.test(value);

export const hashRefreshToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const evaluateRefreshPresentation = (input: {
  storedFamilyId: string;
  storedTokenHash: string;
  storedRotation: number;
  presentedFamilyId: string;
  presentedTokenHash: string;
  presentedRotation: number;
}): "valid" | "invalid-family" | "reuse-detected" => {
  if (input.storedFamilyId !== input.presentedFamilyId) {
    return "invalid-family";
  }
  if (
    input.storedTokenHash !== input.presentedTokenHash ||
    input.storedRotation !== input.presentedRotation
  ) {
    return "reuse-detected";
  }
  return "valid";
};

export const createSessionId = (): string => randomUUID();
export const createSessionFamilyId = (): string => randomUUID();

export const getUserStateHash = (user: SessionUserState): string => {
  const passwordChangedAt = user.password_changed_at
    ? new Date(user.password_changed_at)
    : null;
  const changedAt =
    passwordChangedAt && Number.isFinite(passwordChangedAt.getTime())
      ? passwordChangedAt.toISOString()
      : passwordChangedAt
        ? "invalid"
        : "none";
  return createHash("sha256")
    .update(
      JSON.stringify([
        user.role,
        user.status,
        Boolean(user.is_deleted),
        changedAt,
      ]),
      "utf8"
    )
    .digest("hex");
};

const strictVerify = (token: string, secret: string): JwtPayload => {
  const verified = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: AUTH_TOKEN_ISSUER,
    audience: AUTH_TOKEN_AUDIENCE,
    complete: false,
  });
  if (typeof verified === "string") throw new Error("invalid_token");
  return verified;
};

export const signAccessToken = (
  userId: string,
  sid: string,
  nowSeconds = Math.floor(Date.now() / 1_000)
): { token: string; expiresAt: Date } => {
  const expiresAtSeconds = nowSeconds + ACCESS_TOKEN_TTL_SECONDS;
  const token = jwt.sign(
    {
      _id: userId,
      sid,
      token_use: "access",
    },
    ENV.jwt_access_secret,
    {
      algorithm: "HS256",
      audience: AUTH_TOKEN_AUDIENCE,
      issuer: AUTH_TOKEN_ISSUER,
      jwtid: randomUUID(),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      noTimestamp: false,
    }
  );
  return { token, expiresAt: new Date(expiresAtSeconds * 1_000) };
};

export const signRefreshToken = (
  userId: string,
  sid: string,
  familyId: string,
  rotation: number,
  nowSeconds = Math.floor(Date.now() / 1_000)
): { token: string; expiresAt: Date } => {
  const expiresAtSeconds = nowSeconds + REFRESH_TOKEN_TTL_SECONDS;
  const token = jwt.sign(
    {
      _id: userId,
      sid,
      family_id: familyId,
      rotation,
      token_use: "refresh",
    },
    ENV.jwt_refresh_secret,
    {
      algorithm: "HS256",
      audience: AUTH_TOKEN_AUDIENCE,
      issuer: AUTH_TOKEN_ISSUER,
      jwtid: randomUUID(),
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      noTimestamp: false,
    }
  );
  return { token, expiresAt: new Date(expiresAtSeconds * 1_000) };
};

export const verifyAccessTokenStrict = (token: string): AccessTokenClaims => {
  const claims = strictVerify(token, ENV.jwt_access_secret);
  if (
    claims.token_use !== "access" ||
    !isMongoId(claims._id) ||
    !isOpaqueId(claims.sid) ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    throw new Error("invalid_access_claims");
  }
  return claims as AccessTokenClaims;
};

export const verifyRefreshTokenStrict = (token: string): RefreshTokenClaims => {
  const claims = strictVerify(token, ENV.jwt_refresh_secret);
  if (
    claims.token_use !== "refresh" ||
    !isMongoId(claims._id) ||
    !isOpaqueId(claims.sid) ||
    !isOpaqueId(claims.family_id) ||
    !Number.isInteger(claims.rotation) ||
    Number(claims.rotation) < 0 ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number"
  ) {
    throw new Error("invalid_refresh_claims");
  }
  return claims as RefreshTokenClaims;
};

export const decodeTokenExpiry = (token: string): Date | null => {
  const claims = jwt.decode(token);
  return claims && typeof claims !== "string" && typeof claims.exp === "number"
    ? new Date(claims.exp * 1_000)
    : null;
};
