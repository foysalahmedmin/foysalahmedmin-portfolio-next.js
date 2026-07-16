import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAdminPage: vi.fn(),
  findPageRevision: vi.fn(),
  findPublishedPage: vi.fn(),
  createPage: vi.fn(),
  updateDraftConditional: vi.fn(),
  publishConditional: vi.fn(),
  createCacheInvalidationIntent: vi.fn(),
  markCacheInvalidationDelivered: vi.fn(),
  markCacheInvalidationFailed: vi.fn(),
  findPendingCacheInvalidations: vi.fn(),
  validatePageGraph: vi.fn(),
  appendAuditEvent: vi.fn(),
  invalidatePublishedPageCache: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn(async () => ({
    startSession: vi.fn(async () => ({
      withTransaction: async (callback: () => Promise<void>) => callback(),
      endSession: mocks.endSession,
    })),
  })),
}));
vi.mock("@/app/api/pages/page.repository", () => ({
  findAdminPage: mocks.findAdminPage,
  findPageRevision: mocks.findPageRevision,
  findPublishedPage: mocks.findPublishedPage,
  createPage: mocks.createPage,
  updateDraftConditional: mocks.updateDraftConditional,
  publishConditional: mocks.publishConditional,
  createCacheInvalidationIntent: mocks.createCacheInvalidationIntent,
  markCacheInvalidationDelivered: mocks.markCacheInvalidationDelivered,
  markCacheInvalidationFailed: mocks.markCacheInvalidationFailed,
  findPendingCacheInvalidations: mocks.findPendingCacheInvalidations,
}));
vi.mock("@/app/api/pages/page.graph", () => ({
  validatePageGraph: mocks.validatePageGraph,
}));
vi.mock("@/app/api/pages/page.cache", () => ({
  PAGE_CACHE_TAG: "portfolio:v1:pages",
  pageCacheTag: (route: string) => `portfolio:v1:pages:${route}`,
  invalidatePublishedPageCache: mocks.invalidatePublishedPageCache,
}));
vi.mock("@/app/api/audit-events/audit-event.service", () => ({
  appendAuditEvent: mocks.appendAuditEvent,
}));

import {
  publishPage,
  readPublishedPageUncached,
} from "@/app/api/pages/page.service";

const actor = {
  actor: {
    id: "507f1f77bcf86cd799439011",
    role: "admin" as const,
    session_id: "550e8400-e29b-41d4-a716-446655440000",
  },
  request_id: "550e8400-e29b-41d4-a716-446655440001",
};

const draft = {
  seo: { title: "Unpublished title", noindex: true },
  sections: [
    {
      key: "hero",
      kind: "site-hero",
      visible: true,
      layout: "default",
      source: { mode: "system" },
    },
  ],
};

const page = (revision = 3) => ({
  _id: "507f1f77bcf86cd799439099",
  route_key: "home" as const,
  locale: "en" as const,
  schema_version: 1 as const,
  contract_version: 1 as const,
  revision,
  draft,
  published: {
    seo: { title: "Published title", noindex: false },
    sections: draft.sections,
    revision: 2,
    published_at: new Date("2026-07-15T00:00:00.000Z"),
    published_by: "507f1f77bcf86cd799439012",
  },
  created_by: "507f1f77bcf86cd799439011",
  updated_by: "507f1f77bcf86cd799439011",
  created_at: new Date("2026-07-14T00:00:00.000Z"),
  updated_at: new Date("2026-07-15T00:00:00.000Z"),
});

describe("Page service revisions and isolation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.validatePageGraph.mockResolvedValue({
      references_by_section: new Map(),
      inspected_records: 0,
    });
    mocks.invalidatePublishedPageCache.mockResolvedValue(undefined);
    mocks.markCacheInvalidationDelivered.mockResolvedValue(undefined);
    mocks.createCacheInvalidationIntent.mockResolvedValue(undefined);
    mocks.appendAuditEvent.mockResolvedValue(undefined);
    mocks.findPageRevision.mockResolvedValue(3);
  });

  it("reads only the published snapshot and never exposes draft metadata", async () => {
    mocks.findPublishedPage.mockResolvedValue(page());
    const result = await readPublishedPageUncached("home");
    expect(result.seo).toEqual({ title: "Published title", noindex: false });
    expect(result.published_revision).toBe(2);
    expect(JSON.stringify(result)).not.toContain("Unpublished title");
    expect(mocks.validatePageGraph).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "publish", route_key: "home" })
    );
  });

  it("publishes the exact current revision with graph, audit and durable intent", async () => {
    const current = page(3);
    mocks.findAdminPage.mockResolvedValue(current);
    mocks.publishConditional.mockImplementation(async (input) => ({
      ...current,
      published: input.published,
    }));
    const result = await publishPage("home", { expected_revision: 3 }, actor);
    expect(mocks.publishConditional).toHaveBeenCalledWith(
      expect.objectContaining({ expected_revision: 3, route_key: "home" })
    );
    expect(mocks.createCacheInvalidationIntent).toHaveBeenCalledOnce();
    expect(mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "page.published" }),
      expect.any(Object)
    );
    expect(result.cache_invalidated).toBe(true);
  });

  it("fails stale publication before graph traversal or mutation", async () => {
    mocks.findAdminPage.mockResolvedValue(page(4));
    mocks.findPageRevision.mockResolvedValue(4);
    await expect(
      publishPage("home", { expected_revision: 3 }, actor)
    ).rejects.toMatchObject({
      code: "PAGE_VERSION_CONFLICT",
      current_revision: 4,
    });
    expect(mocks.validatePageGraph).not.toHaveBeenCalled();
    expect(mocks.publishConditional).not.toHaveBeenCalled();
  });
});
