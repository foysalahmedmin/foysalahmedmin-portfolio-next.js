import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import { getCapabilitiesForRole, hasCapability } from "@/lib/auth/capabilities";
import { escapeHtml } from "@/lib/security/escape-html";
import {
  createAuthSession,
  revokeUserSessions,
  rotateRefreshSession,
  type AuthTokenPair,
  type SessionPrincipal,
} from "@/lib/auth/session-manager";
import connectDB from "@/lib/db";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import httpStatus from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import * as AuthRepository from "./auth.repository";
import type { TChangePassword, TSignin, TSignup } from "./auth.type";
import type { TForgetPassword, TResetPassword } from "./auth.type";
import PasswordReset from "./password-reset.model";
import { sendEmail } from "@/utils/send-email";

const INVALID_CREDENTIALS = "Invalid email or password.";
const DUMMY_PASSWORD_HASH =
  "$2b$10$7EqJtq98hPqEX7fNZaFWoO5cR7YwYqVb9I6mHf5uVbZf1M7jQvY8K";

export type SafeSessionDTO = {
  id: string;
  name: string;
  role: NonNullable<TJwtPayload["role"]>;
  image?: string;
  is_verified: boolean;
  capabilities: readonly string[];
  access_expires_at: string;
};

export const toSafeSessionDTO = (
  principal: SessionPrincipal
): SafeSessionDTO => ({
  id: principal._id,
  name: principal.name,
  role: principal.role,
  image: principal.image,
  is_verified: Boolean(principal.is_verified),
  capabilities: getCapabilitiesForRole(principal.role),
  access_expires_at: principal.access_expires_at.toISOString(),
});

export const isPublicSignupEnabled = (
  configuredValue = ENV.auth_public_signup_enabled
): boolean => configuredValue?.trim().toLowerCase() === "true";

export const getAdminMfaGate = (
  role: NonNullable<TJwtPayload["role"]>,
  environment = ENV.environment,
  configuredMode = ENV.auth_admin_mfa_mode
): "not-required" | "configuration-required" => {
  if (!hasCapability(role, "admin:access") || environment !== "production") {
    return "not-required";
  }
  return configuredMode?.trim().toLowerCase() === "disabled"
    ? "not-required"
    : "configuration-required";
};

const assertAdminMfaReady = (role: NonNullable<TJwtPayload["role"]>): void => {
  if (getAdminMfaGate(role) === "configuration-required") {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Admin sign-in is unavailable until MFA enrollment is configured."
    );
  }
};

export const signin = async (payload: TSignin): Promise<AuthTokenPair> => {
  if (
    ENV.environment === "production" &&
    ENV.auth_admin_mfa_mode?.trim().toLowerCase() !== "disabled"
  ) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Admin sign-in is unavailable until MFA enrollment is configured."
    );
  }
  await connectDB();
  const email = payload.email.trim().toLowerCase();
  const user = await AuthRepository.findByEmail(email);
  const passwordMatches = user
    ? await bcrypt.compare(payload.password, user.password)
    : await bcrypt.compare(payload.password, DUMMY_PASSWORD_HASH);

  if (
    !user ||
    !passwordMatches ||
    user.is_deleted ||
    user.status === "blocked"
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  assertAdminMfaReady(user.role);
  return await createAuthSession(user);
};

export const signup = async (payload: TSignup): Promise<AuthTokenPair> => {
  await connectDB();
  if (!isPublicSignupEnabled()) {
    throw new AppError(httpStatus.NOT_FOUND, "Public signup is not available.");
  }

  const email = payload.email.trim().toLowerCase();
  const isExist = await AuthRepository.findByEmail(email);
  if (isExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account cannot be created with these details."
    );
  }
  if (payload.image) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Upload a profile image after account creation."
    );
  }

  const user = await AuthRepository.create({
    name: payload.name,
    email,
    password: payload.password,
    role: "user",
    status: "in-progress",
    is_verified: false,
  });
  return await createAuthSession(user);
};

export const refreshToken = async (
  token: string,
  beforeRotate?: (familyId: string) => Promise<void>
): Promise<AuthTokenPair> => await rotateRefreshSession(token, beforeRotate);

export const changePassword = async (
  user: JwtPayload,
  payload: TChangePassword
) => {
  await connectDB();
  const userData = await AuthRepository.findByIdWithSecrets(user._id);
  if (!userData || userData.is_deleted || userData.status === "blocked") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required.");
  }
  if (!(await bcrypt.compare(payload.current_password, userData.password))) {
    throw new AppError(httpStatus.FORBIDDEN, "Current password is incorrect.");
  }

  const hashedNewPassword = await bcrypt.hash(
    payload.new_password,
    Number(ENV.bcrypt_salt_rounds)
  );
  const result = await AuthRepository.updateById(user._id, {
    password: hashedNewPassword,
    password_changed_at: new Date(),
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "User not found.");
  await revokeUserSessions(user._id, "password-changed");
  return { changed: true } as const;
};

const hashRecoveryToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

const getResetBaseUrl = (): string => {
  try {
    const url = new URL(ENV.reset_password_ui_link);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Password recovery is temporarily unavailable."
    );
  }
};

const buildResetLink = (base: string, token: string): string => {
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
};

export const requestPasswordReset = async (
  payload: TForgetPassword
): Promise<{ accepted: true }> => {
  const resetBaseUrl = getResetBaseUrl();
  await connectDB();
  const user = await AuthRepository.findByEmail(
    payload.email.trim().toLowerCase()
  );
  if (!user || user.status === "blocked") return { accepted: true };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashRecoveryToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1_000);
  await PasswordReset.updateMany(
    { user: user._id, status: "active" },
    { $set: { status: "used", used_at: new Date() } }
  );
  const reset = await PasswordReset.create({
    user: user._id,
    token_hash: tokenHash,
    status: "active",
    expires_at: expiresAt,
  });

  const link = buildResetLink(resetBaseUrl, token);
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your portfolio admin password",
      text: `Use this one-time link within 15 minutes: ${link}`,
      html: `<p>Use this one-time link within 15 minutes:</p><p><a href="${escapeHtml(link)}">Reset password</a></p>`,
      messageId: `<password-reset.${reset._id.toString()}@portfolio.local>`,
    });
  } catch {
    await PasswordReset.deleteOne({ _id: reset._id });
  }
  return { accepted: true };
};

export const resetPassword = async (
  payload: TResetPassword
): Promise<{ changed: true }> => {
  await connectDB();
  const now = new Date();
  const reset = await PasswordReset.findOneAndUpdate(
    {
      token_hash: hashRecoveryToken(payload.token),
      status: "active",
      expires_at: { $gt: now },
    },
    { $set: { status: "processing" } },
    { new: true }
  ).select("+token_hash");
  if (!reset) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The reset link is invalid or has expired."
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(ENV.bcrypt_salt_rounds)
    );
    const user = await AuthRepository.updateEligiblePasswordById(
      reset.user.toString(),
      {
        password: hashedPassword,
        password_changed_at: now,
      }
    );
    if (!user) {
      throw new Error("ineligible_user");
    }
    await PasswordReset.updateOne(
      { _id: reset._id, status: "processing" },
      { $set: { status: "used", used_at: now } }
    );
    await revokeUserSessions(reset.user.toString(), "password-changed");
    return { changed: true };
  } catch {
    await PasswordReset.updateOne(
      { _id: reset._id, status: "processing", expires_at: { $gt: new Date() } },
      { $set: { status: "active" } }
    );
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The reset link is invalid or has expired."
    );
  }
};
