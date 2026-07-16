import type { TSite, TSitePublishedSnapshot } from "@/app/api/site/site.type";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  session: {
    withTransaction: vi.fn(),
    endSession: vi.fn(),
  },
  connectDB: vi.fn(),
  appendAuditEvent: vi.fn(),
  invalidatePublishedSiteCache: vi.fn(),
  siteRepository: {
    createSingleton: vi.fn(),
    findAdmin: vi.fn(),
    findRevision: vi.fn(),
    findPublished: vi.fn(),
    updateDraftConditional: vi.fn(),
    publishConditional: vi.fn(),
    createCacheInvalidationIntent: vi.fn(),
    markCacheInvalidationDelivered: vi.fn(),
    markCacheInvalidationFailed: vi.fn(),
    findPendingCacheInvalidations: vi.fn(),
  },
  fileRepository: {
    findAttachableByIds: vi.fn(),
    attachReference: vi.fn(),
    detachReferences: vi.fn(),
    findManyByIds: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/audit-events/audit-event.service", () => ({
  appendAuditEvent: mocks.appendAuditEvent,
}));
vi.mock("@/app/api/files/file.repository", () => mocks.fileRepository);
vi.mock("@/app/api/site/site.repository", () => mocks.siteRepository);
vi.mock("@/app/api/site/site.cache", () => ({
  invalidatePublishedSiteCache: mocks.invalidatePublishedSiteCache,
}));

import {
  publishSite,
  readPublishedSiteUncached,
  updateSiteDraft,
} from "@/app/api/site/site.service";

const actor = {
  id: "507f1f77bcf86cd799439011",
  role: "admin" as const,
  session_id: "550e8400-e29b-41d4-a716-446655440000",
};

const objectId = {
  toString: () => "507f1f77bcf86cd799439021",
};

const siteRecord = (input: {
  revision: number;
  draft?: ReturnType<typeof buildPublishableSiteDraft>;
  published?: TSitePublishedSnapshot | null;
}): TSite => ({
  _id: objectId as never,
  site_key: "primary",
  schema_version: 1,
  contract_version: 1,
  revision: input.revision,
  draft: input.draft ?? buildPublishableSiteDraft(),
  published: input.published ?? null,
  created_by: actor.id,
  updated_by: actor.id,
  created_at: new Date("2026-07-15T00:00:00.000Z"),
  updated_at: new Date("2026-07-15T00:00:00.000Z"),
});

const context = { actor, request_id: "request-site-test" };

