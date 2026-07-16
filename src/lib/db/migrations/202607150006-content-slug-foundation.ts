import type {
  CreateIndexesOptions,
  Db,
  Document,
  IndexDescriptionInfo,
  IndexSpecification,
} from "mongodb";
import { MigrationError } from "./errors.ts";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

type SlugTarget = Readonly<{
  collection: string;
  scope: "project" | "article" | "project_category" | "article_category";
  fallback: string;
}>;

const MAX_SLUG_LENGTH = 96;
const trimSeparator = (value: string): string => value.replace(/^-+|-+$/g, "");
const normalizeMigrationSlug = (value: string, fallback: string): string => {
  const normalized = trimSeparator(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
  );
  const safeFallback = trimSeparator(
    fallback.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  );
  return (
    trimSeparator((normalized || safeFallback || "content").slice(0, 96)) ||
    "content"
  );
};
const appendMigrationSlugSuffix = (slug: string, suffix: string): string => {
  const safeSuffix = normalizeMigrationSlug(suffix, "id").slice(0, 24);
  const available = Math.max(1, MAX_SLUG_LENGTH - safeSuffix.length - 1);
  return `${trimSeparator(slug.slice(0, available))}-${safeSuffix}`;
};

export const CONTENT_SLUG_TARGETS = Object.freeze([
  { collection: "projects", scope: "project", fallback: "project" },
  { collection: "articles", scope: "article", fallback: "article" },
  {
    collection: "projectcategories",
    scope: "project_category",
    fallback: "project-category",
  },
  {
    collection: "articlecategories",
    scope: "article_category",
    fallback: "article-category",
  },
] as const satisfies readonly SlugTarget[]);

type IndexTarget = Readonly<{
  collection: string;
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const CONTENT_SLUG_INDEX_TARGETS = Object.freeze([
  {
    collection: "projects",
    key: { slug: 1 },
    options: {
      name: "unique_project_slug_active",
      unique: true,
      partialFilterExpression: {
        is_deleted: false,
        slug: { $type: "string" },
      },
    },
  },
  {
    collection: "articles",
    key: { slug: 1 },
    options: {
      name: "unique_article_slug_active",
      unique: true,
      partialFilterExpression: {
        is_deleted: false,
        slug: { $type: "string" },
      },
    },
  },
  {
    collection: "content_slug_aliases",
    key: { scope: 1, slug: 1 },
    options: { name: "unique_content_slug_alias", unique: true },
  },
  {
    collection: "content_slug_aliases",
    key: { scope: 1, target: 1 },
    options: { name: "content_slug_alias_target" },
  },
] as const satisfies readonly IndexTarget[]);

const collectionExists = (db: Db, name: string) =>
  db.listCollections({ name }, { nameOnly: true }).hasNext();

const getIndexes = async (
  db: Db,
  collection: string
): Promise<IndexDescriptionInfo[]> => {
  if (!(await collectionExists(db, collection))) return [];
  return (await db
    .collection(collection)
    .listIndexes()
    .toArray()) as IndexDescriptionInfo[];
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value ?? null;
};
const objectEntriesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));

