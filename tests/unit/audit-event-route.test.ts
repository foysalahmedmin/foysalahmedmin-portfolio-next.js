import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as string,
  queryAuditEvents: vi.fn(),
}));

vi.mock("@/middleware/auth.middleware", () => ({
  auth:
    () => async (request: NextRequest, handler: (req: unknown) => unknown) =>
      handler(
        Object.assign(request, {
          user: {
            _id: "507f1f77bcf86cd799439011",
            role: mocks.role,
            session_id: "session-id",
          },
        })
      ),
}));
vi.mock("@/app/api/audit-events/audit-event.service", () => ({
  queryAuditEvents: mocks.queryAuditEvents,
}));

import { GET } from "@/app/api/audit-events/route";

describe("GET /api/audit-events", () => {
  beforeEach(() => {
    mocks.role = "admin";
    mocks.queryAuditEvents.mockReset();
    mocks.queryAuditEvents.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 25 },
    });
  });

  it("allows audit:read and applies private no-store delivery", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/audit-events?action=contact.submitted"
      )
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Authorization");
    expect(mocks.queryAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contact.submitted", limit: 25 })
    );
  });

  it("denies an authenticated role without audit:read", async () => {
    mocks.role = "editor";
    const response = await GET(
      new NextRequest("http://localhost:3000/api/audit-events")
    );
    expect(response.status).toBe(403);
    expect(mocks.queryAuditEvents).not.toHaveBeenCalled();
  });

  it("rejects arbitrary projections before querying", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/audit-events?fields=session_hash"
      )
    );
    expect(response.status).toBe(400);
    expect(mocks.queryAuditEvents).not.toHaveBeenCalled();
  });
});
