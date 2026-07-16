import {
  createAdminProjectResource,
  getAdminProjectResources,
  getAuthorizedProjectReferences,
  permanentlyDeleteAdminProjectResources,
  updateAdminProjectResourcePrivacy,
} from "@/services/project-resource-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (data: unknown, meta?: Record<string, unknown>) =>
  new Response(
    JSON.stringify({
      success: true,
      status: 200,
      data,
      ...(meta ? { meta } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

describe("project-resource admin service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends bounded remote list state to the protected admin endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse([], { page: 2, limit: 20, total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    await getAdminProjectResources({
      search: "architecture notes",
      sort: "-title",
      page: 2,
      limit: 20,
      type: "documentation",
      is_private: "true",
      deleted_scope: "with_deleted",
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    const requestUrl = new URL(String(url), "https://portfolio.test");
    expect(requestUrl.pathname).toBe("/api/project-resources/admin");
    expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
      search: "architecture notes",
      sort: "-title",
      page: "2",
      limit: "20",
      type: "documentation",
      is_private: "true",
      deleted_scope: "with_deleted",
    });
    expect(init).toMatchObject({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("loads project choices only from the authorized admin project endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await getAuthorizedProjectReferences("private client");

    const [url] = fetchMock.mock.calls[0]!;
    const requestUrl = new URL(String(url), "https://portfolio.test");
    expect(requestUrl.pathname).toBe("/api/projects/admin");
    expect(requestUrl.searchParams.get("search")).toBe("private client");
    expect(requestUrl.searchParams.get("fields")).toBe("_id,name,status");
    expect(requestUrl.searchParams.get("limit")).toBe("20");
  });

  it("uses the existing create, privacy and permanent-delete contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ _id: "resource-id" }))
      .mockResolvedValueOnce(jsonResponse({ count: 1, not_found_ids: [] }))
      .mockResolvedValueOnce(jsonResponse({ count: 1, not_found_ids: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      project: "507f1f77bcf86cd799439011",
      sequence: 1,
      type: "repository" as const,
      title: "Source repository",
      url: "https://github.com/example/project",
      description: "Approved source link",
      is_private: true,
    };

    await createAdminProjectResource(input);
    await updateAdminProjectResourcePrivacy(
      ["507f1f77bcf86cd799439012"],
      false
    );
    await permanentlyDeleteAdminProjectResources(["507f1f77bcf86cd799439013"]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/project-resources/admin",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify(input),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/project-resources/admin",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          ids: ["507f1f77bcf86cd799439012"],
          is_private: false,
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/project-resources/admin/permanent",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