export const isContentSlugIndexReady = (
  index: IndexDescriptionInfo,
  target: IndexTarget
): boolean =>
  index.name === target.options.name &&
  objectEntriesEqual(index.key, target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  objectEntriesEqual(
    index.partialFilterExpression,
    target.options.partialFilterExpression
  );

type PlannedSlug = Readonly<{
  id: string;
  raw_id: Document["_id"];
  slug: string;
  prior_slug: string | null;
  history: Array<{ slug: string; changed_at: Date }>;
}>;

const planCollection = async (
  db: Db,
  target: SlugTarget,
  now: Date
): Promise<PlannedSlug[]> => {
  if (!(await collectionExists(db, target.collection))) return [];
  const records = await db
    .collection(target.collection)
    .find({}, { projection: { _id: 1, name: 1, slug: 1, slug_history: 1 } })
    .sort({ _id: 1 })
    .toArray();
  const claimed = new Map<string, string>();
  const aliasesExist = await collectionExists(db, "content_slug_aliases");
  if (aliasesExist) {
    const aliases = await db
      .collection("content_slug_aliases")
      .find({ scope: target.scope }, { projection: { slug: 1, target: 1 } })
      .toArray();
    aliases.forEach((alias) =>
      claimed.set(String(alias.slug), String(alias.target))
    );
  }

  return records.map((record) => {
    const id = String(record._id);
    const priorSlug =
      typeof record.slug === "string" && record.slug.trim()
        ? normalizeMigrationSlug(record.slug, target.fallback)
        : null;
    const base = normalizeMigrationSlug(
      typeof record.slug === "string" && record.slug.trim()
        ? record.slug
        : typeof record.name === "string"
          ? record.name
          : target.fallback,
      target.fallback
    );
    let slug = base;
    if (claimed.has(slug) && claimed.get(slug) !== id) {
      slug = appendMigrationSlugSuffix(base, id.slice(-8));
      let counter = 2;
      while (claimed.has(slug) && claimed.get(slug) !== id) {
        slug = appendMigrationSlugSuffix(base, `${id.slice(-8)}-${counter}`);
        counter += 1;
      }
    }
    claimed.set(slug, id);

    const existingHistory = Array.isArray(record.slug_history)
      ? record.slug_history
          .filter(
            (entry): entry is Document & { slug: string } =>
              entry && typeof entry.slug === "string"
          )
          .map((entry) => ({
            slug: normalizeMigrationSlug(entry.slug, target.fallback),
            changed_at:
              entry.changed_at instanceof Date ? entry.changed_at : now,
          }))
      : [];
    const history = [
      ...existingHistory,
      ...(priorSlug && priorSlug !== slug
        ? [{ slug: priorSlug, changed_at: now }]
        : []),
    ].filter(
      (entry, index, entries) =>
        entry.slug !== slug &&
        entries.findIndex((candidate) => candidate.slug === entry.slug) ===
          index
    );
    return { id, raw_id: record._id, slug, prior_slug: priorSlug, history };
  });
};

export const inspectContentSlugFoundation = async (db: Db) => {
  let recordsNeedingBackfill = 0;
  let collisions = 0;
  for (const target of CONTENT_SLUG_TARGETS) {
    const plan = await planCollection(db, target, new Date(0));
    recordsNeedingBackfill += plan.filter(
      (item) => item.prior_slug !== item.slug
    ).length;
    const baseCounts = new Map<string, number>();
    plan.forEach((item) =>
      baseCounts.set(
        item.prior_slug ?? item.slug,
        (baseCounts.get(item.prior_slug ?? item.slug) ?? 0) + 1
      )
    );
    collisions += [...baseCounts.values()].filter((count) => count > 1).length;
  }
  let missingIndexes = 0;
  for (const target of CONTENT_SLUG_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    if (!indexes.some((index) => isContentSlugIndexReady(index, target))) {
      missingIndexes += 1;
    }
  }
  return {
    records_needing_backfill: recordsNeedingBackfill,
    collision_groups: collisions,
    missing_indexes: missingIndexes,
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectContentSlugFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectContentSlugFoundation(context.db);
  let updatedRecords = 0;
  let aliasesCreated = 0;

  for (const target of CONTENT_SLUG_TARGETS) {
    await context.assert_lease();
    const plan = await planCollection(context.db, target, context.now());
    const collection = context.db.collection(target.collection);

    // Temporary values avoid unique-index swap/case-normalization conflicts.
    for (const item of plan.filter(
      (entry) => entry.prior_slug !== entry.slug
    )) {
      await collection.updateOne(
        { _id: item.raw_id },
        { $set: { slug: `migration-${item.id}` } }
      );
    }

    for (const item of plan) {
      await context.assert_lease();
      const result = await collection.updateOne(
        { _id: item.raw_id },
        { $set: { slug: item.slug, slug_history: item.history } }
      );
      updatedRecords += result.modifiedCount;

      for (const aliasSlug of [
        item.slug,
        ...item.history.map(({ slug }) => slug),
      ]) {
        const resultAlias = await context.db
          .collection("content_slug_aliases")
          .updateOne(
            { scope: target.scope, slug: aliasSlug },
            {
              $setOnInsert: {
                scope: target.scope,
                slug: aliasSlug,
                target: item.raw_id,
                created_at: context.now(),
              },
            },
            { upsert: true }
          );
        aliasesCreated += resultAlias.upsertedCount;
      }
    }
  }

  let createdIndexes = 0;
  for (const target of CONTENT_SLUG_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isContentSlugIndexReady(index, target)))
      continue;
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    createdIndexes += 1;
  }

  const after = await inspectContentSlugFoundation(context.db);
  if (after.records_needing_backfill || after.missing_indexes) {
    throw new MigrationError(
      "CONTENT_SLUG_VERIFICATION_FAILED",
      "Content slug backfill or index verification did not reach the target state."
    );
  }
  return {
    updated_records: updatedRecords,
    created_aliases: aliasesCreated,
    created_indexes: createdIndexes,
    ...before,
    remaining_missing_indexes: after.missing_indexes,
  };
};

const migration: MigrationDefinition = {
  id: "202607150006-content-slug-foundation",
  description:
    "Deterministically backfill canonical content slugs, preserve aliases, and add partial unique indexes.",
  source_path: "src/lib/db/migrations/202607150006-content-slug-foundation.ts",
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
