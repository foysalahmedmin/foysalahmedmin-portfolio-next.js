import type AuditEventModel from "@/app/api/audit-events/audit-event.model";
import type FileModel from "@/app/api/files/file.model";
import type SiteCacheInvalidationModel from "@/app/api/site/site-cache-invalidation.model";
import type SiteModel from "@/app/api/site/site.model";
import type {
  createSite as createSiteFunction,
  publishSite as publishSiteFunction,
  readPublishedSiteUncached as readPublishedSiteUncachedFunction,
  updateSiteDraft as updateSiteDraftFunction,
} from "@/app/api/site/site.service";
import { ENV } from "@/config";
import mongoose from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "revisioned Site publishing against real transaction-capable MongoDB"
  : "revisioned Site publishing (skipped: set TEST_MONGODB_URI)";

if (!TEST_MONGODB_URI) {
  console.warn(
    "[integration] Skipping Site publishing coverage: set TEST_MONGODB_URI to an isolated replica-set test database."
  );
}

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  let Site: typeof SiteModel;
  let SiteCacheInvalidation: typeof SiteCacheInvalidationModel;
  let AuditEvent: typeof AuditEventModel;
  let File: typeof FileModel;
  let createSite: typeof createSiteFunction;
  let updateSiteDraft: typeof updateSiteDraftFunction;
  let publishSite: typeof publishSiteFunction;
  let readPublishedSiteUncached: typeof readPublishedSiteUncachedFunction;

  const actor = {
    id: "507f1f77bcf86cd799439011",
    role: "admin" as const,
    session_id: "550e8400-e29b-41d4-a716-446655440000",
  };
  const context = { actor, request_id: "site-integration-request" };

  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );
    ENV.database_url = databaseUri;
    process.env.DATABASE_URL = databaseUri;
    const connectDB = (await import("@/lib/db")).default;
    await connectDB();
    assertSafeTestDatabaseName(mongoose.connection.name);

    [
      { default: Site },
      { default: SiteCacheInvalidation },
      { default: AuditEvent },
      { default: File },
      { createSite, updateSiteDraft, publishSite, readPublishedSiteUncached },
    ] = await Promise.all([
      import("@/app/api/site/site.model"),
      import("@/app/api/site/site-cache-invalidation.model"),
      import("@/app/api/audit-events/audit-event.model"),
      import("@/app/api/files/file.model"),
      import("@/app/api/site/site.service"),
    ]);
    await Promise.all([
      Site.syncIndexes(),
      SiteCacheInvalidation.syncIndexes(),
      AuditEvent.syncIndexes(),
      File.syncIndexes(),
    ]);
  }, 60_000);

  beforeEach(async () => {
    assertSafeTestDatabaseName(mongoose.connection.name);
    await Promise.all([
      mongoose.connection.collection("sites").deleteMany({}),
      mongoose.connection.collection("site_cache_invalidations").deleteMany({}),
      mongoose.connection.collection("audit_events").deleteMany({}),
      mongoose.connection.collection("files").deleteMany({}),
    ]);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 0) return;
    assertSafeTestDatabaseName(mongoose.connection.name);
    await mongoose.disconnect();
  });

  it("isolates draft, publishes atomically, and preserves public state on failures", async () => {
    const created = await createSite(context);
    expect(created.draft).toMatchObject({
      positioning: {},
      brand: {},
      footer: {},
    });
    await expect(Site.findOne().lean()).resolves.toMatchObject({
      draft: {
        positioning: {},
        brand: {},
        footer: {},
      },
    });
    expect((await readPublishedSiteUncached()).content_source).toBe(
      "emergency"
    );

    const firstDraft = buildPublishableSiteDraft();
    const updated = await updateSiteDraft(
      { expected_revision: 1, draft: firstDraft },
      context
    );
    expect(updated.revision).toBe(2);
    expect((await readPublishedSiteUncached()).content_source).toBe(
      "emergency"
    );

    const publication = await publishSite({ expected_revision: 2 }, context);
    expect(publication.site.published?.revision).toBe(2);
    const publicRevisionTwo = await readPublishedSiteUncached();
    expect(publicRevisionTwo).toMatchObject({
      content_source: "published",
      published_revision: 2,
    });
    expect(publicRevisionTwo).not.toHaveProperty("draft");
    expect(publicRevisionTwo).not.toHaveProperty("published_by");

    await expect(
      updateSiteDraft(
        { expected_revision: 1, draft: buildPublishableSiteDraft() },
        context
      )
    ).rejects.toMatchObject({ status: 409, code: "SITE_VERSION_CONFLICT" });
    await expect(Site.findOne().lean()).resolves.toMatchObject({ revision: 2 });

    const privateFile = await File.create({
      filename: "private-profile.webp",
      originalname: "private-profile.webp",
      name: "Private profile visual",
      url: "",
      mimetype: "image/webp",
      size: 1024,
      author: actor.id,
      provider: "cloudinary",
      status: "active",
      lifecycle_state: "ready",
      purpose: "profile",
      access: "private",
      source: "uploaded",
      checksum: "ab".repeat(32),
      metadata_status: "complete",
      metadata_missing: [],
      metadata: { file_type: "image", width: 1200, height: 1200 },
      attribution: { license: "owned" },
    });
    const nextDraft = buildPublishableSiteDraft();
    nextDraft.brand.profile_file = privateFile._id.toString();
    await updateSiteDraft({ expected_revision: 2, draft: nextDraft }, context);

    await expect(
      publishSite({ expected_revision: 3 }, context)
    ).rejects.toMatchObject({
      status: 422,
      code: "SITE_PUBLISH_GRAPH_INVALID",
      sources: ["brand.profile_file"],
    });
    expect(await readPublishedSiteUncached()).toMatchObject({
      content_source: "published",
      published_revision: 2,
    });
    await expect(SiteCacheInvalidation.countDocuments()).resolves.toBe(1);
    await expect(AuditEvent.countDocuments()).resolves.toBe(4);
  });
});
