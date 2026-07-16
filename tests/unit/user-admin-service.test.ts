import {
  getAdminUsers,
  permanentlyDeleteAdminUser,
  restoreAdminUser,
  softDeleteAdminUser,
  updateAdminUser,
} from "@/services/user-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

const rawUser = {
  _id: "507f1f77bcf86cd799439011",
  name: "Portfolio Editor",
  email: "editor@example.test",
  role: "editor",
  status: "in-progress",
  is_verified: true,
  is_deleted: false,
  deleted_at: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
  password: "must-never-reach-client-state",
  session_hash: "must-never-reach-client-state",
};

const response = (data: unknown) =>
  new Response(
    JSON.stringify({
      status: 200,
      success: true,
      data,
      meta: {
        page: 1,
        limit: 20,
        total: Array.isArray(data) ? data.length : 1,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

describe("user admin service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds a bounded private query and allowlists user fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([rawUser]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAdminUsers({
      page: 2,
      limit: 20,
      search: "  editor  ",
      sort: "role",
      role: "editor",
      status: "in-progress",
      isVerified: true,
      deletedScope: "with_deleted",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, "https://portfolio.test");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      page: "2",
      limit: "20",
      sort: "role",
      search: "editor",
      role: "editor",
      status: "in-progress",
      is_verified: "true",
      deleted_scope: "with_deleted",
    });
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    expect(result.data[0]).toMatchObject({
      id: rawUser._id,
      role: "editor",
      status: "in-progress",
    });
    expect(result.data[0]).not.toHaveProperty("password");
    expect(result.data[0]).not.toHaveProperty("session_hash");
  });

  it("sends only bounded access fields and the existing lifecycle methods", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ ...rawUser, role: "author" }))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response(rawUser))
      .mockResolvedValueOnce(response(null));
    vi.stubGlobal("fetch", fetchMock);

    await updateAdminUser(rawUser._id, {
      role: "author",
      status: "blocked",
      is_verified: false,
    });
    await softDeleteAdminUser(rawUser._id);
    await restoreAdminUser(rawUser._id);
    await permanentlyDeleteAdminUser(rawUser._id);

    expect(fetchMock.mock.calls[0]).toEqual([
      `/api/users/${rawUser._id}/admin`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          role: "author",
          status: "blocked",
          is_verified: false,
        }),
      }),
    ]);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[2]).toEqual([
      `/api/users/${rawUser._id}/admin/restore`,
      expect.objectContaining({ method: "POST" }),
    ]);
    expect(fetchMock.mock.calls[3]).toEqual([
      `/api/users/${rawUser._id}/admin/permanent`,
      expect.objectContaining({ method: "DELETE" }),
    ]);
  });
});
