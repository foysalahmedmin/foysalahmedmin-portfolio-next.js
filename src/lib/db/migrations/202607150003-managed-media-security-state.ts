import type { Collection, Db, Document, Filter } from "mongodb";
import { MigrationError } from "./errors.ts";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const COLLECTION = "files";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const NEEDS_QUARANTINE: Filter<Document> = {
  $or: [
    { lifecycle_state: { $exists: false } },
    { lifecycle_state: null },
    { lifecycle_state: "delete_failed" },
    {
      lifecycle_state: "ready",
      $or: [
        { checksum: { $exists: false } },
        { checksum: { $not: SHA256_PATTERN } },
        { purpose: { $exists: false } },
        { access: { $exists: false } },
        { "metadata.storage_key": { $exists: false } },
      ],
    },
  ],
};

async function collectionExists(db: Db): Promise<boolean> {
  return db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
}

async function countDuplicateStorageKeys(collection: Collection<Document>) {
  const [result] = await collection
    .aggregate<{ groups: number; documents: number }>([
      { $match: { "metadata.storage_key": { $type: "string" } } },
      {
        $group: {
          _id: {
            provider: "$provider",
            storage_key: "$metadata.storage_key",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $group: {
          _id: null,
          groups: { $sum: 1 },
          documents: { $sum: "$count" },
        },
      },
    ])
    .toArray();
  return result || { groups: 0, documents: 0 };
}

async function countDuplicateChecksums(collection: Collection<Document>) {
  const [result] = await collection
    .aggregate<{ groups: number; documents: number }>([
      {
        $match: {
          is_deleted: false,
          checksum: { $type: "string" },
        },
      },
      {
        $group: {
          _id: {
            author: "$author",
            checksum: "$checksum",
            purpose: "$purpose",
            access: "$access",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $group: {
          _id: null,
          groups: { $sum: 1 },
          documents: { $sum: "$count" },
        },
      },
    ])
    .toArray();
  return result || { groups: 0, documents: 0 };
}

async function inspect(db: Db) {
  if (!(await collectionExists(db))) {
    return {
      collection_exists: false,
      documents: 0,
      quarantine_required: 0,
      duplicate_storage_keys: { groups: 0, documents: 0 },
      duplicate_active_checksums: { groups: 0, documents: 0 },
      can_apply: true,
    };
  }
  const collection = db.collection(COLLECTION);
  const [
    documents,
    quarantineRequired,
    duplicateStorageKeys,
    duplicateActiveChecksums,
  ] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(NEEDS_QUARANTINE),
    countDuplicateStorageKeys(collection),
    countDuplicateChecksums(collection),
  ]);
  return {
    collection_exists: true,
    documents,
    quarantine_required: quarantineRequired,
    duplicate_storage_keys: duplicateStorageKeys,
    duplicate_active_checksums: duplicateActiveChecksums,
    can_apply:
      duplicateStorageKeys.groups === 0 &&
      duplicateActiveChecksums.groups === 0,
  };
}

async function createManagedMediaIndexes(collection: Collection<Document>) {
  await collection.createIndexes([
    {
      name: "file_lifecycle_updated",
      key: { lifecycle_state: 1, updated_at: 1 },
    },
    {
      name: "file_purpose_access",
      key: { purpose: 1, access: 1 },
    },
    {
      name: "file_active_author_checksum_purpose_access_unique",
      key: { author: 1, checksum: 1, purpose: 1, access: 1 },
      unique: true,
      partialFilterExpression: {
        is_deleted: false,
        checksum: { $type: "string" },
      },
    },
    {
      name: "file_active_author_idempotency_unique",
      key: { author: 1, idempotency_key: 1 },
      unique: true,
      partialFilterExpression: {
        is_deleted: false,
        idempotency_key: { $type: "string" },
      },
    },
    {
      name: "file_provider_storage_key_unique",
      key: { provider: 1, "metadata.storage_key": 1 },
      unique: true,
      partialFilterExpression: {
        "metadata.storage_key": { $type: "string" },
      },
    },
  ]);
}

async function dryRun(context: MigrationContext): Promise<MigrationSummary> {
  return await inspect(context.db);
}

async function up(context: MigrationContext): Promise<MigrationSummary> {
  const before = await inspect(context.db);
  if (!before.collection_exists) return before;
  if (!before.can_apply) {
    throw new MigrationError(
      "MANAGED_MEDIA_STORAGE_KEY_COLLISION",
      "Managed media migration is blocked by duplicate storage keys or active checksum identities."
    );
  }

  const collection = context.db.collection(COLLECTION);
  await context.assert_lease();
  const metadataNormalized = await collection.updateMany(
    {
      $or: [
        { purpose: { $exists: false } },
        { access: { $exists: false } },
        { source: { $exists: false } },
        { storage_version: { $exists: false } },
      ],
    },
    {
      $set: {
        purpose: "generic",
        access: "private",
        source: "uploaded",
        storage_version: 1,
      },
    }
  );
  await context.assert_lease();
  const quarantined = await collection.updateMany(NEEDS_QUARANTINE, {
    $set: {
      lifecycle_state: "error",
      purpose: "generic",
      access: "private",
      source: "uploaded",
      storage_version: 1,
      storage_error_code: "LEGACY_REVALIDATION_REQUIRED",
    },
  });
  await context.assert_lease();
  await createManagedMediaIndexes(collection);

  return {
    ...before,
    metadata_normalized: metadataNormalized.modifiedCount,
    quarantined: quarantined.modifiedCount,
    indexes_verified: true,
  };
}

const migration: MigrationDefinition = {
  id: "202607150003-managed-media-security-state",
  description:
    "Quarantine unverified legacy files and add managed-media lifecycle indexes.",
  source_path:
    "src/lib/db/migrations/202607150003-managed-media-security-state.ts",
  behavior: {
    transaction: "none",
    creates_indexes: true,
    destructive: true,
    resumable: true,
  },
  dry_run: dryRun,
  up,
};

export default migration;
