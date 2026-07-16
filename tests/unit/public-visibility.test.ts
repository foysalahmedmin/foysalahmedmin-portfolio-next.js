import { Article } from "@/app/api/articles/article.model";
import {
  PUBLIC_ARTICLE_DETAIL_FIELDS,
  PUBLIC_ARTICLE_LIST_FIELDS,
} from "@/app/api/articles/article.repository";
import {
  PUBLIC_PROJECT_DETAIL_FIELDS,
  PUBLIC_PROJECT_LIST_FIELDS,
} from "@/app/api/projects/project.repository";
import {
  getPublicArticleFilter,
  getPublicCategoryFilter,
  getPublicProjectFilter,
  getPublicProjectResourceFilter,
  getPublicReviewFilter,
  withPublicCategories,
} from "@/app/api/public-visibility";
import { Review } from "@/app/api/reviews/review.model";
import { GET as getPublicUser } from "@/app/api/users/[id]/route";
import { withPublicPagination } from "@/utils/public-query";
import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

describe("public visibility contracts", () => {
  it("keeps a published article available without an implicit expiry", () => {
    const article = new Article({
      name: "Durable article",
      content: "Article body",
      category: new Types.ObjectId(),
      author: new Types.ObjectId(),
      status: "published",
      is_featured: false,
      is_premium: false,
    });

    expect(article.published_at).toBeInstanceOf(Date);
    expect(article.expired_at).toBeUndefined();
  });

  it("retains an explicitly configured article expiry", () => {
    const expiresAt = new Date("2030-02-01T00:00:00.000Z");
    const article = new Article({
      name: "Time-bound article",
      content: "Article body",
      category: new Types.ObjectId(),
      author: new Types.ObjectId(),
      status: "published",
      published_at: new Date("2030-01-01T00:00:00.000Z"),
      expired_at: expiresAt,
      is_featured: false,
      is_premium: false,
    });

    expect(article.expired_at).toEqual(expiresAt);
  });

  it("requires publication timing and permits only an absent or future expiry", () => {
    const now = new Date("2030-01-15T12:00:00.000Z");

    expect(getPublicArticleFilter(now)).toEqual({
      status: "published",
      published_at: { $lte: now },
      $or: [
        { expired_at: { $exists: false } },
        { expired_at: null },
        { expired_at: { $gt: now } },
      ],
    });
  });

  it("locks every public domain to its safe status", () => {
    expect(getPublicProjectFilter()).toEqual({
      $or: [
        { publication_status: "published" },
        {
          publication_status: { $exists: false },
          status: "completed",
        },
      ],
    });
    expect(getPublicCategoryFilter()).toEqual({ status: "active" });
    expect(getPublicProjectResourceFilter()).toEqual({
      is_private: { $ne: true },
    });
    expect(getPublicProjectResourceFilter("project-id")).toEqual({
      is_private: { $ne: true },
      project: "project-id",
    });
    expect(getPublicReviewFilter([{ target_model: "Project" }])).toEqual({
      status: "approved",
      $or: [{ target_model: "Project" }],
    });
  });

  it("requires an active category and keeps public list projections minimal", () => {
    expect(
      withPublicCategories({ status: "published" }, ["category-id"])
    ).toEqual({
      status: "published",
      category: { $in: ["category-id"] },
    });

    expect(PUBLIC_ARTICLE_LIST_FIELDS).not.toContain("content");
    expect(PUBLIC_ARTICLE_LIST_FIELDS).toContain("updated_at");
    expect(PUBLIC_ARTICLE_DETAIL_FIELDS).toContain("content");
    expect(PUBLIC_ARTICLE_DETAIL_FIELDS).toContain("updated_at");
    expect(PUBLIC_ARTICLE_DETAIL_FIELDS).not.toContain("collaborators");
    expect(PUBLIC_PROJECT_LIST_FIELDS).not.toContain("content");
    expect(PUBLIC_PROJECT_LIST_FIELDS).toContain("role");
    expect(PUBLIC_PROJECT_DETAIL_FIELDS).toContain("content");
    expect(PUBLIC_PROJECT_DETAIL_FIELDS).not.toContain("client");
    expect(PUBLIC_PROJECT_DETAIL_FIELDS).not.toContain("collaborators");
  });

  it("requires moderation for reviews even when a lower layer creates one", () => {
    const review = new Review({
      author: new Types.ObjectId(),
      target: new Types.ObjectId(),
      target_model: "Project",
      rating: 5,
      review: "A useful review",
    });

    expect(review.status).toBe("pending");
  });

  it("caps public pagination and discards caller-controlled projections", () => {
    expect(withPublicPagination({})).toMatchObject({ page: "1", limit: "20" });
    expect(
      withPublicPagination({ page: "2", limit: "999", fields: "-name" })
    ).toEqual({ page: "2", limit: "50" });
    expect(withPublicPagination({ page: "-1", limit: "invalid" })).toEqual({
      page: "1",
      limit: "20",
    });
  });

  it("does not expose an anonymous public user-detail endpoint", () => {
    expect(getPublicUser().status).toBe(404);
  });
});
