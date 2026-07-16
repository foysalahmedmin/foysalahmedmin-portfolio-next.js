import type { Db, Document, WithId } from "mongodb";
import { SeedError } from "./errors.ts";
import type { SeedActor } from "./types.ts";

type SeedLeaseDocument = {
  _id: "portfolio-seed";
  token: string;
  acquired_at: Date;
  expires_at: Date;
};

export const getExplicitSeedDatabaseName = (databaseUrl: string): string => {
  const schemeEnd = databaseUrl.indexOf("://");
  const scheme = schemeEnd >= 0 ? databaseUrl.slice(0, schemeEnd) : "";
  if (scheme !== "mongodb" && scheme !== "mongodb+srv") {
    throw new SeedError(
      "SEED_DATABASE_URL_INVALID",
      "DATABASE_URL must be a MongoDB URL with an explicit database name."
    );
  }
  const authorityAndPath = databaseUrl.slice(schemeEnd + 3);
  const pathStart = authorityAndPath.indexOf("/");
  const encodedName =
    pathStart >= 0
      ? authorityAndPath.slice(pathStart + 1).split("?", 1)[0]
      : "";
  let databaseName = "";
  try {
    databaseName = decodeURIComponent(encodedName).trim();
  } catch {
    databaseName = "";
  }
  if (
    !databaseName ||
    databaseName.includes("/") ||
    databaseName.includes("\0") ||
    ["admin", "config", "local"].includes(databaseName)
  ) {
    throw new SeedError(
      "SEED_DATABASE_URL_INVALID",
      "DATABASE_URL must name an explicit non-system MongoDB database."
    );
  }
  return databaseName;
};

export const resolveSeedActor = async (
  db: Db,
  actorEmail?: string
): Promise<SeedActor> => {
  const email = actorEmail?.trim().toLowerCase();
  const matches = await db
    .collection("users")
    .find({
      role: "super-admin",
      status: { $ne: "blocked" },
      is_verified: true,
      is_deleted: { $ne: true },
      ...(email ? { email } : {}),
    })
    .project({ _id: 1, role: 1 })
    .limit(2)
    .toArray();

  if (!matches.length) {
    throw new SeedError(
      "SEED_ADMIN_REQUIRED",
      "Run the locked super-admin bootstrap before seeding; no account was created or changed."
    );
  }
  if (!email && matches.length > 1) {
    throw new SeedError(
      "SEED_ADMIN_AMBIGUOUS",
      "Set SEED_ACTOR_EMAIL to one existing verified super-admin."
    );
  }
  const actor = matches[0] as WithId<Document>;
  return { _id: actor._id, role: "super-admin" };
};

export const initializeSeedControlPlane = async (db: Db): Promise<void> => {
  await Promise.all([
    db
      .collection("seed_records")
      .createIndex(
        { target_collection: 1, target_id: 1 },
        { unique: true, name: "seed_record_target_unique" }
      ),
    db
      .collection("seed_records")
      .createIndex(
        { manifest_key: 1, seed_key: 1 },
        { name: "seed_record_manifest_key" }
      ),
    db
      .collection("seed_runs")
      .createIndex(
        { manifest_key: 1, completed_at: -1 },
        { name: "seed_run_manifest_time" }
      ),
    db
      .collection("seed_media_intents")
      .createIndex(
        { media_key: 1 },
        { unique: true, name: "seed_media_intent_key_unique" }
      ),
  ]);
};

export const acquireSeedLease = async (
  db: Db,
  input: { token: string; now: Date; ttl_ms?: number }
): Promise<void> => {
  const collection = db.collection<SeedLeaseDocument>("seed_leases");
  const lease: SeedLeaseDocument = {
    _id: "portfolio-seed" as const,
    token: input.token,
    acquired_at: input.now,
    expires_at: new Date(input.now.getTime() + (input.ttl_ms ?? 10 * 60_000)),
  };
  try {
    await collection.insertOne(lease);
    return;
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const reclaimed = await collection.updateOne(
    { _id: lease._id, expires_at: { $lte: input.now } },
    { $set: lease }
  );
  if (reclaimed.modifiedCount !== 1) {
    throw new SeedError(
      "SEED_LOCKED",
      "Another seed operation currently owns the seed lease."
    );
  }
};

export const releaseSeedLease = async (
  db: Db,
  token: string
): Promise<void> => {
  await db
    .collection<SeedLeaseDocument>("seed_leases")
    .deleteOne({ _id: "portfolio-seed", token })
    .catch(() => undefined);
};
