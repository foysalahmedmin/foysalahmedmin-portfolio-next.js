import { sha256 } from "./checksum.ts";
import { MigrationError } from "./errors.ts";
import type { BackupConfirmation } from "./types.ts";

const DEFAULT_MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

type ParseBackupConfirmationOptions = Readonly<{
  reference?: string;
  verified_at?: string;
  now?: Date;
  max_age_ms?: number;
}>;

export function parseBackupConfirmation(
  options: ParseBackupConfirmationOptions
): BackupConfirmation | null {
  const reference = options.reference?.trim();
  const verifiedAtValue = options.verified_at?.trim();

  if (!reference && !verifiedAtValue) return null;

  if (!reference || reference.length < 4 || reference.length > 200) {
    throw new MigrationError(
      "MIGRATION_BACKUP_REFERENCE_INVALID",
      "MIGRATION_BACKUP_REFERENCE must identify a reviewed restore point (4-200 characters)."
    );
  }

  if (!verifiedAtValue) {
    throw new MigrationError(
      "MIGRATION_BACKUP_VERIFIED_AT_REQUIRED",
      "MIGRATION_BACKUP_VERIFIED_AT must be an ISO-8601 timestamp."
    );
  }

  const verifiedAt = new Date(verifiedAtValue);
  if (
    Number.isNaN(verifiedAt.getTime()) ||
    verifiedAt.toISOString() !== verifiedAtValue
  ) {
    throw new MigrationError(
      "MIGRATION_BACKUP_VERIFIED_AT_INVALID",
      "MIGRATION_BACKUP_VERIFIED_AT must be a canonical UTC ISO-8601 timestamp."
    );
  }

  const now = options.now ?? new Date();
  const maxAgeMs = options.max_age_ms ?? DEFAULT_MAX_BACKUP_AGE_MS;
  const ageMs = now.getTime() - verifiedAt.getTime();

  if (ageMs < -MAX_CLOCK_SKEW_MS) {
    throw new MigrationError(
      "MIGRATION_BACKUP_VERIFICATION_IN_FUTURE",
      "The backup verification timestamp is in the future."
    );
  }

  if (ageMs > maxAgeMs) {
    throw new MigrationError(
      "MIGRATION_BACKUP_CONFIRMATION_STALE",
      "The verified backup confirmation is older than the allowed 24-hour apply window."
    );
  }

  return {
    reference_fingerprint: sha256(reference).slice(0, 16),
    verified_at: verifiedAt,
  };
}
