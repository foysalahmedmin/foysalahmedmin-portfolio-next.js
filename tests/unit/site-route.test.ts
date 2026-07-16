import {
  createEmergencyPublicSite,
  SiteDomainError,
} from "@/app/api/site/site.policy";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "admin" | "editor" | "super-admin",
  readPublishedSite: vi.fn(),
  getAdminSite: vi.fn(),
  createSite: vi.fn(),
  updateSiteDraft: vi.fn(),
  publishSite: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/site/published-site", () => ({
  readPublishedSite: mocks.readPublishedSite,
}));
vi.mock("@/app/api/site/site.service", () => ({
  getAdminSite: mocks.getAdminSite,
  createSite: mocks.createSite,
  updateSiteDraft: mocks.updateSiteDraft,
  publishSite: mocks.publishSite,
}));
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
            _id: "507f1f77bcf86cd799439011",
            role: mocks.role,
            session_id: "550e8400-e29b-41d4-a716-446655440000",
          },
        })
      ),
}));

import { GET as getPublicSite } from "@/app/api/site/route";
import {
  GET as getAdminSite,
  PATCH as patchAdminSite,
} from "@/app/api/site/admin/route";
import { POST as publishAdminSite } from "@/app/api/site/admin/publish/route";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";

describe("Site routes", () => {
  beforeEach(() => {
    mocks.role = "admin";
    mocks.readPublishedSite.mockReset();
    mocks.readPublishedSite.mockResolvedValue(createEmergencyPublicSite());
    mocks.getAdminSite.mockReset();
    mocks.getAdminSite.mockResolvedValue({
      site_key: "primary",
      schema_version: 1,
      contract_version: 1,
      revision: 1,
      draft: buildPublishableSiteDraft(),
      published: null,
      updated_at: "2026-07-15T00:00:00.000Z",
    });
    mocks.createSite.mockReset();
    mocks.updateSiteDraft.mockReset();
    mocks.publishSite.mockReset();
  });

  it("returns a safe cached public envelope and bounded request id", async () => {
    const response = await getPublicSite(
      new NextRequest("http://localhost:3000/api/site")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(response.headers.get("cache-control")).toContain(
      "stale-while-revalidate=300"
    );
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.data.content_source).toBe("emergency");
    expect(payload.data).not.toHaveProperty("draft");
  });

  it("applies the one-hour response ceiling only to a real publication", async () => {
    mocks.readPublishedSite.mockResolvedValue({
      ...createEmergencyPublicSite(),
      content_source: "published",
      published_revision: 3,
      published_at: "2026-07-15T00:00:00.000Z",
    });

    const response = await getPublicSite(
      new NextRequest("http://localhost:3000/api/site")
    );

    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(response.headers.get("cache-control")).toContain(
      "stale-while-revalidate=86400"
    );
  });

  it("rejects public query projections before reading Site data", async () => {
    const response = await getPublicSite(
      new NextRequest("http://localhost:3000/api/site?fields=draft")
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("SITE_QUERY_INVALID");
    expect(mocks.readPublishedSite).not.toHaveBeenCalled();
  });

  it("keeps authenticated draft reads private and no-store", async () => {
    const response = await getAdminSite(
      new NextRequest("http://localhost:3000/api/site/admin")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Authorization");
    expect(mocks.getAdminSite).toHaveBeenCalledOnce();
  });

  it("maps stale revision errors to a redacted 409 response", async () => {
    mocks.updateSiteDraft.mockRejectedValue(
      new SiteDomainError({
        status: 409,
        code: "SITE_VERSION_CONFLICT",
        message: "The Site changed. Refresh it before saving again.",
        current_revision: 7,
      })
    );
    const response = await patchAdminSite(
      new NextRequest("http://localhost:3000/api/site/admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expected_revision: 6,
          draft: buildPublishableSiteDraft(),
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      code: "SITE_VERSION_CONFLICT",
      current_revision: 7,
    });
    expect(payload).not.toHaveProperty("stack");
  });

  it("enforces site:publish independently of route visibility", async () => {
    mocks.role = "editor";
    const response = await publishAdminSite(
      new NextRequest("http://localhost:3000/api/site/admin/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expected_revision: 2 }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe("ACCESS_DENIED");
    expect(mocks.publishSite).not.toHaveBeenCalled();
  });
});
