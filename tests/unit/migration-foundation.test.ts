import type { IndexDescriptionInfo } from "mongodb";
import { describe, expect, it } from "vitest";
import { parseBackupConfirmation } from "@/lib/db/migrations/backup";
import { calculateMigrationChecksums } from "@/lib/db/migrations/checksum";
import { getExplicitMigrationDatabaseName } from "@/lib/db/migrations/connection";
import { getLeaseExpiry } from "@/lib/db/migrations/lease";
import { validateMigrationRegistry } from "@/lib/db/migrations/registry";
import { assertStoredMigrationIntegrity } from "@/lib/db/migrations/runner";
import type {
  MigrationDefinition,
  MigrationRecord,
} from "@/lib/db/migrations/types";
import {
  findLegacyFullUniqueIndexes,
  isDesiredPartialIndex,
  isSoftDeleteIndexMigrationComplete,
  SOFT_DELETE_UNIQUE_INDEX_TARGETS,
} from "@/lib/db/migrations/202607150001-partial-unique-soft-delete-indexes";
import {
  CONTACT_INTAKE_INDEX_TARGETS,
  isContactIntakeIndexReady,
} from "@/lib/db/migrations/202607150004-contact-intake-foundation";
import { AUTH_SESSION_INDEX_TARGETS } from "@/lib/db/migrations/202607150008-auth-session-foundation";

function migration(
  id: string,
  overrides: Partial<MigrationDefinition> = {}
): MigrationDefinition {
  return {
    id,
    description: id,
    source_path: `src/lib/db/migrations/${id}.ts`,
    behavior: {
      transaction: "none",
      creates_indexes: false,
      destructive: false,
      resumable: true,
    },
    dry_run: async () => ({}),
    up: async () => ({}),
    ...overrides,
  };
}

function record(
  id: string,
  checksum: string,
  status: MigrationRecord["status"] = "applied"
): MigrationRecord {
  const now = new Date("2026-07-15T09:00:00.000Z");
  return {
    _id: id,
    checksum,
    description: id,
    status,
    release: "test",
    attempts: 1,
    runner_owner: null,
    checkpoint: null,
    summary: null,
    created_at: now,
    started_at: now,
    updated_at: now,
    finished_at: now,
    duration_ms: 0,
  };
}

describe("migration registry and checksums", () => {
  it("accepts replica-set seed lists while requiring an explicit database", () => {
    expect(
      getExplicitMigrationDatabaseName(
        "mongodb://user:password@host1:27017,host2:27017/portfolio?replicaSet=rs0"
      )
    ).toBe("portfolio");
    expect(() =>
      getExplicitMigrationDatabaseName("mongodb://host1:27017,host2:27017")
    ).toThrow("explicit database name");
  });

  it("accepts strictly ordered immutable filenames", () => {
    const migrations = [
      migration("202607150001-first-change"),
      migration("202607150002-second-change"),
    ];

    expect(validateMigrationRegistry(migrations)).toBe(migrations);
  });

  it("rejects duplicate or out-of-order migration ids", () => {
    expect(() =>
      validateMigrationRegistry([
        migration("202607150002-second-change"),
        migration("202607150001-first-change"),
      ])
    ).toThrow("not strictly ordered");

    expect(() =>
      validateMigrationRegistry([
        migration("202607150001-first-change"),
        migration("202607150001-first-change"),
      ])
    ).toThrow("duplicated");
  });

  it("checksums the source bytes and fails closed on drift", async () => {
    const definition = migration("202607150001-first-change");
    const checksums = await calculateMigrationChecksums(
      [definition],
      async () => "immutable migration source"
    );
    const checksum = checksums.get(definition.id)!;

    expect(() =>
      assertStoredMigrationIntegrity({
        migrations: [definition],
        checksums,
        records: [record(definition.id, checksum)],
      })
    ).not.toThrow();

    expect(() =>
      assertStoredMigrationIntegrity({
        migrations: [definition],
        checksums,
        records: [record(definition.id, "changed")],
      })
    ).toThrow("checksum differs");
  });

  it("rejects an applied migration after an unapplied predecessor", () => {
    const first = migration("202607150001-first-change");
    const second = migration("202607150002-second-change");
    const checksums = new Map([
      [first.id, "first"],
      [second.id, "second"],
    ]);

    expect(() =>
      assertStoredMigrationIntegrity({
        migrations: [first, second],
        checksums,
        records: [record(second.id, "second")],
      })
    ).toThrow("earlier unapplied migration");
  });
});

describe("contact intake migration", () => {
  it("declares the unique idempotency and outbox indexes without PII fields", () => {
    const uniqueTargets = CONTACT_INTAKE_INDEX_TARGETS.filter(
      (target) => "unique" in target.options && target.options.unique
    );

    expect(uniqueTargets.map((target) => target.options.name)).toEqual([
      "key_hash_1",
      "public_receipt_1",
      "one_contact_notification_outbox_event",
    ]);
    expect(JSON.stringify(CONTACT_INTAKE_INDEX_TARGETS)).not.toMatch(
      /message|email|name_1/
    );
  });

  it("does not accept a same-name idempotency index without uniqueness", () => {
    const target = CONTACT_INTAKE_INDEX_TARGETS.find(
      (candidate) => candidate.options.name === "key_hash_1"
    )!;

    expect(
      isContactIntakeIndexReady(
        { name: "key_hash_1", key: { key_hash: 1 } },
        target
      )
    ).toBe(false);
    expect(
      isContactIntakeIndexReady(
        { name: "key_hash_1", key: { key_hash: 1 }, unique: true },
        target
      )
    ).toBe(true);
  });
});

