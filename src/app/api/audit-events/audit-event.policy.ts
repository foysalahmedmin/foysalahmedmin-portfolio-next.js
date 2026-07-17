import { createHmac, timingSafeEqual } from "node:crypto";
import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import type { TRole } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import {
  AUDIT_ACTIONS,
  AUDIT_METADATA_KEYS,
  AUDIT_RETENTION_DAYS,
  type TAuditAction,
  type TAuditMetadata,
  type TAuditTargetType,
} from "./audit-event.type";

const SAFE_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const SAFE_TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const FORBIDDEN_PATH_SEGMENTS = new Set([
  "access_token",
  "api_key",
  "authorization",
  "body",
  "content",
  "cookie",
  "email",
  "evidence",
  "message",
  "password",
  "refresh_token",
  "secret",
  "token",
]);
const SENSITIVE_VALUE_PATTERN =
  /(?:bearer\s|password|secret|token|api[_-]?key|authorization|cookie|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;
const VALID_ROLES = new Set<TRole>([
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
  "subscriber",
  "user",
]);
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_CHANNELS = new Set(["browser", "api", "worker", "cli"]);
const STORAGE_PROVIDERS = new Set(["cloudinary", "gcp", "local"]);
const REPEATABLE_CONTENT_TARGETS = [
  "service",
  "skill-group",
  "skill",
  "timeline-entry",
  "credential",
  "faq",
  "testimonial",
  "legal-document",
] as const satisfies readonly TAuditTargetType[];
const PUBLISHABLE_CONTENT_TARGETS = [
  "article",
  "project",
  ...REPEATABLE_CONTENT_TARGETS,
] as const satisfies readonly TAuditTargetType[];

const ACTION_TARGETS: Readonly<
  Record<TAuditAction, readonly TAuditTargetType[]>
> = {
  "contact.submitted": ["contact"],
  "contact.anonymized": ["contact"],
  "contact.status.changed": ["contact"],
  "contact.delivery.retried": ["contact"],
  "contact.deleted": ["contact"],
  "contact.restored": ["contact"],
  "contact.permanently_deleted": ["contact"],
  "contact.exported": ["contact"],
  "contact.retention_hold.changed": ["contact"],
  "content.created": PUBLISHABLE_CONTENT_TARGETS,
  "content.updated": PUBLISHABLE_CONTENT_TARGETS,
  "content.published": PUBLISHABLE_CONTENT_TARGETS,
  "content.unpublished": PUBLISHABLE_CONTENT_TARGETS,
  "content.archived": PUBLISHABLE_CONTENT_TARGETS,
  "content.deleted": [
    "article",
    "project",
    "article-category",
    "project-category",
    ...REPEATABLE_CONTENT_TARGETS,
  ],
  "content.restored": [
    "article",
    "project",
    "article-category",
    "project-category",
    ...REPEATABLE_CONTENT_TARGETS,
  ],
  "content.permanently_deleted": [
    "article",
    "project",
    "article-category",
    "project-category",
    ...REPEATABLE_CONTENT_TARGETS,
  ],
  "site.settings.updated": ["site"],
  "page.created": ["page"],
  "page.draft.updated": ["page"],
  "page.published": ["page"],
  "page.preview.created": ["page"],
  "user.role.changed": ["user"],
  "user.status.changed": ["user"],
  "session.revoked": ["session"],
  "session.revoked_all": ["user"],
  "auth.signin.failed": ["user"],
  "auth.mfa.enrolled": ["user"],
  "auth.mfa.failed": ["user"],
  "auth.mfa.reset": ["user"],
  "auth.mfa.verified": ["user"],
  "auth.mfa.recovery_used": ["user"],
  "auth.refresh.reuse_detected": ["session"],
  "file.permanently_deleted": ["file"],
  "migration.executed": ["migration"],
  "legacy.imported": ["legacy"],
};

const safeString = (value: unknown, maximum = 64): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, maximum);
  if (!normalized) return undefined;
  if (SENSITIVE_VALUE_PATTERN.test(normalized)) return "redacted";
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : "redacted";
};

const safeCount = (value: unknown): number | undefined =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 1_000_000
    ? value
    : undefined;

