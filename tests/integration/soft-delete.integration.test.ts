import {
  applySoftDeletePlugin,
  setAggregateSoftDeleteScope,
  setSoftDeleteScope,
} from "@/lib/db/soft-delete";
import mongoose, {
  type Connection,
  type InferSchemaType,
  type Model,
  Schema,
} from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "soft-delete plugin against a real transaction-capable MongoDB"
  : "soft-delete plugin against a real transaction-capable MongoDB (skipped: set TEST_MONGODB_URI to an isolated replica-set test database)";

if (!TEST_MONGODB_URI) {
  console.warn(
    "[integration] Skipping real-Mongo soft-delete coverage: set TEST_MONGODB_URI to an isolated replica-set test database."
  );
}

const OWNER_MODEL_NAME = "SoftDeleteOwnerIntegrationFixture";
const ENTRY_MODEL_NAME = "SoftDeleteEntryIntegrationFixture";
const OWNER_COLLECTION = "soft_delete_integration_owners";
const ENTRY_COLLECTION = "soft_delete_integration_entries";

const ownerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    is_deleted: { type: Boolean, default: false, required: true },
    deleted_at: { type: Date, default: null },
  },
  { versionKey: false }
);

ownerSchema.index(
  { email: 1 },
  {
    name: "soft_delete_owner_active_email_unique",
    unique: true,
    partialFilterExpression: { is_deleted: false },
  }
);
applySoftDeletePlugin(ownerSchema);

const entrySchema = new Schema(
  {
    title: { type: String, required: true },
    owner: {
      type: Schema.Types.ObjectId,
      ref: OWNER_MODEL_NAME,
      required: true,
    },
    is_deleted: { type: Boolean, default: false, required: true },
    deleted_at: { type: Date, default: null },
  },
  { versionKey: false }
);

applySoftDeletePlugin(entrySchema);

