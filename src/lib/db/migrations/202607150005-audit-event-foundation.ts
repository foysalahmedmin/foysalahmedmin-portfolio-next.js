import { createHash } from "node:crypto";
import type {
  CreateIndexesOptions,
  Db,
  Document,
  IndexDescriptionInfo,
  IndexSpecification,
  ObjectId,
} from "mongodb";
import { MigrationError } from "./errors.ts";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const COLLECTION = "audit_events";
const BATCH_SIZE = 200;
const RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set([
  "contact.submitted",
  "contact.anonymized",
  "content.published",
  "content.unpublished",
  "content.deleted",
  "content.restored",
  "content.permanently_deleted",
  "site.settings.updated",
  "user.role.changed",
  "user.status.changed",
  "session.revoked",
  "session.revoked_all",
  "auth.signin.failed",
  "auth.refresh.reuse_detected",
  "file.permanently_deleted",
  "migration.executed",
  "legacy.imported",
]);
const ACTORS = new Set(["anonymous", "user", "system", "migration"]);
const TARGETS = new Set([
  "contact",
  "article",
  "project",
  "article-category",
  "project-category",
  "site",
  "user",
  "session",
  "file",
  "migration",
  "legacy",
]);
const OUTCOMES = new Set(["success", "failure", "denied"]);
const SOURCES = new Set(["admin", "api", "migration", "job"]);
const ROLES = new Set([
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
  "subscriber",
  "user",
]);
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const ACTION_TARGETS: Readonly<Record<string, readonly string[]>> = {
  "contact.submitted": ["contact"],
  "contact.anonymized": ["contact"],
  "content.published": ["article", "project"],
  "content.unpublished": ["article", "project"],
  "content.deleted": [
    "article",
    "project",
    "article-category",
    "project-category",
  ],
  "content.restored": [
    "article",
    "project",
    "article-category",
    "project-category",
  ],
  "content.permanently_deleted": [
    "article",
    "project",
    "article-category",
    "project-category",
  ],
  "site.settings.updated": ["site"],
  "user.role.changed": ["user"],
  "user.status.changed": ["user"],
  "session.revoked": ["session"],
  "session.revoked_all": ["user"],
  "auth.signin.failed": ["user"],
  "auth.refresh.reuse_detected": ["session"],
  "file.permanently_deleted": ["file"],
  "migration.executed": ["migration"],
  "legacy.imported": ["legacy"],
};