export const isSafeAuditCode = (value: string): boolean =>
  value.length <= 64 &&
  SAFE_CODE_PATTERN.test(value) &&
  !SENSITIVE_VALUE_PATTERN.test(value);

export const assertSafeAuditCode = (
  value: string,
  field = "audit code"
): string => {
  const normalized = value.trim();
  if (!isSafeAuditCode(normalized)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid ${field}`);
  }
  return normalized;
};

export const assertSafeAuditTargetId = (value: string): string => {
  const normalized = value.trim();
  if (!SAFE_TARGET_ID_PATTERN.test(normalized)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid audit target ID");
  }
  return normalized;
};

export const assertAuditActionTarget = (
  action: TAuditAction,
  target: TAuditTargetType
): void => {
  if (
    !AUDIT_ACTIONS.includes(action) ||
    !ACTION_TARGETS[action].includes(target)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Audit action and target are incompatible"
    );
  }
};

export const sanitizeChangedFields = (
  values: readonly string[] | undefined
): string[] => {
  if (!values) return [];
  const result = new Set<string>();

  for (const raw of values.slice(0, 40)) {
    if (typeof raw !== "string") continue;
    const normalized = raw.trim().toLowerCase();
    if (
      !normalized ||
      normalized.length > 96 ||
      !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/.test(normalized)
    ) {
      continue;
    }
    const segments = normalized.split(".");
    result.add(
      segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))
        ? "[redacted]"
        : normalized
    );
    if (result.size >= 20) break;
  }

  return [...result];
};

export const sanitizeAuditMetadata = (
  input: Readonly<Record<string, unknown>> | undefined
): TAuditMetadata => {
  if (!input) return {};
  const output: TAuditMetadata = {};

  for (const key of AUDIT_METADATA_KEYS) {
    const value = input[key];
    if (value === undefined) continue;

    if (key === "http_method") {
      const method = typeof value === "string" ? value.toUpperCase() : "";
      if (HTTP_METHODS.has(method)) output.http_method = method;
      continue;
    }
    if (key === "request_channel") {
      if (typeof value === "string" && REQUEST_CHANNELS.has(value)) {
        output.request_channel = value;
      }
      continue;
    }
    if (key === "previous_role" || key === "next_role") {
      const role =
        typeof value === "string" && VALID_ROLES.has(value as TRole)
          ? (value as TRole)
          : "redacted";
      output[key] = role;
      continue;
    }
    if (key === "storage_provider") {
      output.storage_provider =
        typeof value === "string" && STORAGE_PROVIDERS.has(value)
          ? (value as "cloudinary" | "gcp" | "local")
          : "redacted";
      continue;
    }
    if (
      key === "result_count" ||
      key === "batch_size" ||
      key === "held_count" ||
      key === "purged_count"
    ) {
      const count = safeCount(value);
      if (count !== undefined) output[key] = count;
      continue;
    }
    if (key === "transactional") {
      if (typeof value === "boolean") output.transactional = value;
      continue;
    }
    if (key === "migration_id") {
      output.migration_id =
        typeof value === "string" &&
        /^\d{12}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
        !SENSITIVE_VALUE_PATTERN.test(value)
          ? value
          : "redacted";
      continue;
    }

    const sanitized = safeString(value);
    if (sanitized) output[key] = sanitized;
  }

  return output;
};

const getAuditHmacSecret = (): string => {
  const secret = ENV.audit_hmac_secret?.trim();
  if (!secret || secret.length < 32) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Audit integrity configuration is unavailable"
    );
  }
  return secret;
};

export const hashAuditIdentifier = (
  purpose: "correlation" | "session",
  value: string,
  secret = getAuditHmacSecret()
): string =>
  createHmac("sha256", secret)
    .update(`audit:${purpose}\0${value.slice(0, 512)}`)
    .digest("hex");

export const normalizeAuditHash = (
  value: string | undefined
): string | undefined => {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!SHA256_PATTERN.test(normalized)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid audit correlation hash"
    );
  }
  return normalized;
};

export const auditHashesEqual = (left: string, right: string): boolean => {
  if (!SHA256_PATTERN.test(left) || !SHA256_PATTERN.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
};

export const getAuditRetentionDate = (now = new Date()): Date =>
  new Date(now.getTime() + AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1_000);
