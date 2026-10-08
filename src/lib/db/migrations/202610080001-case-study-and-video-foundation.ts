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

type IndexTarget = Readonly<{
  collection: (typeof CASE_STUDY_AND_VIDEO_COLLECTIONS)[number];
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const CASE_STUDY_AND_VIDEO_COLLECTIONS = [
  "case_studies",
  "case_study_categories",
  "videos",
  "video_categories",
] as const;

const ACTIVE_PARTIAL_FILTER = { is_deleted: false } as const;
const ACTIVE_SLUG_FILTER = {
  is_deleted: false,
  slug: { $type: "string" },
} as const;

const categoryTargets = (
  collection: "case_study_categories" | "video_categories",
  prefix: "case_study_category" | "video_category"
): IndexTarget[] => [
  {
    collection,
    key: { name: 1 },
    options: {
      name: `unique_${prefix}_name_active`,
      unique: true,
      partialFilterExpression: ACTIVE_PARTIAL_FILTER,
    },
  },
  {
    collection,
    key: { slug: 1 },
    options: {
      name: `unique_${prefix}_slug_active`,
      unique: true,
      partialFilterExpression: ACTIVE_PARTIAL_FILTER,
    },
  },
];

const INDEX_TARGETS: IndexTarget[] = [
  {
    collection: "case_studies",
    key: { slug: 1 },
    options: {
      name: "unique_case_study_slug_active",
      unique: true,
      partialFilterExpression: ACTIVE_SLUG_FILTER,
    },
  },
  {
    collection: "case_studies",
    key: { status: 1, primary_pillar: 1, published_at: -1 },
    options: { name: "case_study_publication_pillar" },
  },
  {
    collection: "case_studies",
    key: { category: 1, status: 1 },
    options: { name: "case_study_category_status" },
  },
  ...categoryTargets("case_study_categories", "case_study_category"),
  {
    collection: "videos",
    key: { slug: 1 },
    options: {
      name: "unique_video_slug_active",
      unique: true,
      partialFilterExpression: ACTIVE_SLUG_FILTER,
    },
  },
  {
    collection: "videos",
    key: { status: 1, aspect_ratio: 1, published_at: -1 },
    options: { name: "video_publication_aspect" },
  },
  {
    collection: "videos",
    key: { category: 1, status: 1 },
    options: { name: "video_category_status" },
  },
  ...categoryTargets("video_categories", "video_category"),
];

export const CASE_STUDY_AND_VIDEO_INDEX_TARGETS: readonly IndexTarget[] =
  Object.freeze(INDEX_TARGETS);

const isNamespaceMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 26;

const getIndexes = async (
  db: Db,
  collection: IndexTarget["collection"]
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

export const isCaseStudyAndVideoIndexReady = (
  index: IndexDescriptionInfo,
  target: IndexTarget
): boolean =>
  index.name === target.options.name &&
  canonical(index.key) === canonical(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  canonical(index.partialFilterExpression) ===
    canonical(target.options.partialFilterExpression);

export const inspectCaseStudyAndVideoFoundation = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicts = 0;
  for (const target of CASE_STUDY_AND_VIDEO_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find((index) => index.name === target.options.name);
    const sameKey = indexes.find(
      (index) => canonical(index.key) === canonical(target.key)
    );
    if (!named && sameKey) conflicts += 1;
    else if (!named) missing += 1;
    else if (isCaseStudyAndVideoIndexReady(named, target)) ready += 1;
    else conflicts += 1;
  }
  return {
    ready_indexes: ready,
    missing_indexes: missing,
    conflicting_indexes: conflicts,
  };
};

const assertNoConflicts = (
  state: Awaited<ReturnType<typeof inspectCaseStudyAndVideoFoundation>>
): void => {
  if (state.conflicting_indexes) {
    throw new MigrationError(
      "CASE_STUDY_VIDEO_INDEX_CONFLICT",
      "Case study or video index names or keys conflict with the required contract."
    );
  }
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspectCaseStudyAndVideoFoundation(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectCaseStudyAndVideoFoundation(context.db);
  assertNoConflicts(before);
  let created = 0;
  for (const target of CASE_STUDY_AND_VIDEO_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (
      indexes.some((index) => isCaseStudyAndVideoIndexReady(index, target))
    ) {
      continue;
    }
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }
  const after = await inspectCaseStudyAndVideoFoundation(context.db);
  assertNoConflicts(after);
  if (after.missing_indexes) {
    throw new MigrationError(
      "CASE_STUDY_VIDEO_VERIFICATION_FAILED",
      "Case study and video indexes did not reach the verified target state."
    );
  }
  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202610080001-case-study-and-video-foundation",
  description:
    "Create the unique slug, publication, and category indexes for the Case study and Video content types and their categories.",
  source_path:
    "src/lib/db/migrations/202610080001-case-study-and-video-foundation.ts",
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