describe("auth session migration", () => {
  it("creates only hashed-token/session lookup and expiry indexes", () => {
    expect(
      AUTH_SESSION_INDEX_TARGETS.map(({ options }) => options.name)
    ).toEqual([
      "unique_session_id",
      "family_id_1_revoked_at_1",
      "user_1_revoked_at_1_expires_at_1",
      "expire_auth_sessions",
      "token_hash_1",
      "user_1",
      "expires_at_1",
      "user_1_status_1_created_at_-1",
    ]);
    const indexedKeys = AUTH_SESSION_INDEX_TARGETS.flatMap(({ key }) =>
      Object.keys(key)
    );
    expect(indexedKeys).not.toContain("email");
    expect(indexedKeys).not.toContain("password");
    expect(indexedKeys).not.toContain("refresh_token");
  });
});

describe("destructive migration gates", () => {
  it("accepts a fresh canonical backup verification without retaining its id", () => {
    const confirmation = parseBackupConfirmation({
      reference: "atlas-snapshot-production-42",
      verified_at: "2026-07-15T08:30:00.000Z",
      now: new Date("2026-07-15T09:00:00.000Z"),
    });

    expect(confirmation).toEqual({
      reference_fingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
      verified_at: new Date("2026-07-15T08:30:00.000Z"),
    });
    expect(JSON.stringify(confirmation)).not.toContain("atlas-snapshot");
  });

  it("rejects stale, future, and partial backup confirmations", () => {
    const now = new Date("2026-07-15T09:00:00.000Z");

    expect(() =>
      parseBackupConfirmation({ reference: "snapshot", now })
    ).toThrow("must be an ISO-8601 timestamp");
    expect(() =>
      parseBackupConfirmation({
        reference: "snapshot",
        verified_at: "2026-07-14T08:59:59.999Z",
        now,
      })
    ).toThrow("older than");
    expect(() =>
      parseBackupConfirmation({
        reference: "snapshot",
        verified_at: "2026-07-15T09:06:00.000Z",
        now,
      })
    ).toThrow("future");
  });

  it("calculates deterministic lease expiry", () => {
    expect(
      getLeaseExpiry(new Date("2026-07-15T09:00:00.000Z"), 60_000)
    ).toEqual(new Date("2026-07-15T09:01:00.000Z"));
  });
});

describe("partial unique index migration", () => {
  const target = SOFT_DELETE_UNIQUE_INDEX_TARGETS[0];

  it("recognizes only the exact named active-record partial index", () => {
    const desired: IndexDescriptionInfo = {
      name: target.desired_name,
      key: { name: 1 },
      unique: true,
      partialFilterExpression: { is_deleted: false },
    };

    expect(isDesiredPartialIndex(desired, target)).toBe(true);
    expect(
      isDesiredPartialIndex(
        { ...desired, partialFilterExpression: { is_deleted: { $ne: true } } },
        target
      )
    ).toBe(false);
  });

  it("selects full unique legacy indexes without selecting partial indexes", () => {
    const indexes: IndexDescriptionInfo[] = [
      { name: "_id_", key: { _id: 1 }, unique: true },
      { name: "name_1", key: { name: 1 }, unique: true },
      {
        name: target.desired_name,
        key: { name: 1 },
        unique: true,
        partialFilterExpression: { is_deleted: false },
      },
    ];

    expect(
      findLegacyFullUniqueIndexes(indexes, target).map((index) => index.name)
    ).toEqual(["name_1"]);
  });

  it("does not silently manage customized legacy indexes", () => {
    const customized: IndexDescriptionInfo[] = [
      {
        name: "name_custom_unique",
        key: { name: 1 },
        unique: true,
        collation: { locale: "en", strength: 2 },
      },
      {
        name: "name_sparse_unique",
        key: { name: 1 },
        unique: true,
        sparse: true,
      },
    ];

    expect(findLegacyFullUniqueIndexes(customized, target)).toEqual([]);
  });

  it("recognizes a same-name full unique index as legacy", () => {
    const legacy: IndexDescriptionInfo = {
      name: target.desired_name,
      key: { name: 1 },
      unique: true,
    };

    expect(findLegacyFullUniqueIndexes([legacy], target)).toEqual([legacy]);
    expect(isDesiredPartialIndex(legacy, target)).toBe(false);
  });

  it("does not treat a safe-to-apply but missing index as complete", () => {
    expect(
      isSoftDeleteIndexMigrationComplete({
        can_apply: true,
        targets: [
          {
            collection: "users",
            desired_index: "unique_email_not_deleted",
            collection_exists: true,
            desired_state: "missing",
            legacy_full_unique_indexes: [],
            active_documents_requiring_normalization: 0,
            active_collisions: {
              groups: 0,
              documents: 0,
            },
          },
        ],
      })
    ).toBe(false);
  });
});
