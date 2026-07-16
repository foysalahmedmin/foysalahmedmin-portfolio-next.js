import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import type { Collection, Db, Document } from "mongodb";
import { parseBackupConfirmation } from "./backup.ts";
import {
  calculateMigrationChecksums,
  createFilesystemMigrationSourceReader,
  type MigrationSourceReader,
} from "./checksum.ts";
import { MigrationError, toSafeMigrationFailure } from "./errors.ts";
import { MongoMigrationLease } from "./lease.ts";
import { validateMigrationRegistry } from "./registry.ts";
import type {
  DestructiveMigrationOptions,
  MigrationContext,
  MigrationDefinition,
  MigrationRecord,
  MigrationRunItem,
  MigrationRunReport,
} from "./types.ts";

type MigrationRunnerOptions = Readonly<{
  db: Db;
  migrations: readonly MigrationDefinition[];
  source_root?: string;
  read_source?: MigrationSourceReader;
  release?: string;
  owner?: string;
  lease_ttl_ms?: number;
  now?: () => Date;
}>;

export type MigrationRunOptions = Readonly<{
  mode: "dry-run" | "apply";
  backup_reference?: string;
  backup_verified_at?: string;
  allow_index_replacement_gap?: boolean;
  writes_quiesced?: boolean;
}>;

type StoredMigrationIntegrityInput = Readonly<{
  migrations: readonly MigrationDefinition[];
  checksums: ReadonlyMap<string, string>;
  records: readonly MigrationRecord[];
}>;

function isMigrationStatus(value: unknown): value is MigrationRecord["status"] {
  return value === "running" || value === "applied" || value === "failed";
}

export function assertStoredMigrationIntegrity(
  input: StoredMigrationIntegrityInput
) {
  const migrationsById = new Map(
    input.migrations.map((migration) => [migration.id, migration])
  );
  const recordsById = new Map(
    input.records.map((record) => [record._id, record])
  );

  for (const record of input.records) {
    if (!migrationsById.has(record._id)) {
      throw new MigrationError(
        "MIGRATION_SOURCE_REMOVED",
        `Stored migration ${record._id} has no immutable source file.`
      );
    }

    if (!isMigrationStatus(record.status)) {
      throw new MigrationError(
        "MIGRATION_STATUS_INVALID",
        `Stored migration ${record._id} has an invalid status.`
      );
    }

    const expectedChecksum = input.checksums.get(record._id);
    if (!expectedChecksum || expectedChecksum !== record.checksum) {
      throw new MigrationError(
        "MIGRATION_CHECKSUM_DRIFT",
        `Migration ${record._id} checksum differs from its stored immutable checksum.`
      );
    }
  }

  let encounteredPending = false;
  for (const migration of input.migrations) {
    const record = recordsById.get(migration.id);

    if (record?.status !== "applied") {
      encounteredPending = true;
      continue;
    }

    if (encounteredPending) {
      throw new MigrationError(
        "MIGRATION_APPLIED_OUT_OF_ORDER",
        `Migration ${migration.id} is applied after an earlier unapplied migration.`
      );
    }
  }
}

function cleanRelease(value: string | undefined) {
  const release = value?.trim() || "manual";

  if (release.length > 100 || !/^[a-zA-Z0-9._/-]+$/.test(release)) {
    throw new MigrationError(
      "MIGRATION_RELEASE_INVALID",
      "Migration release must be 1-100 safe identifier characters."
    );
  }

  return release;
}

function createRunnerOwner(value: string | undefined) {
  if (value) return value;
  return `${hostname()}:${process.pid}:${randomUUID()}`;
}

export class MigrationRunner {
  private readonly db: Db;
  private readonly migrations: readonly MigrationDefinition[];
  private readonly readSource: MigrationSourceReader;
  private readonly release: string;
  private readonly owner: string;
  private readonly leaseTtlMs: number;
  private readonly now: () => Date;

