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

const ROUTE_KEYS = [
  "home",
  "about",
  "projects",
  "articles",
  "contact",
  "privacy",
  "terms",
] as const;

type PageIndexTarget = Readonly<{
  collection: "pages" | "page_cache_invalidations";
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const PAGE_INDEX_TARGETS = Object.freeze([
  {
    collection: "pages",
    key: { route_key: 1, locale: 1 },
    options: { name: "page_route_locale_unique", unique: true },
  },
  {
    collection: "pages",
    key: { locale: 1, "published.revision": 1, route_key: 1 },
    options: {
      name: "page_published_route",
      partialFilterExpression: { "published.revision": { $type: "number" } },
    },
  },
  {
    collection: "pages",
    key: { updated_at: -1, route_key: 1 },
    options: { name: "page_admin_updated" },
  },
  {
    collection: "page_cache_invalidations",
    key: { page: 1, revision: 1 },
    options: { name: "page_cache_revision_unique", unique: true },
  },
  {
    collection: "page_cache_invalidations",
    key: { status: 1, next_attempt_at: 1, created_at: 1 },
    options: { name: "page_cache_pending_delivery" },
  },
  {
    collection: "page_cache_invalidations",
    key: { delivered_at: 1 },
    options: {
      name: "page_cache_delivered_ttl",
      expireAfterSeconds: 7 * 24 * 60 * 60,
    },
  },
] as const satisfies readonly PageIndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 26;

const getIndexes = async (
  db: Db,
  collection: PageIndexTarget["collection"]
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

export const isPageIndexReady = (
  index: IndexDescriptionInfo,
  target: PageIndexTarget
): boolean =>
  index.name === target.options.name &&
  canonical(index.key) === canonical(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  (index.expireAfterSeconds ?? null) ===
    (target.options.expireAfterSeconds ?? null) &&
  canonical(index.partialFilterExpression) ===
    canonical(target.options.partialFilterExpression);

const inspectDocuments = async (db: Db) => {
  const pages = db.collection("pages");
  const invalidPages = await pages.countDocuments({
    $or: [
      { route_key: { $nin: ROUTE_KEYS } },
      { locale: { $ne: "en" } },
      { schema_version: { $ne: 1 } },
      { contract_version: { $ne: 1 } },
      { revision: { $not: { $type: "number" } } },
      { draft: { $not: { $type: "object" } } },
    ],
  });
  const duplicatePages = await pages
    .aggregate([
      {
        $group: {
          _id: { route_key: "$route_key", locale: "$locale" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();
  const malformedPublished = await pages.countDocuments({
    published: { $exists: true, $ne: null },
    $or: [
      { published: { $not: { $type: "object" } } },
      { "published.revision": { $not: { $type: "number" } } },
      { "published.published_at": { $not: { $type: "date" } } },
      { "published.published_by": { $not: { $type: "objectId" } } },
    ],
  });
  const duplicateIntents = await db
    .collection("page_cache_invalidations")
    .aggregate([
      {
        $group: {
          _id: { page: "$page", revision: "$revision" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();
  return {
    page_documents: await pages.countDocuments(),
    invalid_page_documents: invalidPages,
    duplicate_page_groups: duplicatePages.length,
    malformed_published_documents: malformedPublished,
    duplicate_cache_intent_groups: duplicateIntents.length,
  };
};

export const inspectPageComposition = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicts = 0;
  for (const target of PAGE_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find((index) => index.name === target.options.name);
    const sameKey = indexes.find(
      (index) => canonical(index.key) === canonical(target.key)
    );
    if (!named && sameKey) conflicts += 1;
    else if (!named) missing += 1;
    else if (isPageIndexReady(named, target)) ready += 1;
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
  state: Awaited<ReturnType<typeof inspectPageComposition>>
): void => {
  if (
    state.invalid_page_documents ||
    state.duplicate_page_groups ||
    state.malformed_published_documents ||
    state.duplicate_cache_intent_groups
  ) {
    throw new MigrationError(
      "PAGE_COMPOSITION_REMEDIATION_REQUIRED",
      "Existing Page composition records require explicit remediation; this migration will not invent or discard layout content."
    );
  }
  if (state.conflicting_indexes) {
    throw new MigrationError(
      "PAGE_COMPOSITION_INDEX_CONFLICT",
      "Page composition index names already exist with incompatible definitions."
    );
  }
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspectPageComposition(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectPageComposition(context.db);
  assertSafeState(before);
  let created = 0;
  for (const target of PAGE_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isPageIndexReady(index, target))) continue;
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }
  const after = await inspectPageComposition(context.db);
  assertSafeState(after);
  if (after.missing_indexes) {
    throw new MigrationError(
      "PAGE_COMPOSITION_VERIFICATION_FAILED",
      "Page composition indexes did not reach the verified target state."
    );
  }
  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202607150013-page-composition",
  description:
    "Create fixed-route Page composition and durable cache-invalidation indexes without inventing content or arbitrary rendering paths.",
  source_path: "src/lib/db/migrations/202607150013-page-composition.ts",
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
