import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as string,
  getDashboardSnapshot: vi.fn(),
}));

vi.mock("@/middleware/auth.middleware", () => ({
  auth:
    () => async (request: NextRequest, handler: (value: unknown) => unknown) =>
      handler(
        Object.assign(request, {
          user: {
            id: "507f1f77bcf86cd799439011",
            role: mocks.role,
            session_id: "session-id",
          },
        })
      ),
}));
vi.mock("@/app/api/dashboard/dashboard.service", () => ({
  getDashboardSnapshot: mocks.getDashboardSnapshot,
}));

import { GET } from "@/app/api/dashboard/admin/route";

describe("GET /api/dashboard/admin", () => {
  beforeEach(() => {
    mocks.role = "admin";
    mocks.getDashboardSnapshot.mockReset().mockResolvedValue({
      generated_at: "2026-07-15T12:00:00.000Z",
      inbox: { total: 0 },
    });
  });

  it("returns a private snapshot for dashboard readers", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/dashboard/admin")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.getDashboardSnapshot).toHaveBeenCalledOnce();
  });

  it("denies roles without dashboard:read and rejects query surfaces", async () => {
    mocks.role = "editor";
    const denied = await GET(
      new NextRequest("http://localhost:3000/api/dashboard/admin")
    );
    expect(denied.status).toBe(403);

    mocks.role = "admin";
    const projected = await GET(
      new NextRequest("http://localhost:3000/api/dashboard/admin?fields=email")
    );
    expect(projected.status).toBe(400);
  });
});
