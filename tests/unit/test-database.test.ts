import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
  getTestTransactionMode,
  runInTestTransactionMode,
} from "../helpers/test-database";

afterEach(() => vi.unstubAllEnvs());

describe("assertSafeTestDatabaseUrl", () => {
  it.each([
    "mongodb://127.0.0.1:27017/foysalahmedmin_test",
    "mongodb://127.0.0.1:27017/test_portfolio",
    "mongodb+srv://user:password@example.mongodb.net/portfolio-test",
  ])("accepts isolated test database %s", (databaseUrl) => {
    expect(assertSafeTestDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it.each([
    "mongodb://127.0.0.1:27017/foysalahmedmin",
    "mongodb://127.0.0.1:27017/contest",
    "mongodb://127.0.0.1:27017/",
    "https://example.com/portfolio_test",
    "not-a-url",
  ])("rejects unsafe database %s", (databaseUrl) => {
    expect(() => assertSafeTestDatabaseUrl(databaseUrl)).toThrow();
  });
});

describe("assertSafeTestDatabaseName", () => {
  it.each(["portfolio_test", "test_portfolio", "portfolio-test-data"])(
    "accepts isolated database name %s",
    (databaseName) => {
      expect(assertSafeTestDatabaseName(databaseName)).toBe(databaseName);
    }
  );

  it.each(["portfolio", "contest", "production"])(
    "rejects unsafe database name %s",
    (databaseName) => {
      expect(() => assertSafeTestDatabaseName(databaseName)).toThrow();
    }
  );
});

describe("transaction test mode", () => {
  it.each(["replica-set", "compensation"])(
    "accepts supported mode %s",
    (mode) => {
      vi.stubEnv("TEST_TRANSACTION_MODE", mode);
      expect(getTestTransactionMode()).toBe(mode);
    }
  );

  it("rejects unknown transaction modes", () => {
    vi.stubEnv("TEST_TRANSACTION_MODE", "production");
    expect(() => getTestTransactionMode()).toThrow();
  });

  it.each([
    "mongodb://127.0.0.1:27017/portfolio_test?replicaSet=rs0",
    "mongodb+srv://user:password@example.mongodb.net/portfolio_test",
  ])("accepts replica-set-capable URL %s", (databaseUrl) => {
    expect(assertReplicaSetTestDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it("rejects standalone MongoDB in replica-set mode", () => {
    expect(() =>
      assertReplicaSetTestDatabaseUrl(
        "mongodb://127.0.0.1:27017/portfolio_test"
      )
    ).toThrow("Replica-set test mode");
  });

  it("runs the explicit compensation path without opening a transaction", async () => {
    vi.stubEnv("TEST_TRANSACTION_MODE", "compensation");
    const transaction = vi.fn();
    const compensation = vi.fn().mockResolvedValue("compensated");

    await expect(
      runInTestTransactionMode({ compensation, transaction })
    ).resolves.toBe("compensated");
    expect(compensation).toHaveBeenCalledOnce();
    expect(transaction).not.toHaveBeenCalled();
  });
});