  constructor(options: MigrationRunnerOptions) {
    this.db = options.db;
    this.migrations = validateMigrationRegistry(options.migrations);
    this.readSource =
      options.read_source ??
      createFilesystemMigrationSourceReader(
        options.source_root ?? process.cwd()
      );
    this.release = cleanRelease(options.release);
    this.owner = createRunnerOwner(options.owner);
    this.leaseTtlMs = options.lease_ttl_ms ?? 60_000;
    this.now = options.now ?? (() => new Date());
  }

  private migrationCollection(): Collection<MigrationRecord> {
    return this.db.collection<MigrationRecord>("schema_migrations");
  }

  private async getState() {
    const checksums = await calculateMigrationChecksums(
      this.migrations,
      this.readSource
    );
    const records = await this.migrationCollection()
      .find({})
      .sort({ _id: 1 })
      .toArray();

    assertStoredMigrationIntegrity({
      migrations: this.migrations,
      checksums,
      records,
    });

    return { checksums, records };
  }

  private getDestructiveOptions(
    options: MigrationRunOptions
  ): DestructiveMigrationOptions {
    return {
      backup: parseBackupConfirmation({
        reference: options.backup_reference,
        verified_at: options.backup_verified_at,
        now: this.now(),
      }),
      allow_index_replacement_gap: options.allow_index_replacement_gap === true,
      writes_quiesced: options.writes_quiesced === true,
    };
  }

  private assertBackupGate(
    migration: MigrationDefinition,
    destructive: DestructiveMigrationOptions
  ) {
    if (migration.behavior.destructive && !destructive.backup) {
      throw new MigrationError(
        "MIGRATION_BACKUP_CONFIRMATION_REQUIRED",
        `Migration ${migration.id} is destructive and requires a fresh verified backup reference.`
      );
    }
  }

  async run(options: MigrationRunOptions): Promise<MigrationRunReport> {
    const destructive = this.getDestructiveOptions(options);
    const initialState = await this.getState();

    if (options.mode === "dry-run") {
      return this.runDryRun(initialState, destructive);
    }

    const recordsById = new Map(
      initialState.records.map((record) => [record._id, record])
    );
    for (const migration of this.migrations) {
      if (recordsById.get(migration.id)?.status !== "applied") {
        this.assertBackupGate(migration, destructive);
      }
    }

    return this.runApply(destructive);
  }

  private async runDryRun(
    state: Awaited<ReturnType<MigrationRunner["getState"]>>,
    destructive: DestructiveMigrationOptions
  ): Promise<MigrationRunReport> {
    const recordsById = new Map(
      state.records.map((record) => [record._id, record])
    );
    const items: MigrationRunItem[] = [];

    for (const migration of this.migrations) {
      const checksum = state.checksums.get(migration.id)!;
      const record = recordsById.get(migration.id);

      if (record?.status === "applied") {
        items.push({
          id: migration.id,
          checksum,
          status: "skipped",
        });
        continue;
      }

      const context: MigrationContext = {
        db: this.db,
        mode: "dry-run",
        release: this.release,
        migration_id: migration.id,
        checksum,
        checkpoint: record?.checkpoint ?? null,
        destructive,
        now: this.now,
        assert_lease: async () => undefined,
        save_checkpoint: async () => {
          throw new MigrationError(
            "MIGRATION_DRY_RUN_CHECKPOINT_WRITE",
            "A dry-run migration attempted to persist a checkpoint."
          );
        },
      };

      const summary = await migration.dry_run(context);
      items.push({
        id: migration.id,
        checksum,
        status: "dry-run",
        summary,
      });
    }

    return {
      mode: "dry-run",
      release: this.release,
      migrations: items,
    };
  }

