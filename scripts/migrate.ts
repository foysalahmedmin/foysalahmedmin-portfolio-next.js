import "dotenv/config";
import { MongoClient } from "mongodb";
import { MIGRATION_REGISTRY } from "../src/lib/db/migrations/registry.ts";
import { MigrationRunner } from "../src/lib/db/migrations/runner.ts";
import { getExplicitMigrationDatabaseName } from "../src/lib/db/migrations/connection.ts";
import {
  MigrationError,
  toSafeMigrationFailure,
} from "../src/lib/db/migrations/errors.ts";

function parseMode(args: readonly string[]) {
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");

  if (apply === dryRun) {
    throw new MigrationError(
      "MIGRATION_MODE_REQUIRED",
      "Choose exactly one migration mode: --dry-run or --apply."
    );
  }

  const allowed = new Set([
    "--apply",
    "--dry-run",
    "--allow-index-replacement-gap",
  ]);
  const unknown = args.filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) {
    throw new MigrationError(
      "MIGRATION_ARGUMENT_INVALID",
      "The migration command received an unsupported argument."
    );
  }

  return apply ? ("apply" as const) : ("dry-run" as const);
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new MigrationError(
      "MIGRATION_DATABASE_URL_REQUIRED",
      "DATABASE_URL is required for the explicit migration command."
    );
  }

  const databaseName = getExplicitMigrationDatabaseName(databaseUrl);
  const client = new MongoClient(databaseUrl, {
    appName: "foysalahmedmin-schema-migrations",
  });

  try {
    await client.connect();
    const runner = new MigrationRunner({
      db: client.db(databaseName),
      migrations: MIGRATION_REGISTRY,
      source_root: process.cwd(),
      release: process.env.MIGRATION_RELEASE,
      lease_ttl_ms: process.env.MIGRATION_LEASE_TTL_MS
        ? Number(process.env.MIGRATION_LEASE_TTL_MS)
        : undefined,
    });
    const report = await runner.run({
      mode,
      backup_reference: process.env.MIGRATION_BACKUP_REFERENCE,
      backup_verified_at: process.env.MIGRATION_BACKUP_VERIFIED_AT,
      allow_index_replacement_gap: process.argv.includes(
        "--allow-index-replacement-gap"
      ),
      writes_quiesced: process.env.MIGRATION_WRITES_QUIESCED === "true",
    });

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error(JSON.stringify(toSafeMigrationFailure(error), null, 2));
  process.exitCode = 1;
});