describe("revisioned Site service", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.session.withTransaction.mockReset();
    mocks.session.withTransaction.mockImplementation(
      async (operation: () => Promise<void>) => {
        mocks.events.push("transaction:start");
        await operation();
        mocks.events.push("transaction:committed");
      }
    );
    mocks.session.endSession.mockReset();
    mocks.connectDB.mockReset();
    mocks.connectDB.mockResolvedValue({
      startSession: async () => mocks.session,
    });
    mocks.appendAuditEvent.mockReset();
    mocks.appendAuditEvent.mockImplementation(async () => {
      mocks.events.push("audit");
      return {};
    });
    mocks.invalidatePublishedSiteCache.mockReset();
    mocks.invalidatePublishedSiteCache.mockImplementation(async () => {
      mocks.events.push("cache:invalidate");
    });
    Object.values(mocks.siteRepository).forEach((mock) => mock.mockReset());
    Object.values(mocks.fileRepository).forEach((mock) => mock.mockReset());
    mocks.fileRepository.findAttachableByIds.mockResolvedValue([]);
    mocks.fileRepository.attachReference.mockResolvedValue(true);
    mocks.fileRepository.detachReferences.mockResolvedValue(undefined);
    mocks.fileRepository.findManyByIds.mockResolvedValue([]);
    mocks.siteRepository.findRevision.mockResolvedValue(2);
    mocks.siteRepository.createCacheInvalidationIntent.mockImplementation(
      async () => {
        mocks.events.push("cache:intent");
      }
    );
    mocks.siteRepository.markCacheInvalidationDelivered.mockImplementation(
      async () => {
        mocks.events.push("cache:delivered");
      }
    );
    mocks.siteRepository.markCacheInvalidationFailed.mockResolvedValue(
      undefined
    );
  });

  it("uses expected revision in the atomic draft update and audits in-transaction", async () => {
    const current = siteRecord({ revision: 1 });
    const nextDraft = buildPublishableSiteDraft();
    nextDraft.footer.tagline = "Updated test-only tagline";
    const updated = siteRecord({ revision: 2, draft: nextDraft });
    mocks.siteRepository.findAdmin.mockResolvedValue(current);
    mocks.siteRepository.updateDraftConditional.mockResolvedValue(updated);

    const result = await updateSiteDraft(
      { expected_revision: 1, draft: nextDraft },
      context
    );

    expect(result.revision).toBe(2);
    expect(mocks.siteRepository.updateDraftConditional).toHaveBeenCalledWith(
      expect.objectContaining({ expected_revision: 1, draft: nextDraft })
    );
    expect(mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_code: "site_draft_updated",
        target: expect.objectContaining({ revision: 2 }),
      }),
      expect.objectContaining({ session: mocks.session })
    );
  });

  it("returns a stable 409 without mutating when an editor is stale", async () => {
    mocks.siteRepository.findAdmin.mockResolvedValue(
      siteRecord({ revision: 2 })
    );

    await expect(
      updateSiteDraft(
        { expected_revision: 1, draft: buildPublishableSiteDraft() },
        context
      )
    ).rejects.toMatchObject({
      status: 409,
      code: "SITE_VERSION_CONFLICT",
      current_revision: 2,
    });
    expect(mocks.siteRepository.updateDraftConditional).not.toHaveBeenCalled();
    expect(mocks.appendAuditEvent).not.toHaveBeenCalled();
  });

  it("commits snapshot, references, audit, and intent before invalidating", async () => {
    const current = siteRecord({ revision: 2 });
    mocks.siteRepository.findAdmin.mockResolvedValue(current);
    mocks.siteRepository.publishConditional.mockImplementation(
      async (input) => {
        mocks.events.push("snapshot:published");
        return siteRecord({ revision: 2, published: input.published });
      }
    );

    const result = await publishSite({ expected_revision: 2 }, context);

    expect(result).toMatchObject({ cache_invalidated: true });
    expect(mocks.events).toEqual([
      "transaction:start",
      "snapshot:published",
      "cache:intent",
      "audit",
      "transaction:committed",
      "cache:invalidate",
      "cache:delivered",
    ]);
    expect(mocks.siteRepository.publishConditional).toHaveBeenCalledWith(
      expect.objectContaining({ expected_revision: 2 })
    );
  });

  it("keeps a committed publication valid when framework invalidation fails", async () => {
    const current = siteRecord({ revision: 2 });
    mocks.siteRepository.findAdmin.mockResolvedValue(current);
    mocks.siteRepository.publishConditional.mockImplementation(async (input) =>
      siteRecord({ revision: 2, published: input.published })
    );
    mocks.invalidatePublishedSiteCache.mockRejectedValueOnce(
      new Error("framework unavailable")
    );

    const result = await publishSite({ expected_revision: 2 }, context);

    expect(result.cache_invalidated).toBe(false);
    expect(result.site.published?.revision).toBe(2);
    expect(
      mocks.siteRepository.markCacheInvalidationFailed
    ).toHaveBeenCalledWith(objectId.toString(), 2);
  });

  it("blocks private, incomplete, missing, or purpose-incompatible Files", async () => {
    const draft = buildPublishableSiteDraft();
    draft.pillars[0]!.visual_file = "507f1f77bcf86cd799439099";
    draft.pillars[0]!.visual_alt_text = "Abstract frontend systems visual";
    mocks.siteRepository.findAdmin.mockResolvedValue(
      siteRecord({ revision: 2, draft })
    );
    mocks.fileRepository.findAttachableByIds.mockResolvedValue([]);

    await expect(
      publishSite({ expected_revision: 2 }, context)
    ).rejects.toMatchObject({
      status: 422,
      code: "SITE_PUBLISH_GRAPH_INVALID",
      sources: ["pillars.frontend.visual_file"],
    });
    expect(mocks.siteRepository.publishConditional).not.toHaveBeenCalled();
    expect(mocks.invalidatePublishedSiteCache).not.toHaveBeenCalled();
  });

  it("reads only the last published snapshot and never leaks draft/admin state", async () => {
    const publishedDraft = buildPublishableSiteDraft();
    publishedDraft.positioning.compact = "Published compact copy";
    publishedDraft.contact.availability = "available";
    publishedDraft.contact.availability_label = "Available privately";
    publishedDraft.metrics = [
      {
        key: "verified-metric",
        label: "Verified metric",
        value: "1",
        verification: "verified",
        enabled: true,
      },
    ];
    const currentDraft = buildPublishableSiteDraft();
    currentDraft.positioning.compact = "Unpublished draft copy";
    const published: TSitePublishedSnapshot = {
      ...publishedDraft,
      revision: 4,
      published_at: new Date("2026-07-15T02:00:00.000Z"),
      published_by: actor.id,
    };
    mocks.siteRepository.findPublished.mockResolvedValue(
      siteRecord({ revision: 5, draft: currentDraft, published })
    );

    const result = await readPublishedSiteUncached();
    const serialized = JSON.stringify(result);

    expect(result.content_source).toBe("published");
    expect(result.published_revision).toBe(4);
    expect(result.positioning.compact).toBe("Published compact copy");
    expect(result.contact.availability).toBe("unknown");
    expect(result.contact).not.toHaveProperty("availability_label");
    expect(result.metrics).toEqual([]);
    expect(serialized).not.toContain("Unpublished draft copy");
    expect(result).not.toHaveProperty("draft");
    expect(result).not.toHaveProperty("published_by");
    expect(serialized).not.toContain("verification");
  });
});
