import mongoose from "mongoose";
import type { ClientSession } from "mongoose";

const TEST_DATABASE_NAME_PATTERN = /(^|[-_])test($|[-_])/i;

export const TEST_TRANSACTION_MODES = ["replica-set", "compensation"] as const;

export type TestTransactionMode = (typeof TEST_TRANSACTION_MODES)[number];

type TestTransactionExecutors<T> = {
  compensation: () => Promise<T>;
  transaction: (session: ClientSession) => Promise<T>;
};

export const assertSafeTestDatabaseName = (databaseName: string): string => {
  if (!databaseName || !TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      "Refusing destructive test database access: database name must contain a standalone 'test' segment."
    );
  }

  return databaseName;
};

export const assertSafeTestDatabaseUrl = (databaseUrl: string): string => {
  let databaseName: string;

  try {
    const parsedUrl = new URL(databaseUrl);

    if (!["mongodb:", "mongodb+srv:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported database protocol.");
    }

    databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid MongoDB URL.");
  }

  assertSafeTestDatabaseName(databaseName);

  return databaseUrl;
};

export const getTestDatabaseUrl = (): string =>
  assertSafeTestDatabaseUrl(
    process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "mongodb://127.0.0.1:27017/foysalahmedmin_test"
  );

export const getTestTransactionMode = (): TestTransactionMode => {
  const transactionMode =
    process.env.TEST_TRANSACTION_MODE?.trim().toLowerCase() ?? "compensation";

  if (
    !TEST_TRANSACTION_MODES.includes(transactionMode as TestTransactionMode)
  ) {
    throw new Error(
      `TEST_TRANSACTION_MODE must be one of: ${TEST_TRANSACTION_MODES.join(", ")}.`
    );
  }

  return transactionMode as TestTransactionMode;
};

export const assertReplicaSetTestDatabaseUrl = (
  databaseUrl: string
): string => {
  const safeDatabaseUrl = assertSafeTestDatabaseUrl(databaseUrl);
  const parsedUrl = new URL(safeDatabaseUrl);
  const hasReplicaSet =
    parsedUrl.protocol === "mongodb+srv:" ||
    Boolean(parsedUrl.searchParams.get("replicaSet"));

  if (!hasReplicaSet) {
    throw new Error(
      "Replica-set test mode requires a mongodb+srv URL or an explicit replicaSet query parameter."
    );
  }

  return safeDatabaseUrl;
};

export const getTransactionTestDatabaseUrl = (): string => {
  const databaseUrl = getTestDatabaseUrl();

  return getTestTransactionMode() === "replica-set"
    ? assertReplicaSetTestDatabaseUrl(databaseUrl)
    : databaseUrl;
};

export const runInTestTransactionMode = async <T>({
  compensation,
  transaction,
}: TestTransactionExecutors<T>): Promise<T> => {
  if (getTestTransactionMode() === "compensation") {
    return compensation();
  }

  const session = await mongoose.startSession();
  let completed = false;
  let result!: T;

  try {
    await session.withTransaction(async () => {
      result = await transaction(session);
      completed = true;
    });
  } finally {
    await session.endSession();
  }

  if (!completed) {
    throw new Error("The replica-set transaction completed without a result.");
  }

  return result;
};

export const connectTestDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test database connections require NODE_ENV=test.");
  }

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(getTransactionTestDatabaseUrl());
};

export const resetTestDatabase = async (): Promise<void> => {
  assertSafeTestDatabaseName(mongoose.connection.name);

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const disconnectTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
