import type {
  CreateIndexesOptions,
  Db,
  Document,
  IndexDescriptionInfo,
} from "mongodb";
import { MigrationError } from "./errors.ts";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const CONTENT_COLLECTIONS = [
  ["services", "service"],
  ["skill_groups", "skill_group"],
  ["skills", "skill"],
  ["timeline_entries", "timeline"],
  ["credentials", "credential"],
  ["faqs", "faq"],
  ["testimonials", "testimonial"],
  ["legal_documents", "legal_document"],
] as const;

type IndexTarget = Readonly<{
  collection: string;
  key: IndexDescriptionInfo["key"];
  options: CreateIndexesOptions & { name: string };
}>;

const commonTargets = (
  collection: string,
  prefix: string
): readonly IndexTarget[] => [
  {
    collection,
    key: { locale: 1, slug: 1 },
    options: {
      name: `${prefix}_active_locale_slug_unique`,
      unique: true,
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection,
    key: { locale: 1, status: 1, enabled: 1, sequence: 1, _id: 1 },
    options: {
      name: `${prefix}_public_sequence`,
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection,
    key: { locale: 1, status: 1, primary_pillar: 1, sequence: 1, _id: 1 },
    options: {
      name: `${prefix}_public_pillar_sequence`,
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection,
    key: { is_deleted: 1, updated_at: -1, _id: 1 },
    options: { name: `${prefix}_admin_updated` },
  },
  {
    collection,
    key: { search_text: "text" },
    options: {
      name: `${prefix}_search_text`,
      weights: { search_text: 1 },
      default_language: "none",
    },
  },
];

export const REPEATABLE_CONTENT_INDEX_TARGETS = Object.freeze([
  ...CONTENT_COLLECTIONS.flatMap(([collection, prefix]) =>
    commonTargets(collection, prefix)
  ),
  {
    collection: "skills",
    key: { group: 1, status: 1, sequence: 1, _id: 1 },
    options: {
      name: "skill_public_group_sequence",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "timeline_entries",
    key: { type: 1, status: 1, started_at: -1, sequence: 1, _id: 1 },
    options: {
      name: "timeline_public_type_started",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "credentials",
    key: { type: 1, status: 1, issued_at: -1, sequence: 1, _id: 1 },
    options: {
      name: "credential_public_type_issued",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "faqs",
    key: { category: 1, status: 1, sequence: 1, _id: 1 },
    options: {
      name: "faq_public_category_sequence",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "testimonials",
    key: {
      status: 1,
      consent_status: 1,
      claim_verification: 1,
      sequence: 1,
      _id: 1,
    },
    options: {
      name: "testimonial_public_trust_sequence",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "legal_documents",
    key: { locale: 1, type: 1, document_version: 1 },
    options: {
      name: "legal_document_active_type_version_unique",
      unique: true,
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "legal_documents",
    key: { type: 1, status: 1, effective_at: -1, _id: 1 },
    options: {
      name: "legal_document_public_type_effective",
      partialFilterExpression: { is_deleted: false },
    },
  },
  {
    collection: "repeatable_cache_invalidations",
    key: { domain: 1, target: 1, target_version: 1 },
    options: {
      name: "repeatable_cache_target_version_unique",
      unique: true,
    },
  },
  {
    collection: "repeatable_cache_invalidations",
    key: { status: 1, next_attempt_at: 1, created_at: 1 },
    options: { name: "repeatable_cache_retry_lease" },
  },
  {
    collection: "repeatable_cache_invalidations",
    key: { delivered_at: 1 },
    options: {
      name: "repeatable_cache_delivered_ttl",
      expireAfterSeconds: 7 * 24 * 60 * 60,
    },
  },
] as const satisfies readonly IndexTarget[]);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 26;

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

const canonical = (value: unknown): string => {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.entries(entry as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, normalize(nested)])
      );
    }
    return entry ?? null;
  };
  return JSON.stringify(normalize(value));
};

// listIndexes reports a text index with MongoDB's internal full-text key rather
// than the declared field, so the declared key is normalized before comparison.
// The indexed fields still have to match through `weights`.
const TEXT_INDEX_REPORTED_KEY = Object.freeze({ _fts: "text", _ftsx: 1 });

const reportedIndexKey = (key: IndexTarget["key"]): Document =>
  Object.values(key).includes("text") ? TEXT_INDEX_REPORTED_KEY : key;

export const isRepeatableContentIndexReady = (
  index: IndexDescriptionInfo,
  target: IndexTarget
): boolean =>
  index.name === target.options.name &&
  canonical(index.key) === canonical(reportedIndexKey(target.key)) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  Boolean(index.sparse) === Boolean(target.options.sparse) &&
  Number(index.expireAfterSeconds ?? -1) ===
    Number(target.options.expireAfterSeconds ?? -1) &&
  canonical(index.partialFilterExpression) ===
    canonical(target.options.partialFilterExpression) &&
  canonical(index.weights) === canonical(target.options.weights) &&
  canonical(index.default_language) ===
    canonical(target.options.default_language) &&
  canonical(index.collation) === canonical(target.options.collation);

const inspectDocuments = async (db: Db) => {
  let documents = 0;
  let incompatibleDocuments = 0;
  let duplicateSlugGroups = 0;
  for (const [collection] of CONTENT_COLLECTIONS) {
    const records = db.collection(collection);
    documents += await records.countDocuments();
    incompatibleDocuments += await records.countDocuments({
      $or: [
        { contract_version: { $ne: 1 } },
        { locale: { $ne: "en" } },
        { slug: { $not: { $type: "string" } } },
        { title: { $not: { $type: "string" } } },
        { search_text: { $not: { $type: "string" } } },
        { status: { $nin: ["draft", "published", "archived"] } },
        {
          claim_verification: {
            $nin: ["unverified", "derived", "verified", "not_applicable"],
          },
        },
        { secondary_pillars: { $not: { $type: "array" } } },
        { sequence: { $not: { $type: "number" } } },
        { enabled: { $not: { $type: "bool" } } },
        { is_featured: { $not: { $type: "bool" } } },
        {
          status: "published",
          published_at: { $not: { $type: "date" } },
        },
        {
          status: "published",
          first_published_at: { $not: { $type: "date" } },
        },
        { status: "published", claim_verification: "unverified" },
        { version: { $not: { $type: "number" } } },
        { created_by: { $not: { $type: "objectId" } } },
        { updated_by: { $not: { $type: "objectId" } } },
        { is_deleted: { $not: { $type: "bool" } } },
      ],
    });
    const duplicate = await records
      .aggregate([
        { $match: { is_deleted: false } },
        {
          $group: {
            _id: { locale: "$locale", slug: "$slug" },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ])
      .toArray();
    duplicateSlugGroups += duplicate.length;
  }
  const duplicateCacheIntents = await db
    .collection("repeatable_cache_invalidations")
    .aggregate([
      {
        $group: {
          _id: {
            domain: "$domain",
            target: "$target",
            target_version: "$target_version",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();
  return {
    documents,
    incompatible_documents: incompatibleDocuments,
    duplicate_active_slug_groups: duplicateSlugGroups,
    duplicate_cache_intent_groups: duplicateCacheIntents.length,
  };
};

export const inspectRepeatableContentFoundation = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicts = 0;
  const indexesByCollection = new Map<string, IndexDescriptionInfo[]>();
  for (const target of REPEATABLE_CONTENT_INDEX_TARGETS) {
    if (!indexesByCollection.has(target.collection)) {
      indexesByCollection.set(
        target.collection,
        await getIndexes(db, target.collection)
      );
    }
    const indexes = indexesByCollection.get(target.collection) ?? [];
    const named = indexes.find((index) => index.name === target.options.name);
    if (!named) missing += 1;
    else if (isRepeatableContentIndexReady(named, target)) ready += 1;
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
  state: Awaited<ReturnType<typeof inspectRepeatableContentFoundation>>
): void => {
  if (
    state.incompatible_documents ||
    state.duplicate_active_slug_groups ||
    state.duplicate_cache_intent_groups
  ) {
    throw new MigrationError(
      "REPEATABLE_CONTENT_REMEDIATION_REQUIRED",
      "Existing repeatable content requires explicit remediation; this migration will not invent slugs, ownership, claims, consent, or evidence."
    );
  }
  if (state.conflicting_indexes) {
    throw new MigrationError(
      "REPEATABLE_CONTENT_INDEX_CONFLICT",
      "A repeatable-content index name has an incompatible definition."
    );
  }
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspectRepeatableContentFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectRepeatableContentFoundation(context.db);
  assertSafeState(before);
  let created = 0;
  for (const target of REPEATABLE_CONTENT_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isRepeatableContentIndexReady(index, target))) {
      continue;
    }
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }
  const after = await inspectRepeatableContentFoundation(context.db);
  assertSafeState(after);
  if (after.missing_indexes) {
    throw new MigrationError(
      "REPEATABLE_CONTENT_VERIFICATION_FAILED",
      "Repeatable-content indexes did not reach the verified target state."
    );
  }
  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202607150012-repeatable-content-foundation",
  description:
    "Create bounded repeatable-content, trust, ordering, and durable cache-invalidation indexes without inventing portfolio claims.",
  source_path:
    "src/lib/db/migrations/202607150012-repeatable-content-foundation.ts",
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
