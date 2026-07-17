import { MigrationError } from "./errors.ts";
import type { MigrationDefinition } from "./types.ts";
import partialUniqueSoftDeleteIndexes from "./202607150001-partial-unique-soft-delete-indexes.ts";
import sanitizeRichContent from "./202607150002-sanitize-rich-content.ts";
import managedMediaSecurityState from "./202607150003-managed-media-security-state.ts";
import contactIntakeFoundation from "./202607150004-contact-intake-foundation.ts";
import auditEventFoundation from "./202607150005-audit-event-foundation.ts";
import contentSlugFoundation from "./202607150006-content-slug-foundation.ts";
import portfolioContentContract from "./202607150007-portfolio-content-contract.ts";
import authSessionFoundation from "./202607150008-auth-session-foundation.ts";
import fileMetadataProvenance from "./202607150009-file-metadata-provenance.ts";
import siteFoundation from "./202607150010-site-foundation.ts";
import contactInboxOperations from "./202607150011-contact-inbox-operations.ts";
import repeatableContentFoundation from "./202607150012-repeatable-content-foundation.ts";
import pageComposition from "./202607150013-page-composition.ts";
import publicContentCacheInvalidation from "./202607150014-public-content-cache-invalidation.ts";
import authMfaFoundation from "./202607170001-auth-mfa-foundation.ts";

const MIGRATION_ID_PATTERN = /^\d{12}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIGRATION_SOURCE_PATTERN =
  /^src\/lib\/db\/migrations\/\d{12}-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

export function validateMigrationRegistry(
  migrations: readonly MigrationDefinition[]
) {
  const seenIds = new Set<string>();
  let previousId = "";

  for (const migration of migrations) {
    if (!MIGRATION_ID_PATTERN.test(migration.id)) {
      throw new MigrationError(
        "MIGRATION_ID_INVALID",
        `Migration id ${migration.id} must use YYYYMMDDHHmm-kebab-case.`
      );
    }

    if (seenIds.has(migration.id)) {
      throw new MigrationError(
        "MIGRATION_ID_DUPLICATE",
        `Migration id ${migration.id} is duplicated.`
      );
    }

    if (previousId && migration.id <= previousId) {
      throw new MigrationError(
        "MIGRATION_ORDER_INVALID",
        `Migration ${migration.id} is not strictly ordered after ${previousId}.`
      );
    }

    if (!MIGRATION_SOURCE_PATTERN.test(migration.source_path)) {
      throw new MigrationError(
        "MIGRATION_SOURCE_PATH_INVALID",
        `Migration ${migration.id} has an invalid immutable source path.`
      );
    }

    const sourceId = migration.source_path
      .split("/")
      .at(-1)
      ?.replace(/\.ts$/, "");

    if (sourceId !== migration.id) {
      throw new MigrationError(
        "MIGRATION_SOURCE_ID_MISMATCH",
        `Migration ${migration.id} must match its source filename.`
      );
    }

    seenIds.add(migration.id);
    previousId = migration.id;
  }

  return migrations;
}

export const MIGRATION_REGISTRY = validateMigrationRegistry([
  partialUniqueSoftDeleteIndexes,
  sanitizeRichContent,
  managedMediaSecurityState,
  contactIntakeFoundation,
  auditEventFoundation,
  contentSlugFoundation,
  portfolioContentContract,
  authSessionFoundation,
  fileMetadataProvenance,
  siteFoundation,
  contactInboxOperations,
  repeatableContentFoundation,
  pageComposition,
  publicContentCacheInvalidation,
  authMfaFoundation,
] as const);
