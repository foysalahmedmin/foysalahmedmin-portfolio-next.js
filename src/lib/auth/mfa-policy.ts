import { ENV } from "@/config";
import { hasCapability } from "@/lib/auth/capabilities";
import type { TRole } from "@/types/jsonwebtoken.type";

export type AdminMfaGate = "not-required" | "required";
export const ADMIN_MFA_MODES = ["required", "disabled"] as const;
export type AdminMfaMode = (typeof ADMIN_MFA_MODES)[number];

export const resolveAdminMfaMode = (
  configuredMode: string | undefined,
  environment: "development" | "production" | "test"
): AdminMfaMode => {
  const normalized = configuredMode?.trim().toLowerCase();
  if (normalized === "required" || normalized === "disabled") {
    return normalized;
  }
  return environment === "production" ? "required" : "disabled";
};

export const getAdminMfaGate = (
  role: TRole,
  environment = ENV.environment,
  configuredMode: string | undefined = ENV.auth_admin_mfa_mode
): AdminMfaGate => {
  if (!hasCapability(role, "admin:access")) {
    return "not-required";
  }

  return resolveAdminMfaMode(configuredMode, environment) === "required"
    ? "required"
    : "not-required";
};

export const isAdminMfaRequired = (role: TRole): boolean =>
  getAdminMfaGate(role) === "required";

export const isMfaSessionAccepted = (
  role: TRole,
  mfaVerifiedAt: Date | null | undefined,
  environment = ENV.environment,
  configuredMode: string | undefined = ENV.auth_admin_mfa_mode
): boolean =>
  getAdminMfaGate(role, environment, configuredMode) === "not-required" ||
  Boolean(
    mfaVerifiedAt &&
      Number.isFinite(mfaVerifiedAt.getTime()) &&
      mfaVerifiedAt.getTime() <= Date.now()
  );
