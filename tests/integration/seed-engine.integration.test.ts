import {
  createFoundationSeedManifest,
  planSeedManifest,
  resetSeedManifest,
  resolveSeedActor,
  runSeedManifest,
  SeedError,
  seedRecordMetadataId,
  SEED_RESET_CONFIRMATION,
} from "@/lib/seed";
import type { SeedManifest, SeedTruthMarker } from "@/lib/seed/types";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "versioned seed engine against real MongoDB"
  : "versioned seed engine against real MongoDB (skipped: set TEST_MONGODB_URI)";

const TARGET_COLLECTIONS = [
  "seed_media_intents",
  "sites",
  "pages",
  "seed_records",
  "seed_manifests",
  "seed_runs",
  "seed_leases",
] as const;

const seedActorId = new ObjectId();
let client: MongoClient;
let db: Db;

const cleanSeedFixtures = async (): Promise<void> => {
  assertSafeTestDatabaseName(db.databaseName);
  await Promise.all(
    TARGET_COLLECTIONS.map((collection) =>
      db.collection(collection).deleteMany({})
    )
  );
  await db.collection("users").deleteOne({ _id: seedActorId });
};

const insertSeedActor = async (): Promise<void> => {
  const now = new Date();
  await db.collection("users").insertOne({
    _id: seedActorId,
    name: "Seed integration actor",
    email: "seed-integration-actor@example.test",
    password: "not-used-by-the-seed-engine",
    role: "super-admin",
    status: "in-progress",
    is_verified: true,
    is_deleted: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  });
};

const truthfulDraftMarker: SeedTruthMarker = {
  content_tier: "foundation",
  truth_status: "verified_by_code",
  publication_policy: "draft_only",
  synthetic: false,
};

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  beforeAll(async () => {
    const databaseUrl = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );
    client = new MongoClient(databaseUrl, {
      appName: "portfolio-seed-integration-test",
      serverSelectionTimeoutMS: 10_000,
    });
    await client.connect();
    db = client.db();
    assertSafeTestDatabaseName(db.databaseName);
  });

  beforeEach(async () => {
    await cleanSeedFixtures();
    await insertSeedActor();
  });

  afterAll(async () => {
    if (db) await cleanSeedFixtures();
    if (client) await client.close();
  });

  it("applies to empty application collections and reruns without duplicates", async () => {
    const actor = await resolveSeedActor(
      db,
      "seed-integration-actor@example.test"
    );
    const manifest = createFoundationSeedManifest(actor);
    const first = await runSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: false,
      force: false,
    });
    expect(first.counts).toMatchObject({
      create: manifest.records.length,
      conflict: 0,
    });
    expect(await db.collection("sites").countDocuments()).toBe(1);
    expect(await db.collection("pages").countDocuments()).toBe(7);
    expect(await db.collection("seed_media_intents").countDocuments()).toBe(6);
    expect(await db.collection("seed_records").countDocuments()).toBe(
      manifest.records.length
    );

    const second = await runSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: false,
      force: false,
    });
    expect(second.counts).toMatchObject({
      unchanged: manifest.records.length,
      conflict: 0,
    });
    expect(await db.collection("sites").countDocuments()).toBe(1);
    expect(await db.collection("pages").countDocuments()).toBe(7);
    expect(await db.collection("seed_media_intents").countDocuments()).toBe(6);
  });

  it("safely adopts an identical target from a partial prior run", async () => {
    const actor = await resolveSeedActor(
      db,
      "seed-integration-actor@example.test"
    );
    const manifest = createFoundationSeedManifest(actor);
    await runSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: false,
      force: false,
    });
    await db.collection<{ _id: string }>("seed_records").deleteOne({
      _id: seedRecordMetadataId(manifest.manifest_key, "pages", "page.home"),
    });

    const plan = await planSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: true,
      force: false,
    });
    expect(
      plan.records.find((record) => record.definition.seed_key === "page.home")
    ).toMatchObject({ action: "adopt" });
    await runSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: false,
      force: false,
    });
    expect(await db.collection("pages").countDocuments()).toBe(7);
    expect(await db.collection("seed_records").countDocuments()).toBe(
      manifest.records.length
    );
  });

  it("preserves an edited target on apply and reset unless force is explicit", async () => {
    const actor = await resolveSeedActor(
      db,
      "seed-integration-actor@example.test"
    );
    const manifest = createFoundationSeedManifest(actor);
    await runSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      dry_run: false,
      force: false,
    });
    await db
      .collection("sites")
      .updateOne(
        { site_key: "primary" },
        { $set: { "draft.footer.tagline": "Owner-edited draft" } }
      );

    await expect(
      runSeedManifest({
        client,
        db,
        manifest,
        environment: "test",
        dry_run: false,
        force: false,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<SeedError>>({ code: "SEED_CONFLICT" })
    );
    await expect(
      resetSeedManifest({
        client,
        db,
        manifest,
        environment: "test",
        force: false,
        reset_confirmation: SEED_RESET_CONFIRMATION,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_RESET_CONFLICT",
      })
    );
    expect(await db.collection("sites").countDocuments()).toBe(1);

    const reset = await resetSeedManifest({
      client,
      db,
      manifest,
      environment: "test",
      force: true,
      reset_confirmation: SEED_RESET_CONFIRMATION,
    });
    expect(reset).toEqual({ deleted: manifest.records.length, missing: 0 });
    expect(await db.collection("sites").countDocuments()).toBe(0);
    expect(await db.collection("pages").countDocuments()).toBe(0);
  });

  it("rolls every earlier write back when a later record fails validation", async () => {
    const manifest: SeedManifest = {
      manifest_key: "atomic-validation-fixture",
      seed_version: 1,
      mode: "foundation",
      description: "Integration-only transaction rollback fixture.",
      truth: truthfulDraftMarker,
      media: [],
      records: ["first", "second"].map((key) => ({
        stage: "media" as const,
        collection: "seed_media_intents" as const,
        seed_key: `atomic.${key}`,
        seed_version: 1,
        lookup: { media_key: `atomic.${key}` },
        payload: { media_key: `atomic.${key}`, status: "draft" },
        truth: truthfulDraftMarker,
        validate: () => {
          if (key === "second") {
            throw new SeedError(
              "SEED_MANIFEST_INVALID",
              "Expected integration validation failure."
            );
          }
        },
      })),
    };

    await expect(
      runSeedManifest({
        client,
        db,
        manifest,
        environment: "test",
        dry_run: false,
        force: false,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_MANIFEST_INVALID",
      })
    );
    expect(
      await db
        .collection("seed_media_intents")
        .countDocuments({ media_key: /^atomic\./ })
    ).toBe(0);
    expect(
      await db
        .collection("seed_records")
        .countDocuments({ manifest_key: manifest.manifest_key })
    ).toBe(0);
  });
});