type IndexTarget = Readonly<{
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const AUDIT_EVENT_INDEX_TARGETS = Object.freeze([
  {
    key: { event_id: 1 },
    options: { name: "event_id_1", unique: true },
  },
  {
    key: { created_at: -1, _id: -1 },
    options: { name: "audit_created_at_desc" },
  },
  {
    key: { action: 1, created_at: -1 },
    options: { name: "action_1_created_at_-1" },
  },
  {
    key: { target_type: 1, target_id: 1, created_at: -1 },
    options: { name: "audit_target_timeline" },
  },
  {
    key: { actor_type: 1, actor_id: 1, created_at: -1 },
    options: { name: "audit_actor_timeline" },
  },
  {
    key: { retain_until: 1 },
    options: { name: "audit_retention_ttl", expireAfterSeconds: 0 },
  },
] as const satisfies readonly IndexTarget[]);

const FOUNDATION_FILTER = {
  $or: [
    { event_id: { $not: UUID_PATTERN } },
    { schema_version: { $ne: 1 } },
    { action: { $nin: [...ACTIONS] } },
    ...Object.entries(ACTION_TARGETS).map(([action, targetTypes]) => ({
      action,
      target_type: { $nin: targetTypes },
    })),
    { actor_type: { $nin: [...ACTORS] } },
    { actor_id: { $exists: true, $not: /^[a-f0-9]{24}$/ } },
    { actor_role: { $exists: true, $nin: [...ROLES] } },
    { session_hash: { $exists: true, $not: SHA256_PATTERN } },
    {
      $and: [
        { actor_type: "user" },
        {
          $or: [
            { actor_id: { $not: /^[a-f0-9]{24}$/ } },
            { actor_role: { $nin: [...ROLES] } },
          ],
        },
      ],
    },
    {
      $and: [
        { actor_type: { $ne: "user" } },
        {
          $or: [
            { actor_id: { $exists: true } },
            { actor_role: { $exists: true } },
            { session_hash: { $exists: true } },
          ],
        },
      ],
    },
    { target_type: { $nin: [...TARGETS] } },
    { target_id: { $not: SAFE_ID_PATTERN } },
    { target_revision: { $exists: true, $not: { $type: "number" } } },
    { target_revision: { $lt: 0 } },
    { target_revision: { $gt: 1_000_000_000 } },
    {
      $expr: {
        $and: [
          {
            $in: [
              { $type: "$target_revision" },
              ["double", "int", "long", "decimal"],
            ],
          },
          { $ne: ["$target_revision", { $trunc: "$target_revision" }] },
        ],
      },
    },
    { outcome: { $nin: [...OUTCOMES] } },
    { source: { $nin: [...SOURCES] } },
    { summary_code: { $not: SAFE_CODE_PATTERN } },
    { reason_code: { $exists: true, $not: SAFE_CODE_PATTERN } },
    { correlation_hash: { $exists: true, $not: SHA256_PATTERN } },
    { changed_fields: { $not: { $type: "array" } } },
    { metadata: { $not: { $type: "object" } } },
    { created_at: { $not: { $type: "date" } } },
    { retain_until: { $not: { $type: "date" } } },
    {
      $expr: {
        $gt: [
          {
            $size: {
              $cond: [
                { $eq: [{ $type: "$metadata" }, "object"] },
                { $objectToArray: "$metadata" },
                [],
              ],
            },
          },
          0,
        ],
      },
    },
  ],
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

export const isAuditEventIndexReady = (
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

const getIndexes = async (db: Db): Promise<IndexDescriptionInfo[]> => {
  const exists = await db
    .listCollections({ name: COLLECTION }, { nameOnly: true })
    .hasNext();
  if (!exists) return [];
  return (await db
    .collection(COLLECTION)
    .listIndexes()
    .toArray()) as IndexDescriptionInfo[];
};

const countDuplicateEventIds = async (db: Db): Promise<number> => {
  const exists = await db
    .listCollections({ name: COLLECTION }, { nameOnly: true })
    .hasNext();
  if (!exists) return 0;
  const result = await db
    .collection(COLLECTION)
    .aggregate<{ groups: number }>([
      { $match: { event_id: { $type: "string" } } },
      { $group: { _id: "$event_id", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "groups" },
    ])
    .next();
  return result?.groups ?? 0;
};

export const inspectAuditEventFoundation = async (db: Db) => {
  const exists = await db
    .listCollections({ name: COLLECTION }, { nameOnly: true })
    .hasNext();
  const indexes = await getIndexes(db);
  const [legacyEvents, duplicateEventIds] = exists
    ? await Promise.all([
        db.collection(COLLECTION).countDocuments(FOUNDATION_FILTER),
        countDuplicateEventIds(db),
      ])
    : [0, 0];
  const missingIndexes = AUDIT_EVENT_INDEX_TARGETS.filter(
    (target) => !indexes.some((index) => isAuditEventIndexReady(index, target))
  ).length;

  return {
    events_requiring_backfill: legacyEvents,
    duplicate_event_id_groups: duplicateEventIds,
    missing_indexes: missingIndexes,
  };
};

const deterministicEventId = (id: ObjectId): string => {
  const hex = createHash("sha256")
    .update(`audit-event\0${id.toHexString()}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "5";
  hex[16] = (["8", "9", "a", "b"] as const)[
    Number.parseInt(hex[16] || "0", 16) % 4
  ];
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

const normalizeCode = (value: unknown, fallback: string): string =>
  typeof value === "string" &&
  value.length <= 64 &&
  SAFE_CODE_PATTERN.test(value)
    ? value
    : fallback;

const normalizeTarget = (document: Document) => {
  let action = ACTIONS.has(document.action)
    ? String(document.action)
    : "legacy.imported";
  const inferredType = action.startsWith("contact.") ? "contact" : "legacy";
  let targetType = TARGETS.has(document.target_type)
    ? String(document.target_type)
    : document.entity_type === "contact"
      ? "contact"
      : inferredType;
  if (!ACTION_TARGETS[action]?.includes(targetType)) {
    action = "legacy.imported";
    targetType = "legacy";
  }
  const rawTargetId =
    document.target_id ??
    document.entity_id?.toString() ??
    document._id.toString();
  const targetId = SAFE_ID_PATTERN.test(String(rawTargetId))
    ? String(rawTargetId)
    : document._id.toString();
  return { action, targetType, targetId };
};

const backfillBatch = async (context: MigrationContext): Promise<number> => {
  const collection = context.db.collection(COLLECTION);
  const documents = await collection
    .find(FOUNDATION_FILTER)
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .toArray();
  if (documents.length === 0) return 0;

  await context.assert_lease();
  await collection.bulkWrite(
    documents.map((document) => {
      const { action, targetType, targetId } = normalizeTarget(document);
      const createdAt =
        document.created_at instanceof Date
          ? document.created_at
          : document._id.getTimestamp();
      const source = SOURCES.has(document.source)
        ? document.source
        : action === "contact.anonymized"
          ? "job"
          : document.actor_type === "migration"
            ? "migration"
            : "api";
      const correlationHash =
        typeof document.correlation_hash === "string" &&
        SHA256_PATTERN.test(document.correlation_hash)
          ? document.correlation_hash
          : undefined;
      const validUserActor =
        document.actor_type === "user" &&
        typeof document.actor_id === "string" &&
        /^[a-f0-9]{24}$/.test(document.actor_id) &&
        ROLES.has(document.actor_role);
      const actorType =
        document.actor_type === "user"
          ? validUserActor
            ? "user"
            : "system"
          : ACTORS.has(document.actor_type)
            ? document.actor_type
            : "system";
      const sessionHash =
        validUserActor &&
        typeof document.session_hash === "string" &&
        SHA256_PATTERN.test(document.session_hash)
          ? document.session_hash
          : undefined;
      const reasonCode =
        typeof document.reason_code === "string" &&
        document.reason_code.length <= 64 &&
        SAFE_CODE_PATTERN.test(document.reason_code)
          ? document.reason_code
          : undefined;
      const targetRevision =
        typeof document.target_revision === "number" &&
        Number.isSafeInteger(document.target_revision) &&
        document.target_revision >= 0 &&
        document.target_revision <= 1_000_000_000
          ? document.target_revision
          : undefined;
      const unset: Record<string, ""> = {};
      if (!correlationHash) unset.correlation_hash = "";
      if (!validUserActor) {
        unset.actor_id = "";
        unset.actor_role = "";
      }
      if (!sessionHash) unset.session_hash = "";
      if (!reasonCode) unset.reason_code = "";
      if (targetRevision === undefined) unset.target_revision = "";

      return {
        updateOne: {
          filter: { _id: document._id },
          update: {
            $set: {
              event_id:
                typeof document.event_id === "string" &&
                UUID_PATTERN.test(document.event_id)
                  ? document.event_id
                  : deterministicEventId(document._id),
              schema_version: 1,
              action,
              actor_type: actorType,
              target_type: targetType,
              target_id: targetId,
              outcome: OUTCOMES.has(document.outcome)
                ? document.outcome
                : "success",
              source,
              summary_code: normalizeCode(
                document.summary_code,
                action.replaceAll(".", "_")
              ),
              changed_fields: [],
              metadata: {},
              created_at: createdAt,
              retain_until:
                document.retain_until instanceof Date
                  ? document.retain_until
                  : new Date(createdAt.getTime() + RETENTION_MS),
            },
            ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
          },
        },
      };
    })
  );
  await context.save_checkpoint({
    last_id: documents.at(-1)!._id,
    processed_at: context.now(),
  });
  return documents.length;
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectAuditEventFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  if (!context.destructive.writes_quiesced) {
    throw new MigrationError(
      "AUDIT_EVENT_WRITES_NOT_QUIESCED",
      "Audit event writes must be quiesced before applying the foundation migration."
    );
  }
  const before = await inspectAuditEventFoundation(context.db);
  if (before.duplicate_event_id_groups > 0) {
    throw new MigrationError(
      "AUDIT_EVENT_ID_DUPLICATES",
      "Duplicate audit event IDs must be resolved before creating the unique index."
    );
  }

  let normalizedEvents = 0;
  while (true) {
    const processed = await backfillBatch(context);
    normalizedEvents += processed;
    if (processed === 0) break;
  }

  let createdIndexes = 0;
  for (const target of AUDIT_EVENT_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db);
    const sameName = indexes.find(
      (index) => index.name === target.options.name
    );
    if (sameName && isAuditEventIndexReady(sameName, target)) {
      continue;
    }
    if (sameName) {
      throw new MigrationError(
        "AUDIT_EVENT_INDEX_CONFLICT",
        `Audit index ${target.options.name} exists with incompatible options.`
      );
    }
    await context.db
      .collection(COLLECTION)
      .createIndex(target.key, target.options);
    createdIndexes += 1;
  }

  const after = await inspectAuditEventFoundation(context.db);
  if (
    after.events_requiring_backfill !== 0 ||
    after.duplicate_event_id_groups !== 0 ||
    after.missing_indexes !== 0
  ) {
    throw new MigrationError(
      "AUDIT_EVENT_FOUNDATION_VERIFICATION_FAILED",
      "Audit event migration did not reach the verified target state."
    );
  }

  return {
    normalized_events: normalizedEvents,
    created_indexes: createdIndexes,
    ...after,
  };
};

const migration: MigrationDefinition = {
  id: "202607150005-audit-event-foundation",
  description:
    "Backfill redacted append-only audit fields and create bounded-query retention indexes.",
  source_path: "src/lib/db/migrations/202607150005-audit-event-foundation.ts",
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
