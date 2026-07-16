import {
  buildAdminAuditQuery,
  getAdminAuditEvents,
} from "@/services/audit-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("audit admin service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes only the supported bounded audit query", () => {
    const query = new URLSearchParams(
      buildAdminAuditQuery({
        page: 2,
        limit: 20,
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-16T23:59:59.999Z",
        action: "content.published",
        actorType: "user",
        targetType: "article",
        outcome: "success",
        source: "admin",
      })
    );

    expect(Object.fromEntries(query)).toEqual({
      page: "2",
      limit: "20",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-16T23:59:59.999Z",
      action: "content.published",
      actor_type: "user",
      target_type: "article",
      outcome: "success",
      source: "admin",
    });
  });

  it("requests private no-store audit data with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 200,
          success: true,
          data: [],
          meta: { page: 1, limit: 10, total: 0 },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await getAdminAuditEvents({
      page: 1,
      limit: 10,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-16T23:59:59.999Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/audit-events?"),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "include",
      })
    );
  });
});
