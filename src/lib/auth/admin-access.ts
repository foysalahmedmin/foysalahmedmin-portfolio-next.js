import type { TJwtPayload, TRole } from "@/types/jsonwebtoken.type";

export const ADMIN_ROLES = [
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminSessionClaims = Partial<TJwtPayload> & {
  iat?: number;
};

export type AdminSessionUser = {
  _id: string | { toString(): string };
  name: string;
  email: string;
  image?: unknown;
  role?: TRole | string;
  status?: string;
  is_verified?: boolean;
  is_deleted?: boolean;
  password_changed_at?: Date | string | null;
};

export type AdminAccessFailure =
  | "invalid-token-claims"
  | "token-role-not-allowed"
  | "user-not-found"
  | "user-mismatch"
  | "user-deleted"
  | "user-blocked"
  | "user-role-not-allowed"
  | "invalid-password-change-date"
  | "stale-token";

export type AdminAccessDecision =
  | { allowed: true; role: AdminRole }
  | { allowed: false; reason: AdminAccessFailure };

const MONGODB_ID_PATTERN = /^[a-f\d]{24}$/i;
const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const RETURN_PATH_ORIGIN = "https://admin-return.invalid";

export const isAdminRole = (role: unknown): role is AdminRole =>
  typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);

export const decideAdminAccess = (
  claims: AdminSessionClaims,
  user: AdminSessionUser | null
): AdminAccessDecision => {
  if (
    typeof claims._id !== "string" ||
    !MONGODB_ID_PATTERN.test(claims._id) ||
    typeof claims.iat !== "number" ||
    !Number.isFinite(claims.iat)
  ) {
    return { allowed: false, reason: "invalid-token-claims" };
  }

  if (!isAdminRole(claims.role)) {
    return { allowed: false, reason: "token-role-not-allowed" };
  }

  if (!user) {
    return { allowed: false, reason: "user-not-found" };
  }

  if (user._id.toString() !== claims._id) {
    return { allowed: false, reason: "user-mismatch" };
  }

  if (user.is_deleted) {
    return { allowed: false, reason: "user-deleted" };
  }

  if (user.status === "blocked") {
    return { allowed: false, reason: "user-blocked" };
  }

  if (!isAdminRole(user.role)) {
    return { allowed: false, reason: "user-role-not-allowed" };
  }

  if (user.password_changed_at) {
    const passwordChangedAt = new Date(user.password_changed_at).getTime();

    if (!Number.isFinite(passwordChangedAt)) {
      return { allowed: false, reason: "invalid-password-change-date" };
    }

    if (Math.floor(passwordChangedAt / 1000) > claims.iat) {
      return { allowed: false, reason: "stale-token" };
    }
  }

  return { allowed: true, role: user.role };
};

/**
 * Only permits local admin destinations. This value is safe to pass to
 * `router.replace` after authentication without creating an open redirect.
 */
export const getSafeAdminReturnPath = (
  value: string | null | undefined,
  fallback = "/admin"
): string => {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    ENCODED_PATH_SEPARATOR_PATTERN.test(value)
  ) {
    return fallback;
  }

  try {
    const destination = new URL(value, RETURN_PATH_ORIGIN);

    if (
      destination.origin !== RETURN_PATH_ORIGIN ||
      !ADMIN_PATH_PATTERN.test(destination.pathname) ||
      destination.pathname === "/admin/signin" ||
      destination.pathname.startsWith("/admin/signin/")
    ) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
};

export const getAdminSignInPath = (returnPath?: string | null): string => {
  const safeReturnPath = getSafeAdminReturnPath(returnPath);
  return `/admin/signin?returnTo=${encodeURIComponent(safeReturnPath)}`;
};
