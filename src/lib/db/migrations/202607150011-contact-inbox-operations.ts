import type {
  CreateIndexesOptions,
  Db,
  IndexDescriptionInfo,
  IndexSpecification,
} from "mongodb";
import { MigrationError } from "./errors.ts";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1_000;

type IndexTarget = Readonly<{
  collection: string;
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const CONTACT_INBOX_INDEX_TARGETS = Object.freeze([
  {
    collection: "contacts",
    key: { status: 1, delivery_status: 1, created_at: -1 },
    options: { name: "contact_inbox_status_delivery_created" },
  },
  {
    collection: "contacts",
    key: { "retention_hold.expires_at": 1, retention_expires_at: 1 },
    options: { name: "contact_retention_hold_expiry" },
  },
  {
    collection: "contacts",
    key: { purge_after: 1 },
    options: { name: "purge_after_1" },
  },
  {
    collection: "contacts",
    key: { email: 1, created_at: 1 },
    options: { name: "contact_subject_access" },
  },
  {
    collection: "contact_privacy_requests",
    key: { request_id: 1 },
    options: { name: "request_id_1", unique: true },
  },
  {
    collection: "contact_privacy_requests",
    key: { expires_at: 1 },
    options: {
      name: "contact_privacy_request_expiry",
      expireAfterSeconds: 0,
    },
  },
  {
    collection: "contact_privacy_requests",
    key: { status: 1, expires_at: 1 },
    options: { name: "contact_privacy_status_expiry" },
  },
] as const satisfies readonly IndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 26;

const getIndexes = async (
  db: Db,
  collection: string
): Promise<IndexDescriptionInfo[]> => {
  try {
    return (await db
      .collection(collection)
      .listIndexes()
      .toArray()) as IndexDescriptionInfo[];
  } catch (error) {
    if (isNamespaceMissing(error)) return [];
    throw error;
  }
};

const entriesEqual = (
  left: Readonly<Record<string, unknown>> | undefined,
  right: Readonly<Record<string, unknown>> | undefined
): boolean => {
  if (!left || !right) return left === right;
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value], index) =>
        key === rightEntries[index]?.[0] && value === rightEntries[index]?.[1]
    )
  );
};

export const isContactInboxIndexReady = (
  index: IndexDescriptionInfo,
  target: IndexTarget
): boolean =>
  index.name === target.options.name &&
  entriesEqual(
    index.key as Record<string, unknown>,
    target.key as Record<string, unknown>
  ) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  Number(index.expireAfterSeconds ?? -1) ===
    Number(target.options.expireAfterSeconds ?? -1);

export const inspectContactInboxOperations = async (db: Db) => {
  const contactsExist = await db
    .listCollections({ name: "contacts" }, { nameOnly: true })
    .hasNext();
  const legacyContacts = contactsExist
    ? await db.collection("contacts").countDocuments({
        $or: [
          { revision: { $not: { $type: "number" } } },
          { status_changed_at: { $not: { $type: "date" } } },
          { retention_hold: { $exists: false } },
          {
            anonymized_at: { $type: "date" },
            purge_after: { $not: { $type: "date" } },
          },
        ],
      })
    : 0;
  const indexesByCollection = new Map<string, IndexDescriptionInfo[]>();
  for (const target of CONTACT_INBOX_INDEX_TARGETS) {
    if (!indexesByCollection.has(target.collection)) {
      indexesByCollection.set(
        target.collection,
        await getIndexes(db, target.collection)
      );
    }
  }
  const missingIndexes = CONTACT_INBOX_INDEX_TARGETS.filter(
    (target) =>
      !indexesByCollection
        .get(target.collection)
        ?.some((index) => isContactInboxIndexReady(index, target))
  ).length;
  return { legacy_contacts: legacyContacts, missing_indexes: missingIndexes };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectContactInboxOperations(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectContactInboxOperations(context.db);
  const contactsExist = await context.db
    .listCollections({ name: "contacts" }, { nameOnly: true })
    .hasNext();
  if (contactsExist && before.legacy_contacts > 0) {
    await context.assert_lease();
    await context.db.collection("contacts").updateMany({}, [
      {
        $set: {
          revision: {
            $cond: [
              {
                $and: [{ $isNumber: "$revision" }, { $gte: ["$revision", 0] }],
              },
              "$revision",
              0,
            ],
          },
          status_changed_at: {
            $cond: [
              { $eq: [{ $type: "$status_changed_at" }, "date"] },
              "$status_changed_at",
              {
                $ifNull: [
                  "$updated_at",
                  { $ifNull: ["$created_at", context.now()] },
                ],
              },
            ],
          },
          retention_hold: { $ifNull: ["$retention_hold", null] },
          purge_after: {
            $cond: [
              { $eq: [{ $type: "$anonymized_at" }, "date"] },
              {
                $cond: [
                  { $eq: [{ $type: "$purge_after" }, "date"] },
                  "$purge_after",
                  { $add: ["$anonymized_at", TOMBSTONE_MS] },
                ],
              },
              null,
            ],
          },
        },
      },
    ]);
  }

  let createdIndexes = 0;
  for (const target of CONTACT_INBOX_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isContactInboxIndexReady(index, target))) {
      continue;
    }
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    createdIndexes += 1;
  }
  const after = await inspectContactInboxOperations(context.db);
  if (after.legacy_contacts || after.missing_indexes) {
    throw new MigrationError(
      "CONTACT_INBOX_VERIFICATION_FAILED",
      "Contact inbox operations did not reach the verified target state."
    );
  }
  return {
    normalized_contacts: before.legacy_contacts,
    created_indexes: createdIndexes,
    ...after,
  };
};

const migration: MigrationDefinition = {
  id: "202607150011-contact-inbox-operations",
  description:
    "Backfill contact inbox concurrency and retention state, then create privacy and operational indexes.",
  source_path: "src/lib/db/migrations/202607150011-contact-inbox-operations.ts",
  behavior: {
    transaction: "none",
    creates_indexes: true,
    destructive: false,
    resumable: true,
  },
  dry_run: dryRun,
  up,
};

export default migration;
