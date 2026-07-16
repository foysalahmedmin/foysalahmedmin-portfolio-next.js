import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  connectDB: vi.fn(),
  invalidatePublicContentAfterCommit: vi.fn(),
  articleSoftDeleteById: vi.fn(),
  projectSoftDeleteById: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/public-content-cache/cache-invalidation.service", () => ({
  invalidatePublicContentAfterCommit: mocks.invalidatePublicContentAfterCommit,
}));
vi.mock("@/app/api/articles/article.repository", () => ({
  softDeleteById: mocks.articleSoftDeleteById,
}));
vi.mock("@/app/api/projects/project.repository", () => ({
  softDeleteById: mocks.projectSoftDeleteById,
}));
vi.mock("@/app/api/files/file.service", () => ({}));
vi.mock("@/app/api/article-categories/article-category.repository", () => ({
  findById: vi.fn(),
}));
vi.mock("@/app/api/project-categories/project-category.repository", () => ({
  findById: vi.fn(),
}));
vi.mock("@/app/api/content-slug-aliases/content-slug-alias.service", () => ({
  allocateContentSlug: vi.fn(),
  reserveContentSlug: vi.fn(),
}));

import { deleteArticleById } from "@/app/api/articles/article.service";
import { deleteProjectById } from "@/app/api/projects/project.service";

describe("cross-domain mutation invalidation boundary", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.connectDB.mockReset();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.articleSoftDeleteById.mockReset();
    mocks.articleSoftDeleteById.mockImplementation(async () => {
      mocks.events.push("article:committed");
      return { _id: "article-id" };
    });
    mocks.projectSoftDeleteById.mockReset();
    mocks.projectSoftDeleteById.mockImplementation(async () => {
      mocks.events.push("project:committed");
      return { _id: "project-id" };
    });
    mocks.invalidatePublicContentAfterCommit.mockReset();
    mocks.invalidatePublicContentAfterCommit.mockImplementation(
      async (domain: string) => {
        mocks.events.push(`${domain}:cache-intent`);
        return true;
      }
    );
  });

  it("invalidates Article and Project composition tags only after mutation success", async () => {
    await deleteArticleById("507f1f77bcf86cd799439011");
    await deleteProjectById("507f1f77bcf86cd799439012");

    expect(mocks.events).toEqual([
      "article:committed",
      "article:cache-intent",
      "project:committed",
      "project:cache-intent",
    ]);
    expect(mocks.invalidatePublicContentAfterCommit).toHaveBeenNthCalledWith(
      1,
      "article"
    );
    expect(mocks.invalidatePublicContentAfterCommit).toHaveBeenNthCalledWith(
      2,
      "project"
    );
  });

  it("does not invalidate when a mutation fails", async () => {
    mocks.articleSoftDeleteById.mockResolvedValueOnce(null);

    await expect(
      deleteArticleById("507f1f77bcf86cd799439011")
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.invalidatePublicContentAfterCommit).not.toHaveBeenCalled();
  });

  it("keeps a successful mutation successful when intent creation is unavailable", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.invalidatePublicContentAfterCommit.mockRejectedValueOnce(
      new Error("database unavailable")
    );

    await expect(
      deleteProjectById("507f1f77bcf86cd799439012")
    ).resolves.toBeNull();
    expect(error).toHaveBeenCalledWith("project_public_cache_intent_failed", {
      error_code: "cache_intent_failed",
    });
  });
});