type OwnerFixture = InferSchemaType<typeof ownerSchema>;
type EntryFixture = InferSchemaType<typeof entrySchema>;

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  let connection: Connection;
  let Owner: Model<OwnerFixture>;
  let Entry: Model<EntryFixture>;

  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );

    connection = await mongoose
      .createConnection(databaseUri, { serverSelectionTimeoutMS: 10_000 })
      .asPromise();
    assertSafeTestDatabaseName(connection.name);

    Owner = connection.model<OwnerFixture>(
      OWNER_MODEL_NAME,
      ownerSchema,
      OWNER_COLLECTION
    );
    Entry = connection.model<EntryFixture>(
      ENTRY_MODEL_NAME,
      entrySchema,
      ENTRY_COLLECTION
    );

    await Promise.all([Owner.syncIndexes(), Entry.syncIndexes()]);

    const hello = (await connection.db?.admin().command({ hello: 1 })) as
      | { logicalSessionTimeoutMinutes?: number; setName?: string }
      | undefined;

    expect(hello?.setName).toBeTruthy();
    expect(hello?.logicalSessionTimeoutMinutes).toBeTypeOf("number");

    const session = await connection.startSession();
    try {
      session.startTransaction();
      await Owner.create(
        [
          {
            name: "Transaction probe",
            email: "transaction-probe@example.test",
          },
        ],
        { session }
      );
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      setSoftDeleteScope(Entry.deleteMany({}), "with_deleted"),
      setSoftDeleteScope(Owner.deleteMany({}), "with_deleted"),
    ]);
  });

  afterAll(async () => {
    if (!connection) return;

    await Promise.all([
      setSoftDeleteScope(Entry.deleteMany({}), "with_deleted"),
      setSoftDeleteScope(Owner.deleteMany({}), "with_deleted"),
    ]);
    await connection.close();
  });

  it("enforces active, only-deleted, and with-deleted read scopes", async () => {
    await Owner.create([
      { name: "Active owner", email: "active@example.test" },
      {
        name: "Deleted owner",
        email: "deleted@example.test",
        is_deleted: true,
        deleted_at: new Date(),
      },
    ]);

    const active = await Owner.find().sort({ name: 1 }).lean();
    const onlyDeleted = await setSoftDeleteScope(
      Owner.find().sort({ name: 1 }).lean(),
      "only_deleted"
    );
    const withDeleted = await setSoftDeleteScope(
      Owner.find().sort({ name: 1 }).lean(),
      "with_deleted"
    );

    expect(active.map(({ name }) => name)).toEqual(["Active owner"]);
    expect(onlyDeleted.map(({ name }) => name)).toEqual(["Deleted owner"]);
    expect(withDeleted.map(({ name }) => name)).toEqual([
      "Active owner",
      "Deleted owner",
    ]);
  });

  it("restores one or many deleted records and permanently deletes only trash", async () => {
    const [single, firstBulk, secondBulk, active] = await Owner.create([
      {
        name: "Single restore",
        email: "single-restore@example.test",
        is_deleted: true,
        deleted_at: new Date(),
      },
      {
        name: "First bulk restore",
        email: "first-bulk-restore@example.test",
        is_deleted: true,
        deleted_at: new Date(),
      },
      {
        name: "Second bulk restore",
        email: "second-bulk-restore@example.test",
        is_deleted: true,
        deleted_at: new Date(),
      },
      { name: "Active", email: "keep-active@example.test" },
    ]);

    const restored = await setSoftDeleteScope(
      Owner.findByIdAndUpdate(
        single._id,
        { $set: { is_deleted: false }, $unset: { deleted_at: 1 } },
        { new: true }
      ),
      "only_deleted"
    );
    const bulkRestored = await setSoftDeleteScope(
      Owner.updateMany(
        { _id: { $in: [firstBulk._id, secondBulk._id] } },
        { $set: { is_deleted: false }, $unset: { deleted_at: 1 } }
      ),
      "only_deleted"
    );

    expect(restored?.is_deleted).toBe(false);
    expect(restored?.deleted_at).toBeNull();
    expect(bulkRestored.modifiedCount).toBe(2);
    await expect(Owner.countDocuments()).resolves.toBe(4);

    await setSoftDeleteScope(
      Owner.findByIdAndUpdate(single._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    const deletedTrash = await setSoftDeleteScope(
      Owner.deleteOne({ _id: single._id }),
      "only_deleted"
    );
    const protectedActive = await setSoftDeleteScope(
      Owner.deleteOne({ _id: active._id }),
      "only_deleted"
    );

    expect(deletedTrash.deletedCount).toBe(1);
    expect(protectedActive.deletedCount).toBe(0);
    await expect(
      setSoftDeleteScope(Owner.findById(single._id), "with_deleted")
    ).resolves.toBeNull();
    await expect(Owner.findById(active._id)).resolves.not.toBeNull();
  });

  it("applies the same visibility scopes to aggregate pipelines", async () => {
    await Owner.create([
      { name: "Active aggregate", email: "aggregate-active@example.test" },
      {
        name: "Deleted aggregate",
        email: "aggregate-deleted@example.test",
        is_deleted: true,
        deleted_at: new Date(),
      },
    ]);

    const active = await Owner.aggregate<{ name: string }>([
      { $sort: { name: 1 } },
      { $project: { _id: 0, name: 1 } },
    ]);
    const onlyDeleted = await setAggregateSoftDeleteScope(
      Owner.aggregate<{ name: string }>([
        { $sort: { name: 1 } },
        { $project: { _id: 0, name: 1 } },
      ]),
      "only_deleted"
    );
    const withDeleted = await setAggregateSoftDeleteScope(
      Owner.aggregate<{ name: string }>([
        { $sort: { name: 1 } },
        { $project: { _id: 0, name: 1 } },
      ]),
      "with_deleted"
    );

    expect(active.map(({ name }) => name)).toEqual(["Active aggregate"]);
    expect(onlyDeleted.map(({ name }) => name)).toEqual(["Deleted aggregate"]);
    expect(withDeleted.map(({ name }) => name)).toEqual([
      "Active aggregate",
      "Deleted aggregate",
    ]);
  });

  it("hides a deleted referenced document during populate", async () => {
    const owner = await Owner.create({
      name: "Populated owner",
      email: "populate@example.test",
    });
    const entry = await Entry.create({
      title: "Visible entry",
      owner: owner._id,
    });

    await Owner.updateOne(
      { _id: owner._id },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    const populated = await Entry.findById(entry._id).populate("owner");

    expect(populated).not.toBeNull();
    expect(populated?.get("owner")).toBeNull();
  });

  it("keeps a deleted record in trash when restore collides with an active unique value", async () => {
    const deletedOwner = await Owner.create({
      name: "Original owner",
      email: "restore-collision@example.test",
      is_deleted: true,
      deleted_at: new Date(),
    });
    await Owner.create({
      name: "Replacement owner",
      email: "restore-collision@example.test",
    });

    const restore = setSoftDeleteScope(
      Owner.findByIdAndUpdate(
        deletedOwner._id,
        { $set: { is_deleted: false }, $unset: { deleted_at: 1 } },
        { new: true, runValidators: true }
      ),
      "only_deleted"
    );

    await expect(restore).rejects.toMatchObject({ code: 11_000 });

    const stillDeleted = await setSoftDeleteScope(
      Owner.findById(deletedOwner._id),
      "only_deleted"
    );
    await expect(Owner.countDocuments()).resolves.toBe(1);
    expect(stillDeleted?.is_deleted).toBe(true);
    expect(stillDeleted?.deleted_at).toBeInstanceOf(Date);
  });
});
