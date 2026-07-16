import "dotenv/config";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "node:url";
import {
  assertSeedOperationAllowed,
  createDemoSeedManifest,
  createFoundationSeedManifest,
  getExplicitSeedDatabaseName,
  planSeedManifest,
  resetSeedManifest,
  resolveSeedActor,
  resolveSeedEnvironment,
  runSeedManifest,
  SeedError,
} from "../src/lib/seed/index.ts";
import { createSeedMediaGateway } from "./seed-media.ts";

type CliOptions = {
  operation: "apply" | "dry_run" | "reset";
  demo: boolean;
  force: boolean;
};

const parseArguments = (args: readonly string[]): CliOptions => {
  const allowed = new Set([
    "--apply",
    "--dry-run",
    "--reset",
    "--demo",
    "--force",
  ]);
  const unknown = args.filter((argument) => !allowed.has(argument));
  const operations = ["--apply", "--dry-run", "--reset"].filter((argument) =>
    args.includes(argument)
  );
  if (unknown.length || operations.length !== 1) {
    throw new SeedError(
      "SEED_ARGUMENT_INVALID",
      "Choose exactly one seed operation: --apply, --dry-run, or --reset."
    );
  }
  return {
    operation:
      operations[0] === "--dry-run"
        ? "dry_run"
        : operations[0] === "--reset"
          ? "reset"
          : "apply",
    demo: args.includes("--demo"),
    force: args.includes("--force"),
  };
};

const requiredDatabaseUrl = (): string => {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new SeedError(
      "SEED_DATABASE_URL_INVALID",
      "DATABASE_URL is required for seed operations."
    );
  }
  return value;
};

const printPlan = (
  plan: Awaited<ReturnType<typeof planSeedManifest>>
): void => {
  process.stdout.write(
    `${JSON.stringify(
      {
        manifest_key: plan.manifest_key,
        seed_version: plan.seed_version,
        checksum: plan.checksum,
        counts: plan.counts,
        media: plan.media.map((item) => ({
          media_key: item.media_key,
          action: item.action,
        })),
        records: plan.records.map((record) => ({
          stage: record.definition.stage,
          seed_key: record.definition.seed_key,
          action: record.action,
          reason: record.reason,
          changed_fields: record.changed_fields,
        })),
      },
      null,
      2
    )}\n`
  );
};

const main = async (): Promise<void> => {
  const cli = parseArguments(process.argv.slice(2));
  const environment = resolveSeedEnvironment(
    process.env.NODE_ENV,
    process.env.SEED_ENVIRONMENT
  );
  const mode = cli.demo ? "demo" : "foundation";
  assertSeedOperationAllowed({
    environment,
    mode,
    operation: cli.operation,
    force: cli.force,
    production_confirmation: process.env.SEED_PRODUCTION_CONFIRM,
    reset_confirmation: process.env.SEED_RESET_CONFIRM,
  });

  const databaseUrl = requiredDatabaseUrl();
  const databaseName = getExplicitSeedDatabaseName(databaseUrl);
  const client = new MongoClient(databaseUrl, {
    appName: "foysalahmedmin-safe-seed",
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  try {
    const db = client.db(databaseName);
    const actor = await resolveSeedActor(db, process.env.SEED_ACTOR_EMAIL);
    const manifest = cli.demo
      ? createDemoSeedManifest()
      : createFoundationSeedManifest(actor);
    if (cli.operation === "reset") {
      const result = await resetSeedManifest({
        client,
        db,
        manifest,
        environment,
        force: cli.force,
        reset_confirmation: process.env.SEED_RESET_CONFIRM,
      });
      process.stdout.write(
        `${JSON.stringify({
          manifest_key: manifest.manifest_key,
          operation: "reset",
          ...result,
        })}\n`
      );
      return;
    }
    const mediaGateway = await createSeedMediaGateway({
      actor,
      configured_asset_root: process.env.SEED_MEDIA_ASSET_ROOT,
      db,
      manifest,
      repository_root: fileURLToPath(new URL("..", import.meta.url)),
    });
    const options = {
      client,
      db,
      manifest,
      environment,
      dry_run: cli.operation === "dry_run",
      force: cli.force,
      production_confirmation: process.env.SEED_PRODUCTION_CONFIRM,
      ...(mediaGateway ? { media_gateway: mediaGateway } : {}),
    } as const;
    const plan =
      cli.operation === "dry_run"
        ? await planSeedManifest(options)
        : await runSeedManifest(options);
    printPlan(plan);
    if (plan.counts.conflict) process.exitCode = 2;
  } finally {
    await client.close();
  }
};

try {
  await main();
} catch (error) {
  const safe =
    error instanceof SeedError
      ? { code: error.code, message: error.message, details: error.details }
      : {
          code: "SEED_FAILED",
          message:
            "Seed operation failed without committing a partial database state.",
        };
  process.stderr.write(`${JSON.stringify(safe)}\n`);
  process.exitCode = 1;
}