  private async runApply(
    destructive: DestructiveMigrationOptions
  ): Promise<MigrationRunReport> {
    const lease = await MongoMigrationLease.acquire({
      collection: this.db.collection("migration_leases"),
      owner: this.owner,
      ttl_ms: this.leaseTtlMs,
      now: this.now,
    });
    lease.startHeartbeat();

    try {
      const state = await this.getState();
      const recordsById = new Map(
        state.records.map((record) => [record._id, record])
      );
      const items: MigrationRunItem[] = [];

      for (const migration of this.migrations) {
        const checksum = state.checksums.get(migration.id)!;
        const existing = recordsById.get(migration.id);

        if (existing?.status === "applied") {
          items.push({ id: migration.id, checksum, status: "skipped" });
          continue;
        }

        this.assertBackupGate(migration, destructive);
        await lease.assertOwned();
        const startedAt = this.now();

        if (existing) {
          await this.migrationCollection().updateOne(
            { _id: migration.id, checksum },
            {
              $set: {
                description: migration.description,
                status: "running",
                release: this.release,
                runner_owner: this.owner,
                started_at: startedAt,
                updated_at: startedAt,
                finished_at: null,
                duration_ms: null,
                summary: null,
              },
              $inc: { attempts: 1 },
            }
          );
        } else {
          await this.migrationCollection().insertOne({
            _id: migration.id,
            checksum,
            description: migration.description,
            status: "running",
            release: this.release,
            attempts: 1,
            runner_owner: this.owner,
            checkpoint: null,
            summary: null,
            created_at: startedAt,
            started_at: startedAt,
            updated_at: startedAt,
            finished_at: null,
            duration_ms: null,
          });
        }

        const saveCheckpoint = async (checkpoint: Document) => {
          await lease.assertOwned();
          const result = await this.migrationCollection().updateOne(
            {
              _id: migration.id,
              checksum,
              status: "running",
              runner_owner: this.owner,
            },
            {
              $set: {
                checkpoint,
                updated_at: this.now(),
              },
            }
          );

          if (result.matchedCount !== 1) {
            throw new MigrationError(
              "MIGRATION_CHECKPOINT_WRITE_FAILED",
              `Migration ${migration.id} checkpoint could not be persisted.`
            );
          }
        };

        const context: MigrationContext = {
          db: this.db,
          mode: "apply",
          release: this.release,
          migration_id: migration.id,
          checksum,
          checkpoint: existing?.checkpoint ?? null,
          destructive,
          now: this.now,
          assert_lease: () => lease.assertOwned(),
          save_checkpoint: saveCheckpoint,
        };

        try {
          const summary = await migration.up(context);
          await lease.assertOwned();
          const finishedAt = this.now();
          const durationMs = Math.max(
            0,
            finishedAt.getTime() - startedAt.getTime()
          );
          const result = await this.migrationCollection().updateOne(
            {
              _id: migration.id,
              checksum,
              status: "running",
              runner_owner: this.owner,
            },
            {
              $set: {
                status: "applied",
                summary,
                runner_owner: null,
                updated_at: finishedAt,
                finished_at: finishedAt,
                duration_ms: durationMs,
              },
            }
          );

          if (result.matchedCount !== 1) {
            throw new MigrationError(
              "MIGRATION_APPLIED_RECORD_WRITE_FAILED",
              `Migration ${migration.id} completed but its applied record could not be finalized.`
            );
          }

          items.push({
            id: migration.id,
            checksum,
            status: "applied",
            summary,
          });
        } catch (error) {
          const failedAt = this.now();
          await this.migrationCollection().updateOne(
            {
              _id: migration.id,
              checksum,
              runner_owner: this.owner,
            },
            {
              $set: {
                status: "failed",
                summary: { failure: toSafeMigrationFailure(error) },
                runner_owner: null,
                updated_at: failedAt,
                finished_at: failedAt,
                duration_ms: Math.max(
                  0,
                  failedAt.getTime() - startedAt.getTime()
                ),
              },
            }
          );
          throw error;
        }
      }

      return {
        mode: "apply",
        release: this.release,
        migrations: items,
      };
    } finally {
      await lease.release();
    }
  }
}
