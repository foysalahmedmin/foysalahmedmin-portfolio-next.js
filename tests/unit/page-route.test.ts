import { PageDomainError } from "@/app/api/pages/page.policy";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readPublishedPage: vi.fn(),
  getAdminPage: vi.fn(),
  createPage: vi.fn(),
  updatePageDraft: vi.fn(),
  reorderPageDraft: vi.fn(),
  publishPage: vi.fn(),
  readDraftPreview: vi.fn(),
  auditPagePreviewCreated: vi.fn(),
}));

vi.mock("@/app/api/pages/page.service", () => mocks);
vi.mock("@/middleware/auth.middleware", () => ({
  auth:
    () =>
    async (
      request: NextRequest,
      handler: (request: NextRequest & { user: unknown }) => unknown
    ) =>
      handler(
        Object.assign(request, {
          user: {
            id: "507f1f77bcf86cd799439011",
            role: "admin",
            session_id: "550e8400-e29b-41d4-a716-446655440000",
          },
        })
      ),
}));

import { GET as getPublicPage } from "@/app/api/pages/[routeKey]/route";
import {
  GET as getAdminPageRoute,
  PATCH as patchAdminPage,
} from "@/app/api/pages/[routeKey]/admin/route";
import { GET as getPreviewPage } from "@/app/api/pages/[routeKey]/preview/route";

const context = (routeKey = "home") => ({
  params: Promise.resolve({ routeKey }),
});

const draft = {
  seo: { noindex: false },
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

describe("Page routes", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.readPublishedPage.mockResolvedValue({
      route_key: "home",
      route_path: "/",
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      published_revision: 3,
      published_at: "2026-07-15T00:00:00.000Z",
      seo: { noindex: false },
      sections: [],
    });
    mocks.getAdminPage.mockResolvedValue({
      id: "507f1f77bcf86cd799439099",
      route_key: "home",
      route_path: "/",
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      revision: 3,
      draft,
      published: null,
      updated_at: "2026-07-15T00:00:00.000Z",
    });
  });

  it("returns only cached published composition from the public endpoint", async () => {
    const response = await getPublicPage(
      new NextRequest("http://localhost:3000/api/pages/home"),
      context()
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(payload.data).not.toHaveProperty("draft");
    expect(payload.data).not.toHaveProperty("published_by");
  });

  it("rejects arbitrary route keys and public query projections", async () => {
    const routeResponse = await getPublicPage(
      new NextRequest("http://localhost:3000/api/pages/custom"),
      context("custom")
    );
    expect(routeResponse.status).toBe(422);
    const queryResponse = await getPublicPage(
      new NextRequest("http://localhost:3000/api/pages/home?fields=draft"),
      context()
    );
    expect(queryResponse.status).toBe(400);
    expect(mocks.readPublishedPage).not.toHaveBeenCalled();
  });

  it("keeps admin drafts private and no-store", async () => {
    const response = await getAdminPageRoute(
      new NextRequest("http://localhost:3000/api/pages/home/admin"),
      context()
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Authorization");
  });

  it("maps atomic revision conflicts without leaking internals", async () => {
    mocks.updatePageDraft.mockRejectedValue(
      new PageDomainError({
        status: 409,
        code: "PAGE_VERSION_CONFLICT",
        message: "The Page changed. Refresh it before saving again.",
        current_revision: 4,
      })
    );
    const response = await patchAdminPage(
      new NextRequest("http://localhost:3000/api/pages/home/admin", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ expected_revision: 3, draft }),
      }),
      context()
    );
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      code: "PAGE_VERSION_CONFLICT",
      current_revision: 4,
    });
    expect(payload).not.toHaveProperty("stack");
  });

  it("fails preview closed without a cookie and always sends noindex/no-referrer", async () => {
    const response = await getPreviewPage(
      new NextRequest("http://localhost:3000/api/pages/home/preview"),
      context()
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(mocks.readDraftPreview).not.toHaveBeenCalled();
  });
});
