import type {
  Collection,
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

type ManagedIndexTarget = Readonly<{
  collection: string;
  key: Readonly<Record<string, 1 | -1>>;
  desired_name: string;
}>;

type CollisionReport = Readonly<{
  groups: number;
  documents: number;
}>;

type TargetPreflight = Readonly<{
  collection: string;
  desired_index: string;
  collection_exists: boolean;
  desired_state: "ready" | "missing" | "replaceable-legacy" | "conflicting";
  legacy_full_unique_indexes: readonly string[];
  active_documents_requiring_normalization: number;
  active_collisions: CollisionReport;
}>;

type MigrationPreflight = Readonly<{
  can_apply: boolean;
  targets: readonly TargetPreflight[];
}>;

const ACTIVE_PARTIAL_FILTER = Object.freeze({ is_deleted: false });
const INVALID_ACTIVE_STATE_FILTER = Object.freeze({
  $nor: [{ is_deleted: true }, { is_deleted: false }],
});

export const SOFT_DELETE_UNIQUE_INDEX_TARGETS = Object.freeze([
  {
    collection: "articlecategories",
    key: { name: 1 },
    desired_name: "unique_article_category_name_active",
  },
  {
    collection: "articlecategories",
    key: { slug: 1 },
    desired_name: "unique_article_category_slug_active",
  },
  {
    collection: "projectcategories",
    key: { name: 1 },
    desired_name: "unique_project_category_name_active",
  },
  {
    collection: "projectcategories",
    key: { slug: 1 },
    desired_name: "unique_project_category_slug_active",
  },
  {
    collection: "reviews",
    key: { target: 1, target_model: 1, author: 1 },
    desired_name: "unique_review_target_author_active",
  },
  {
    collection: "users",
    key: { email: 1 },
    desired_name: "unique_email_not_deleted",
  },
] as const satisfies readonly ManagedIndexTarget[]);

function entriesEqual(
  left: Readonly<Record<string, unknown>> | undefined,
  right: Readonly<Record<string, unknown>>
) {
  if (!left) return false;

  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value], index) =>
        key === rightEntries[index]?.[0] && value === rightEntries[index]?.[1]
    )
  );
}

export function hasExactIndexKey(
  index: IndexDescriptionInfo,
  target: ManagedIndexTarget
) {
  return entriesEqual(index.key as Record<string, unknown>, target.key);
}

export function isDesiredPartialIndex(
  index: IndexDescriptionInfo,
  target: ManagedIndexTarget
) {
  return (
    index.name === target.desired_name &&
    index.unique === true &&
    hasExactIndexKey(index, target) &&
    entriesEqual(
      index.partialFilterExpression as Record<string, unknown> | undefined,
      ACTIVE_PARTIAL_FILTER
    )
  );
}

export function findLegacyFullUniqueIndexes(
  indexes: readonly IndexDescriptionInfo[],
  target: ManagedIndexTarget
) {
  return indexes.filter(
    (index) =>
      index.name !== "_id_" &&
      index.unique === true &&
      !index.partialFilterExpression &&
      index.sparse !== true &&
      index.hidden !== true &&
      !index.collation &&
      hasExactIndexKey(index, target)
  );
}

function findUnsupportedFullUniqueIndexes(
  indexes: readonly IndexDescriptionInfo[],
  target: ManagedIndexTarget
) {
  const managed = new Set(findLegacyFullUniqueIndexes(indexes, target));
  return indexes.filter(
    (index) =>
      index.name !== "_id_" &&
      index.unique === true &&
      !index.partialFilterExpression &&
      hasExactIndexKey(index, target) &&
      !managed.has(index)
  );
}

function isNamespaceMissing(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 26
  );
}

export function isEquivalentIndexConflict(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const code = "code" in error ? error.code : undefined;
  const codeName = "codeName" in error ? error.codeName : undefined;

  return (
    code === 85 ||
    code === 86 ||
    codeName === "IndexOptionsConflict" ||
    codeName === "IndexKeySpecsConflict"
  );
}

async function collectionExists(db: Db, collectionName: string) {
  return db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();
}

async function getIndexes(collection: Collection) {
  try {
    return await collection.indexes();
  } catch (error) {
    if (isNamespaceMissing(error)) return [];
    throw error;
  }
}

function collisionGroupId(target: ManagedIndexTarget) {
  return Object.fromEntries(
    Object.keys(target.key).map((field) => [field, `$${field}`])
  );
}

