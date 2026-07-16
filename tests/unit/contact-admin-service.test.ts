import {
  getAdminContactDetail,
  getAdminContacts,
  updateAdminContactStatus,
} from "@/services/contact-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify({ success: true, status: 200, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const inboxRow = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  subject: "Architecture review",
  email_masked: "ad***@example.com",
  status: "new",
  delivery_status: "delivered",
  revision: 4,
  status_changed_at: null,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  deleted: false,
  deleted_at: null,
  retention: {
    expires_at: "2027-07-15T00:00:00.000Z",
    anonymized_at: null,
    purge_after: null,
    hold: { active: false },
  },
  operations: {
    idempotency: { active: false },
    delivery: null,
  },
  email: "must-not-survive@example.com",
  message: "This must not survive the client list boundary.",
};

describe("contact admin client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses a bounded no-store list request without caller-controlled projections", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([inboxRow]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAdminContacts({
      page: 2,
      limit: 25,
      search: "  architecture  ",
      status: "new",
      delivery_status: "dead_letter",
      retention: "held",
      sort: "-created_at",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, "https://portfolio.test");
    expect(parsed.pathname).toBe("/api/contacts/admin");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      page: "2",
      limit: "25",
      sort: "-created_at",
      search: "architecture",
      status: "new",
      delivery_status: "dead_letter",
      retention: "held",
    });
    expect(parsed.searchParams.has("fields")).toBe(false);
    expect(result.data[0]).not.toHaveProperty("email");
    expect(result.data[0]).not.toHaveProperty("message");
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
  });

  it("fetches PII detail separately and sends only status concurrency fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "contact-id" }))
      .mockResolvedValueOnce(jsonResponse({ id: "contact-id" }));
    vi.stubGlobal("fetch", fetchMock);

    await getAdminContactDetail("contact-id");
    await updateAdminContactStatus("contact-id", {
      status: "read",
      expected_revision: 4,
    });

    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/contacts/contact-id/admin",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "include",
      }),
    ]);
    expect(fetchMock.mock.calls[1]).toEqual([
      "/api/contacts/contact-id/admin",
      expect.objectContaining({
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ status: "read", expected_revision: 4 }),
      }),
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({
      status: "read",
      expected_revision: 4,
    });
  });
});
