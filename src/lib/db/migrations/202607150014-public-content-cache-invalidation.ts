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

type PublicContentCacheIndexTarget = Readonly<{
  collection: "public_content_cache_invalidations";
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const PUBLIC_CONTENT_CACHE_INDEX_TARGETS = Object.freeze([
  {
    collection: "public_content_cache_invalidations",
    key: { event_key: 1 },
    options: { name: "public_content_cache_event_unique", unique: true },
  },
  {
    collection: "public_content_cache_invalidations",
    key: { status: 1, next_attempt_at: 1, created_at: 1 },
    options: { name: "public_content_cache_pending" },
  },
  {
    collection: "public_content_cache_invalidations",
    key: { delivered_at: 1 },
    options: {
      name: "public_content_cache_delivered_ttl",
      expireAfterSeconds: 7 * 24 * 60 * 60,
    },
  },
] as const satisfies readonly PublicContentCacheIndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 26;

const getIndexes = async (
  db: Db,
  collection: PublicContentCacheIndexTarget["collection"]
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

const normalized = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalized(entry)])
    );
  }
  return value ?? null;
};

const canonical = (value: unknown): string => JSON.stringify(normalized(value));

export const isPublicContentCacheIndexReady = (
  index: IndexDescriptionInfo,
  target: PublicContentCacheIndexTarget
): boolean =>
  index.name === target.options.name &&
  canonical(index.key) === canonical(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  (index.expireAfterSeconds ?? null) ===
    (target.options.expireAfterSeconds ?? null);

const inspectDocuments = async (db: Db) => {
  const collection = db.collection("public_content_cache_invalidations");
  const invalidDocuments = await collection.countDocuments({
    $or: [
      { event_key: { $not: { $type: "string" } } },
      { domain: { $nin: ["article", "project"] } },
      { tag: { $not: { $type: "string" } } },
      { status: { $nin: ["pending", "delivered"] } },
      { attempts: { $not: { $type: "number" } } },
      { next_attempt_at: { $not: { $type: "date" } } },
      { created_at: { $not: { $type: "date" } } },
      { updated_at: { $not: { $type: "date" } } },
    ],
  });
  const duplicateEventKeys = await collection
    .aggregate([
      { $group: { _id: "$event_key", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();
  return {
    cache_intent_documents: await collection.countDocuments(),
    invalid_cache_intent_documents: invalidDocuments,
    duplicate_event_key_groups: duplicateEventKeys.length,
  };
};

export const inspectPublicContentCacheInvalidation = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicts = 0;
  for (const target of PUBLIC_CONTENT_CACHE_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find((index) => index.name === target.options.name);
    const sameKey = indexes.find(
      (index) => canonical(index.key) === canonical(target.key)
    );
    if (!named && sameKey) conflicts += 1;
    else if (!named) missing += 1;
    else if (isPublicContentCacheIndexReady(named, target)) ready += 1;
    else conflicts += 1;
  }
  return {
    ...(await inspectDocuments(db)),
    ready_indexes: ready,
    missing_indexes: missing,
    conflicting_indexes: conflicts,
  };
};

const assertSafeState = (
  state: Awaited<ReturnType<typeof inspectPublicContentCacheInvalidation>>
): void => {
  if (
    state.invalid_cache_intent_documents ||
    state.duplicate_event_key_groups
  ) {
    throw new MigrationError(
      "PUBLIC_CONTENT_CACHE_REMEDIATION_REQUIRED",
      "Existing public content cache invalidation records require explicit remediation; this migration will not rewrite delivery state."
    );
  }
  if (state.conflicting_indexes) {
    throw new MigrationError(
      "PUBLIC_CONTENT_CACHE_INDEX_CONFLICT",
      "Public content cache index names or keys conflict with the required delivery contract."
    );
  }
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspectPublicContentCacheInvalidation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectPublicContentCacheInvalidation(context.db);
  assertSafeState(before);
  let created = 0;
  for (const target of PUBLIC_CONTENT_CACHE_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (
      indexes.some((index) => isPublicContentCacheIndexReady(index, target))
    ) {
      continue;
    }
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }
  const after = await inspectPublicContentCacheInvalidation(context.db);
  assertSafeState(after);
  if (after.missing_indexes) {
    throw new MigrationError(
      "PUBLIC_CONTENT_CACHE_VERIFICATION_FAILED",
      "Public content cache invalidation indexes did not reach the verified target state."
    );
  }
  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202607150014-public-content-cache-invalidation",
  description:
    "Create durable retry and retention indexes for Article and Project public composition cache invalidation intents.",
  source_path:
    "src/lib/db/migrations/202607150014-public-content-cache-invalidation.ts",
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
