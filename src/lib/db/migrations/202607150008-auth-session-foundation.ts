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
  collection: "auth_sessions" | "password_reset_tokens";
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const AUTH_SESSION_INDEX_TARGETS = Object.freeze([
  {
    collection: "auth_sessions",
    key: { sid: 1 },
    options: { name: "unique_session_id", unique: true },
  },
  {
    collection: "auth_sessions",
    key: { family_id: 1, revoked_at: 1 },
    options: { name: "family_id_1_revoked_at_1" },
  },
  {
    collection: "auth_sessions",
    key: { user: 1, revoked_at: 1, expires_at: 1 },
    options: { name: "user_1_revoked_at_1_expires_at_1" },
  },
  {
    collection: "auth_sessions",
    key: { expires_at: 1 },
    options: { name: "expire_auth_sessions", expireAfterSeconds: 0 },
  },
  {
    collection: "password_reset_tokens",
    key: { token_hash: 1 },
    options: { name: "token_hash_1", unique: true },
  },
  {
    collection: "password_reset_tokens",
    key: { user: 1 },
    options: { name: "user_1" },
  },
  {
    collection: "password_reset_tokens",
    key: { expires_at: 1 },
    options: { name: "expires_at_1", expireAfterSeconds: 0 },
  },
  {
    collection: "password_reset_tokens",
    key: { user: 1, status: 1, created_at: -1 },
    options: { name: "user_1_status_1_created_at_-1" },
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

const normalizeKey = (value: unknown): string =>
  JSON.stringify(Object.entries((value ?? {}) as Record<string, unknown>));

const isReady = (index: IndexDescriptionInfo, target: IndexTarget): boolean =>
  index.name === target.options.name &&
  normalizeKey(index.key) === normalizeKey(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  (index.expireAfterSeconds ?? null) ===
    (target.options.expireAfterSeconds ?? null);

const inspect = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicting = 0;
  for (const target of AUTH_SESSION_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find(({ name }) => name === target.options.name);
    if (!named) missing += 1;
    else if (isReady(named, target)) ready += 1;
    else conflicting += 1;
  }
  return {
    ready_indexes: ready,
    missing_indexes: missing,
    conflicts: conflicting,
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspect(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspect(context.db);
  if (before.conflicts) {
    throw new MigrationError(
      "AUTH_SESSION_INDEX_CONFLICT",
      "Auth session index names already exist with incompatible definitions."
    );
  }

  let created = 0;
  for (const target of AUTH_SESSION_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isReady(index, target))) continue;
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }

  const after = await inspect(context.db);
  if (after.missing_indexes || after.conflicts) {
    throw new MigrationError(
      "AUTH_SESSION_VERIFICATION_FAILED",
      "Auth session indexes did not reach the verified target state."
    );
  }
  return { created_indexes: created, ...after };
};

const migration: MigrationDefinition = {
  id: "202607150008-auth-session-foundation",
  description:
    "Create stateful refresh-session and one-time password-reset indexes.",
  source_path: "src/lib/db/migrations/202607150008-auth-session-foundation.ts",
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
