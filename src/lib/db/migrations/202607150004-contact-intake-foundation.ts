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

const CONTACT_STATUSES = [
  "new",
  "read",
  "replied",
  "qualified",
  "spam",
  "archived",
] as const;
const DELIVERY_STATUSES = [
  "queued",
  "processing",
  "delivered",
  "retrying",
  "dead_letter",
  "cancelled",
] as const;
const RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

type IndexTarget = Readonly<{
  collection: string;
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const CONTACT_INTAKE_INDEX_TARGETS = Object.freeze([
  {
    collection: "contacts",
    key: { status: 1 },
    options: { name: "status_1" },
  },
  {
    collection: "contacts",
    key: { delivery_status: 1 },
    options: { name: "delivery_status_1" },
  },
  {
    collection: "contacts",
    key: { retention_expires_at: 1 },
    options: { name: "retention_expires_at_1" },
  },
  {
    collection: "contactsubmissionkeys",
    key: { key_hash: 1 },
    options: { name: "key_hash_1", unique: true },
  },
  {
    collection: "contactsubmissionkeys",
    key: { public_receipt: 1 },
    options: { name: "public_receipt_1", unique: true },
  },
  {
    collection: "contactsubmissionkeys",
    key: { contact: 1 },
    options: { name: "contact_1" },
  },
  {
    collection: "contactsubmissionkeys",
    key: { expires_at: 1 },
    options: { name: "contact_submission_key_expiry", expireAfterSeconds: 0 },
  },
  {
    collection: "audit_events",
    key: { entity_id: 1 },
    options: { name: "entity_id_1" },
  },
  {
    collection: "audit_events",
    key: { action: 1, created_at: -1 },
    options: { name: "action_1_created_at_-1" },
  },
  {
    collection: "outbox_events",
    key: { aggregate_id: 1 },
    options: { name: "aggregate_id_1" },
  },
  {
    collection: "outbox_events",
    key: { status: 1, next_attempt_at: 1, created_at: 1 },
    options: { name: "status_1_next_attempt_at_1_created_at_1" },
  },
  {
    collection: "outbox_events",
    key: { event_type: 1, aggregate_id: 1 },
    options: {
      name: "one_contact_notification_outbox_event",
      unique: true,
      partialFilterExpression: {
        event_type: "contact.notification.requested",
      },
    },
  },
] as const satisfies readonly IndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 26;

const getIndexes = async (
  db: Db,
  collectionName: string
): Promise<IndexDescriptionInfo[]> => {
  try {
    const indexes = (await db
      .collection(collectionName)
      .listIndexes()
      .toArray()) as IndexDescriptionInfo[];
    return indexes;
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

export const isContactIntakeIndexReady = (
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
    Number(target.options.expireAfterSeconds ?? -1) &&
  entriesEqual(
    index.partialFilterExpression as Record<string, unknown> | undefined,
    target.options.partialFilterExpression as
      | Record<string, unknown>
      | undefined
  );

const countDuplicateGroups = async (
  db: Db,
  field: "key_hash" | "public_receipt"
): Promise<number> => {
  const collectionExists = await db
    .listCollections({ name: "contactsubmissionkeys" }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) return 0;

  const result = await db
    .collection("contactsubmissionkeys")
    .aggregate<{ groups: number }>([
      { $match: { [field]: { $type: "string" } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "groups" },
    ])
    .next();
  return result?.groups ?? 0;
};

export const inspectContactIntakeFoundation = async (
  db: Db
): Promise<{
  legacy_contacts: number;
  duplicate_key_groups: number;
  duplicate_receipt_groups: number;
  missing_indexes: number;
}> => {
  const contactsExist = await db
    .listCollections({ name: "contacts" }, { nameOnly: true })
    .hasNext();
  const [legacyContacts, duplicateKeyGroups, duplicateReceiptGroups] =
    await Promise.all([
      contactsExist
        ? db.collection("contacts").countDocuments({
            $or: [
              { status: { $nin: CONTACT_STATUSES } },
              { delivery_status: { $nin: DELIVERY_STATUSES } },
              { retention_expires_at: { $type: "missing" } },
              { anonymized_at: { $type: "missing" } },
            ],
          })
        : Promise.resolve(0),
      countDuplicateGroups(db, "key_hash"),
      countDuplicateGroups(db, "public_receipt"),
    ]);
  const indexesByCollection = new Map<string, IndexDescriptionInfo[]>();
  for (const target of CONTACT_INTAKE_INDEX_TARGETS) {
    if (!indexesByCollection.has(target.collection)) {
      indexesByCollection.set(
        target.collection,
        await getIndexes(db, target.collection)
      );
    }
  }
  const missingIndexes = CONTACT_INTAKE_INDEX_TARGETS.filter(
    (target) =>
      !indexesByCollection
        .get(target.collection)
        ?.some((index) => isContactIntakeIndexReady(index, target))
  ).length;

  return {
    legacy_contacts: legacyContacts,
    duplicate_key_groups: duplicateKeyGroups,
    duplicate_receipt_groups: duplicateReceiptGroups,
    missing_indexes: missingIndexes,
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectContactIntakeFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectContactIntakeFoundation(context.db);
  if (before.duplicate_key_groups || before.duplicate_receipt_groups) {
    throw new MigrationError(
      "CONTACT_INTAKE_DUPLICATES",
      "Contact idempotency collisions must be resolved before creating unique indexes."
    );
  }

  await context.assert_lease();
  await context.db.collection("contacts").updateMany(
    {
      $or: [
        { status: { $nin: CONTACT_STATUSES } },
        { delivery_status: { $nin: DELIVERY_STATUSES } },
        { retention_expires_at: { $type: "missing" } },
        { anonymized_at: { $type: "missing" } },
      ],
    },
    [
      {
        $set: {
          status: {
            $cond: [{ $in: ["$status", CONTACT_STATUSES] }, "$status", "new"],
          },
          delivery_status: {
            $cond: [
              { $in: ["$delivery_status", DELIVERY_STATUSES] },
              "$delivery_status",
              "queued",
            ],
          },
          retention_expires_at: {
            $ifNull: [
              "$retention_expires_at",
              {
                $add: [
                  { $ifNull: ["$created_at", context.now()] },
                  RETENTION_MS,
                ],
              },
            ],
          },
          anonymized_at: { $ifNull: ["$anonymized_at", null] },
        },
      },
    ]
  );

  let createdIndexes = 0;
  for (const target of CONTACT_INTAKE_INDEX_TARGETS) {
    await context.assert_lease();
    const existingIndexes = await getIndexes(context.db, target.collection);
    if (
      existingIndexes.some((index) => isContactIntakeIndexReady(index, target))
    ) {
      continue;
    }
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    createdIndexes += 1;
  }

  const after = await inspectContactIntakeFoundation(context.db);
  if (after.legacy_contacts !== 0 || after.missing_indexes !== 0) {
    throw new MigrationError(
      "CONTACT_INTAKE_VERIFICATION_FAILED",
      "Contact intake migration did not reach the verified target state."
    );
  }

  return {
    normalized_contacts: before.legacy_contacts,
    created_indexes: createdIndexes,
    ...after,
  };
};

const migration: MigrationDefinition = {
  id: "202607150004-contact-intake-foundation",
  description:
    "Backfill contact privacy state and create idempotency, audit, and outbox indexes.",
  source_path:
    "src/lib/db/migrations/202607150004-contact-intake-foundation.ts",
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