async function inspectActiveCollisions(
  collection: Collection,
  target: ManagedIndexTarget
): Promise<CollisionReport> {
  type CollisionFacet = {
    summary: Array<{ groups: number; documents: number }>;
  };

  const [result] = await collection
    .aggregate<CollisionFacet>([
      { $match: { is_deleted: { $ne: true } } },
      {
        $group: {
          _id: collisionGroupId(target),
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                groups: { $sum: 1 },
                documents: { $sum: "$count" },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  return {
    groups: result?.summary[0]?.groups ?? 0,
    documents: result?.summary[0]?.documents ?? 0,
  };
}

async function inspectTarget(
  db: Db,
  target: ManagedIndexTarget
): Promise<TargetPreflight> {
  const exists = await collectionExists(db, target.collection);

  if (!exists) {
    return {
      collection: target.collection,
      desired_index: target.desired_name,
      collection_exists: false,
      desired_state: "missing",
      legacy_full_unique_indexes: [],
      active_documents_requiring_normalization: 0,
      active_collisions: {
        groups: 0,
        documents: 0,
      },
    };
  }

  const collection = db.collection(target.collection);
  const [indexes, normalizationCount, activeCollisions] = await Promise.all([
    getIndexes(collection),
    collection.countDocuments(INVALID_ACTIVE_STATE_FILTER),
    inspectActiveCollisions(collection, target),
  ]);
  const namedIndex = indexes.find(
    (index) => index.name === target.desired_name
  );
  const legacyIndexes = findLegacyFullUniqueIndexes(indexes, target);
  const unsupportedLegacyIndexes = findUnsupportedFullUniqueIndexes(
    indexes,
    target
  );

  return {
    collection: target.collection,
    desired_index: target.desired_name,
    collection_exists: true,
    desired_state:
      unsupportedLegacyIndexes.length > 0
        ? "conflicting"
        : namedIndex
          ? isDesiredPartialIndex(namedIndex, target)
            ? "ready"
            : legacyIndexes.includes(namedIndex)
              ? "replaceable-legacy"
              : "conflicting"
          : "missing",
    legacy_full_unique_indexes: legacyIndexes.flatMap((index) =>
      index.name ? [index.name] : []
    ),
    active_documents_requiring_normalization: normalizationCount,
    active_collisions: activeCollisions,
  };
}

export async function inspectSoftDeleteUniqueIndexes(
  db: Db
): Promise<MigrationPreflight> {
  const targets = await Promise.all(
    SOFT_DELETE_UNIQUE_INDEX_TARGETS.map((target) => inspectTarget(db, target))
  );

  return {
    can_apply: targets.every(
      (target) =>
        target.active_collisions.groups === 0 &&
        target.desired_state !== "conflicting"
    ),
    targets,
  };
}

export function isSoftDeleteIndexMigrationComplete(
  preflight: MigrationPreflight
): boolean {
  return preflight.targets.every(
    (target) =>
      target.collection_exists &&
      target.desired_state === "ready" &&
      target.legacy_full_unique_indexes.length === 0 &&
      target.active_documents_requiring_normalization === 0 &&
      target.active_collisions.groups === 0
  );
}

function assertPreflightCanApply(preflight: MigrationPreflight) {
  const collisions = preflight.targets
    .filter((target) => target.active_collisions.groups > 0)
    .map((target) => ({
      collection: target.collection,
      index: target.desired_index,
      groups: target.active_collisions.groups,
      documents: target.active_collisions.documents,
    }));

  if (collisions.length > 0) {
    throw new MigrationError(
      "MIGRATION_ACTIVE_UNIQUE_COLLISIONS",
      "Active unique-key collisions must be resolved before index migration can mutate data.",
      { collisions }
    );
  }

  const conflicting = preflight.targets
    .filter((target) => target.desired_state === "conflicting")
    .map((target) => ({
      collection: target.collection,
      index: target.desired_index,
    }));

  if (conflicting.length > 0) {
    throw new MigrationError(
      "MIGRATION_DESIRED_INDEX_NAME_CONFLICT",
      "A desired index name is already used by a different specification; review it manually before applying.",
      { indexes: conflicting }
    );
  }
}

function desiredIndexOptions(target: ManagedIndexTarget): CreateIndexesOptions {
  return {
    name: target.desired_name,
    unique: true,
    partialFilterExpression: ACTIVE_PARTIAL_FILTER,
  };
}

function legacyIndexOptions(index: IndexDescriptionInfo): CreateIndexesOptions {
  return {
    ...(index.name ? { name: index.name } : {}),
    unique: index.unique === true,
    ...(index.sparse !== undefined ? { sparse: index.sparse } : {}),
    ...(index.hidden !== undefined ? { hidden: index.hidden } : {}),
    ...(index.collation ? { collation: index.collation } : {}),
  };
}

async function createDesiredIndex(db: Db, target: ManagedIndexTarget) {
  const collection = db.collection(target.collection);
  await collection.createIndex(
    target.key as IndexSpecification,
    desiredIndexOptions(target)
  );
}

async function verifyDesiredIndex(db: Db, target: ManagedIndexTarget) {
  const indexes = await getIndexes(db.collection(target.collection));
  const desired = indexes.find((index) => index.name === target.desired_name);

  if (!desired || !isDesiredPartialIndex(desired, target)) {
    throw new MigrationError(
      "MIGRATION_INDEX_VERIFICATION_FAILED",
      `Desired index ${target.desired_name} on ${target.collection} could not be verified.`
    );
  }
}

async function replaceConflictingIndexWithGap(
  context: MigrationContext,
  target: ManagedIndexTarget
) {
  const collection = context.db.collection(target.collection);
  const indexes = await getIndexes(collection);
  const legacyIndexes = findLegacyFullUniqueIndexes(indexes, target);

  if (legacyIndexes.length === 0) {
    throw new MigrationError(
      "MIGRATION_EQUIVALENT_INDEX_CONFLICT_UNRESOLVED",
      `MongoDB rejected ${target.desired_name}, but no managed legacy index can be safely replaced.`
    );
  }

  const unnamedLegacy = legacyIndexes.some((index) => !index.name);
  if (unnamedLegacy) {
    throw new MigrationError(
      "MIGRATION_LEGACY_INDEX_NAME_MISSING",
      `A legacy index for ${target.desired_name} has no usable name and cannot be replaced automatically.`
    );
  }

  await context.assert_lease();

  for (const index of legacyIndexes) {
    await collection.dropIndex(index.name!);
  }

  try {
    await createDesiredIndex(context.db, target);
    await verifyDesiredIndex(context.db, target);
  } catch {
    const rollbackFailures: string[] = [];

    for (const index of legacyIndexes) {
      try {
        await collection.createIndex(
          index.key as IndexSpecification,
          legacyIndexOptions(index)
        );
      } catch {
        rollbackFailures.push(index.name!);
      }
    }

    if (rollbackFailures.length > 0) {
      throw new MigrationError(
        "MIGRATION_INDEX_ROLLBACK_FAILED",
        "Replacement index creation and legacy-index restoration both failed; keep writes disabled and restore the verified backup.",
        {
          collection: target.collection,
          desired_index: target.desired_name,
          unrestored_indexes: rollbackFailures,
          backup_reference:
            context.destructive.backup?.reference_fingerprint ?? "missing",
        }
      );
    }

    throw new MigrationError(
      "MIGRATION_INDEX_REPLACEMENT_ROLLED_BACK",
      `Replacement index ${target.desired_name} failed; the captured legacy unique index was restored.`
    );
  }
}

async function normalizeActiveState(context: MigrationContext) {
  const collections = [
    ...new Set(
      SOFT_DELETE_UNIQUE_INDEX_TARGETS.map((target) => target.collection)
    ),
  ];

  for (const collectionName of collections) {
    await context.assert_lease();
    const exists = await collectionExists(context.db, collectionName);
    if (!exists) continue;

    await context.db
      .collection(collectionName)
      .updateMany(INVALID_ACTIVE_STATE_FILTER, { $set: { is_deleted: false } });
  }

  await context.save_checkpoint({
    phase: "active-state-normalized",
    updated_at: context.now(),
  });
}

async function ensureAllDesiredIndexes(context: MigrationContext) {
  const replacementGapTargets: ManagedIndexTarget[] = [];

  for (const target of SOFT_DELETE_UNIQUE_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db.collection(target.collection));
    const current = indexes.find((index) => index.name === target.desired_name);

    if (current && isDesiredPartialIndex(current, target)) continue;

    if (
      current &&
      findLegacyFullUniqueIndexes(indexes, target).includes(current)
    ) {
      replacementGapTargets.push(target);
      continue;
    }

    if (current) {
      throw new MigrationError(
        "MIGRATION_DESIRED_INDEX_NAME_CONFLICT",
        `Index name ${target.desired_name} is occupied by an unmanaged specification.`
      );
    }

    try {
      await createDesiredIndex(context.db, target);
    } catch (error) {
      if (isEquivalentIndexConflict(error)) {
        replacementGapTargets.push(target);
        continue;
      }

      throw new MigrationError(
        "MIGRATION_INDEX_CREATE_FAILED",
        `Could not create ${target.desired_name} on ${target.collection}; no legacy index was dropped.`
      );
    }
  }

  if (replacementGapTargets.length > 0) {
    if (!context.destructive.allow_index_replacement_gap) {
      throw new MigrationError(
        "MIGRATION_INDEX_GAP_OPT_IN_REQUIRED",
        "MongoDB requires drop-before-create for at least one equivalent index. Re-run only after reviewing the dry-run, verifying a backup, quiescing writes, and explicitly allowing the replacement gap.",
        {
          indexes: replacementGapTargets.map((target) => ({
            collection: target.collection,
            index: target.desired_name,
          })),
        }
      );
    }

    if (!context.destructive.writes_quiesced) {
      throw new MigrationError(
        "MIGRATION_WRITES_MUST_BE_QUIESCED",
        "Drop-before-create index replacement requires an explicit confirmation that application writes are quiesced."
      );
    }

    for (const target of replacementGapTargets) {
      await replaceConflictingIndexWithGap(context, target);
    }
  }

  for (const target of SOFT_DELETE_UNIQUE_INDEX_TARGETS) {
    await verifyDesiredIndex(context.db, target);
  }

  await context.save_checkpoint({
    phase: "replacement-indexes-verified",
    indexes: SOFT_DELETE_UNIQUE_INDEX_TARGETS.map(
      (target) => target.desired_name
    ),
    updated_at: context.now(),
  });

  return replacementGapTargets;
}

async function removeLegacyIndexes(context: MigrationContext) {
  const removed: Array<{ collection: string; index: string }> = [];

  for (const target of SOFT_DELETE_UNIQUE_INDEX_TARGETS) {
    await context.assert_lease();
    await verifyDesiredIndex(context.db, target);

    const collection = context.db.collection(target.collection);
    const indexes = await getIndexes(collection);
    const legacyIndexes = findLegacyFullUniqueIndexes(indexes, target);

    for (const legacyIndex of legacyIndexes) {
      if (!legacyIndex.name) {
        throw new MigrationError(
          "MIGRATION_LEGACY_INDEX_NAME_MISSING",
          `A legacy index for ${target.desired_name} cannot be dropped without a name.`
        );
      }

      await collection.dropIndex(legacyIndex.name);
      removed.push({
        collection: target.collection,
        index: legacyIndex.name,
      });
    }
  }

  await context.save_checkpoint({
    phase: "legacy-indexes-removed",
    removed,
    updated_at: context.now(),
  });

  return removed;
}

async function dryRun(context: MigrationContext): Promise<MigrationSummary> {
  return inspectSoftDeleteUniqueIndexes(context.db);
}

async function up(context: MigrationContext): Promise<MigrationSummary> {
  if (!context.destructive.backup) {
    throw new MigrationError(
      "MIGRATION_BACKUP_CONFIRMATION_REQUIRED",
      "A fresh, verified backup reference is required before applying this migration."
    );
  }

  await context.assert_lease();
  const preflight = await inspectSoftDeleteUniqueIndexes(context.db);
  assertPreflightCanApply(preflight);

  await normalizeActiveState(context);
  const replacementGapTargets = await ensureAllDesiredIndexes(context);
  const removed = await removeLegacyIndexes(context);
  const verification = await inspectSoftDeleteUniqueIndexes(context.db);

  if (!isSoftDeleteIndexMigrationComplete(verification)) {
    throw new MigrationError(
      "MIGRATION_FINAL_VERIFICATION_FAILED",
      "Soft-delete unique-index migration did not reach a verified final state."
    );
  }

  return {
    backup_reference: context.destructive.backup.reference_fingerprint,
    normalized_collections: [
      ...new Set(
        SOFT_DELETE_UNIQUE_INDEX_TARGETS.map((target) => target.collection)
      ),
    ],
    verified_indexes: SOFT_DELETE_UNIQUE_INDEX_TARGETS.map(
      (target) => target.desired_name
    ),
    removed_legacy_indexes: removed,
    replacement_gap_used: replacementGapTargets.length > 0,
  };
}

const migration = {
  id: "202607150001-partial-unique-soft-delete-indexes",
  description:
    "Replace legacy full unique indexes with active-record partial unique indexes.",
  source_path:
    "src/lib/db/migrations/202607150001-partial-unique-soft-delete-indexes.ts",
  behavior: {
    transaction: "none",
    creates_indexes: true,
    destructive: true,
    resumable: true,
  },
  dry_run: dryRun,
  up,
} as const satisfies MigrationDefinition;

export default migration;
