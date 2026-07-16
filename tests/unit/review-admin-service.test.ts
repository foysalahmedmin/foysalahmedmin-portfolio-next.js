import {
  getAdminReviewDetail,
  getAdminReviews,
  updateAdminReviewStatus,
} from "@/services/review-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

const rawReview = {
  _id: "507f1f77bcf86cd799439011",
  author: {
    _id: "507f1f77bcf86cd799439012",
    name: "Ada Lovelace",
    email: "private@example.com",
    role: "admin",
    image: { url: "https://private.example.com/profile.png" },
    password: "must-not-survive",
  },
  target: {
    _id: "507f1f77bcf86cd799439013",
    name: "Event platform",
    publication_status: "draft",
  },
  target_model: "Project",
  rating: 5,
  review: "  Clear\u0000 architecture and delivery.  ",
  status: "pending",
  is_edited: true,
  edited_at: "2026-07-15T01:00:00.000Z",
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T01:00:00.000Z",
  internal_note: "private moderation context",
};

const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, status: 200, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("review admin client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds bounded remote filters and strips private author fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([rawReview]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAdminReviews({
      page: 2,
      limit: 25,
      search: "  architecture  ",
      status: "pending",
      target_model: "Project",
      target: "507f1f77bcf86cd799439013",
      rating: 5,
      sort: "-created_at",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, "https://portfolio.test");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      page: "2",
      limit: "25",
      sort: "-created_at",
      search: "architecture",
      status: "pending",
      target_model: "Project",
      target: "507f1f77bcf86cd799439013",
      rating: "5",
    });
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    expect(result.data[0]).toMatchObject({
      author: { id: "507f1f77bcf86cd799439012", name: "Ada Lovelace" },
      target: {
        id: "507f1f77bcf86cd799439013",
        name: "Event platform",
      },
      review: "Clear architecture and delivery.",
    });
    const serialized = JSON.stringify(result.data[0]);
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("publication_status");
    expect(serialized).not.toContain("internal_note");
  });

  it("sanitizes detail and sends only the selected moderation status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(rawReview))
      .mockResolvedValueOnce(response({ ...rawReview, status: "approved" }));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getAdminReviewDetail(rawReview._id);
    const updated = await updateAdminReviewStatus(rawReview._id, "approved");

    expect(detail.data.author).toEqual({
      id: "507f1f77bcf86cd799439012",
      name: "Ada Lovelace",
    });
    expect(updated.data.status).toBe("approved");
    expect(fetchMock.mock.calls[1]).toEqual([
      `/api/reviews/${rawReview._id}/admin`,
      expect.objectContaining({
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ status: "approved" }),
      }),
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({
      status: "approved",
    });
  });
});
