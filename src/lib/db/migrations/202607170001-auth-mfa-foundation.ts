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

type MfaIndexTarget = Readonly<{
  collection: "auth_mfa_credentials" | "auth_mfa_challenges";
  key: IndexSpecification;
  options: CreateIndexesOptions & { name: string };
}>;

export const AUTH_MFA_USER_BACKFILL_FILTER = Object.freeze({
  mfa_version: { $exists: false },
});

export const AUTH_MFA_INDEX_TARGETS = Object.freeze([
  {
    collection: "auth_mfa_credentials",
    key: { user: 1 },
    options: { name: "unique_mfa_credential_user", unique: true },
  },
  {
    collection: "auth_mfa_challenges",
    key: { token_hash: 1 },
    options: { name: "unique_mfa_challenge_token_hash", unique: true },
  },
  {
    collection: "auth_mfa_challenges",
    key: { user: 1, consumed_at: 1, expires_at: 1 },
    options: { name: "mfa_challenge_user_state" },
  },
  {
    collection: "auth_mfa_challenges",
    key: { expires_at: 1 },
    options: { name: "expire_mfa_challenges", expireAfterSeconds: 0 },
  },
] as const satisfies readonly MfaIndexTarget[]);

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

export const isAuthMfaIndexReady = (
  index: IndexDescriptionInfo,
  target: MfaIndexTarget
): boolean =>
  index.name === target.options.name &&
  normalizeKey(index.key) === normalizeKey(target.key) &&
  Boolean(index.unique) === Boolean(target.options.unique) &&
  (index.expireAfterSeconds ?? null) ===
    (target.options.expireAfterSeconds ?? null);

const inspect = async (db: Db) => {
  let ready = 0;
  let missing = 0;
  let conflicting = 0;
  for (const target of AUTH_MFA_INDEX_TARGETS) {
    const indexes = await getIndexes(db, target.collection);
    const named = indexes.find(({ name }) => name === target.options.name);
    if (!named) missing += 1;
    else if (isAuthMfaIndexReady(named, target)) ready += 1;
    else conflicting += 1;
  }
  return {
    ready_indexes: ready,
    missing_indexes: missing,
    conflicts: conflicting,
    missing_user_mfa_versions: await db
      .collection("users")
      .countDocuments(AUTH_MFA_USER_BACKFILL_FILTER),
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  await inspect(context.db);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspect(context.db);
  if (before.conflicts) {
    throw new MigrationError(
      "AUTH_MFA_INDEX_CONFLICT",
      "MFA index names already exist with incompatible definitions."
    );
  }

  let created = 0;
  await context.assert_lease();
  const backfillResult = await context.db
    .collection("users")
    .updateMany(AUTH_MFA_USER_BACKFILL_FILTER, {
      $set: { mfa_version: 0 },
    });
  for (const target of AUTH_MFA_INDEX_TARGETS) {
    await context.assert_lease();
    const indexes = await getIndexes(context.db, target.collection);
    if (indexes.some((index) => isAuthMfaIndexReady(index, target))) continue;
    await context.db
      .collection(target.collection)
      .createIndex(target.key, target.options);
    created += 1;
  }

  const after = await inspect(context.db);
  if (
    after.missing_indexes ||
    after.conflicts ||
    after.missing_user_mfa_versions
  ) {
    throw new MigrationError(
      "AUTH_MFA_VERIFICATION_FAILED",
      "MFA indexes did not reach the verified target state."
    );
  }
  return {
    created_indexes: created,
    backfilled_user_mfa_versions: backfillResult.modifiedCount,
    ...after,
  };
};

const migration: MigrationDefinition = {
  id: "202607170001-auth-mfa-foundation",
  description:
    "Backfill user MFA state and create unique encrypted credential and expiring one-time challenge indexes.",
  source_path: "src/lib/db/migrations/202607170001-auth-mfa-foundation.ts",
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
