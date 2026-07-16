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

type SiteIndexTarget = Readonly<{
  collection: "sites" | "site_cache_invalidations";
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const SITE_INDEX_TARGETS = Object.freeze([
  {
    collection: "sites",
    key: { site_key: 1 },
    options: { name: "site_key_1", unique: true },
  },
  {
    collection: "sites",
    key: { "published.published_at": -1 },
    options: {
      name: "site_published_at",
      partialFilterExpression: {
        "published.revision": { $type: "number" },
      },
    },
  },
  {
    collection: "site_cache_invalidations",
    key: { site: 1, revision: 1 },
    options: { name: "site_cache_revision_unique", unique: true },
  },
  {
    collection: "site_cache_invalidations",
    key: { status: 1, next_attempt_at: 1, created_at: 1 },
    options: { name: "site_cache_pending_delivery" },
  },
  {
    collection: "site_cache_invalidations",
    key: { delivered_at: 1 },
    options: {
      name: "site_cache_delivered_ttl",
      expireAfterSeconds: 7 * 24 * 60 * 60,
    },
  },
] as const satisfies readonly SiteIndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 26;

const getIndexes = async (
  db: Db,
  collection: SiteIndexTarget["collection"]
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

export const isSiteIndexReady = (
  index: IndexDescriptionInfo,
  target: SiteIndexTarget
): boolean =>
  index.name === target.options.name &&
  canonical(index.key) === canonical(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  (index.expireAfterSeconds ?? null) ===
    (target.options.expireAfterSeconds ?? null) &&
  canonical(index.partialFilterExpression) ===
    canonical(target.options.partialFilterExpression);

const inspectDocuments = async (db: Db) => {
  const sites = db.collection("sites");
  const cacheIntents = db.collection("site_cache_invalidations");
  const siteDocuments = await sites.countDocuments();
  const invalidSiteDocuments = await sites.countDocuments({
    $or: [
      { site_key: { $ne: "primary" } },
      { schema_version: { $ne: 1 } },
      { contract_version: { $ne: 1 } },
      { revision: { $not: { $type: "number" } } },
      { draft: { $not: { $type: "object" } } },
    ],
  });
  const primaryDocuments = await sites.countDocuments({ site_key: "primary" });
  const malformedPublishedDocuments = await sites.countDocuments({
    published: { $exists: true, $ne: null },
    $or: [
      { published: { $not: { $type: "object" } } },
      { "published.revision": { $not: { $type: "number" } } },
      { "published.published_at": { $not: { $type: "date" } } },
      { "published.published_by": { $not: { $type: "objectId" } } },
    ],
  });
  const duplicateIntentGroups = await cacheIntents
    .aggregate([
      {
        $group: {
          _id: { site: "$site", revision: "$revision" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();

  return {
    site_documents: siteDocuments,
    invalid_site_documents: invalidSiteDocuments,
    duplicate_singletons: Math.max(0, primaryDocuments - 1),
    malformed_published_documents: malformedPublishedDocuments,
    duplicate_cache_intent_groups: duplicateIntentGroups.length,
  };
};

export const inspectSiteFoundation = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicts = 0;

  for (const target of SITE_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find((index) => index.name === target.options.name);
    const sameKey = indexes.find(
      (index) => canonical(index.key) === canonical(target.key)
    );
    if (!named && sameKey) conflicts += 1;
    else if (!named) missing += 1;
    else if (isSiteIndexReady(named, target)) ready += 1;
    else conflicts += 1;
  }

  return {
    ...(await inspectDocuments(db)),
    ready_indexes: ready,
    missing_indexes: missing,
    conflicting_indexes: conflicts,
  };
};

const assertSafeFoundationState = (
  state: Awaited<ReturnType<typeof inspectSiteFoundation>>
): void => {
  if (
    state.invalid_site_documents ||
    state.duplicate_singletons ||
    state.malformed_published_documents ||
    state.duplicate_cache_intent_groups
  ) {
    throw new MigrationError(
      "SITE_FOUNDATION_REMEDIATION_REQUIRED",
      "Existing Site records require explicit remediation; the migration will not invent or discard portfolio identity."
    );
  }
  if (state.conflicting_indexes) {
    throw new MigrationError(
      "SITE_FOUNDATION_INDEX_CONFLICT",
      "Site index names already exist with incompatible definitions."
    );
  }
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspectSiteFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectSiteFoundation(context.db);
  assertSafeFoundationState(before);

  let created = 0;
  for (const target of SITE_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isSiteIndexReady(index, target))) continue;
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }

  const after = await inspectSiteFoundation(context.db);
  assertSafeFoundationState(after);
  if (after.missing_indexes) {
    throw new MigrationError(
      "SITE_FOUNDATION_VERIFICATION_FAILED",
      "Site indexes did not reach the verified target state."
    );
  }

  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202607150010-site-foundation",
  description:
    "Create singleton Site and durable published-cache invalidation indexes without inventing identity content.",
  source_path: "src/lib/db/migrations/202607150010-site-foundation.ts",
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
