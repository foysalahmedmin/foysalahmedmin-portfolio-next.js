import { inspectContactIntakeFoundation } from "@/lib/db/migrations/202607150004-contact-intake-foundation";
import { inspectContactInboxOperations } from "@/lib/db/migrations/202607150011-contact-inbox-operations";
import { MongoClient, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertSafeTestDatabaseUrl } from "../helpers/test-database";

const databaseUrl = assertSafeTestDatabaseUrl(
  process.env.TEST_DATABASE_URL ?? "mongodb://127.0.0.1:27017/foysalahmedmin_test"
);

describe("contact migration inspection runs against a real MongoDB server", () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = new MongoClient(databaseUrl, { serverSelectionTimeoutMS: 5_000 });
    await client.connect();
    db = client.db();
    await db.collection("contacts").deleteMany({});
    await db.collection("contacts").insertOne({
      status: "new",
      delivery_status: "pending",
      revision: 1,
      status_changed_at: new Date(),
    });
  });

  afterAll(async () => {
    await db?.collection("contacts").deleteMany({});
    await client?.close();
  });

  it("counts legacy contact intake documents without a server error", async () => {
    const summary = await inspectContactIntakeFoundation(db);
    expect(summary.legacy_contacts).toBe(1);
  });

  it("counts legacy contact inbox documents without a server error", async () => {
    const summary = await inspectContactInboxOperations(db);
    expect(summary.legacy_contacts).toBe(1);
  });
});
