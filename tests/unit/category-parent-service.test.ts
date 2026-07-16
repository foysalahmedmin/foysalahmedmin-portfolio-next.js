import { beforeEach, describe, expect, it, vi } from "vitest";

const infrastructureMocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  startSession: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
  allocateContentSlug: vi.fn(),
  reserveContentSlug: vi.fn(),
}));

const articleRepositoryMocks = vi.hoisted(() => ({
  create: vi.fn(),
  findBySlug: vi.fn(),
  findById: vi.fn(),
  findManyBySlugs: vi.fn(),
  findParentHierarchyNodeById: vi.fn(),
  updateManyBySlugs: vi.fn(),
}));

const projectRepositoryMocks = vi.hoisted(() => ({
  create: vi.fn(),
  findBySlug: vi.fn(),
  findById: vi.fn(),
  findManyBySlugs: vi.fn(),
  findParentHierarchyNodeById: vi.fn(),
  updateManyBySlugs: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: infrastructureMocks.connectDB }));
vi.mock("@/app/api/content-slug-aliases/content-slug-alias.service", () => ({
  allocateContentSlug: infrastructureMocks.allocateContentSlug,
  reserveContentSlug: infrastructureMocks.reserveContentSlug,
}));
vi.mock(
  "@/app/api/article-categories/article-category.repository",
  () => articleRepositoryMocks
);
vi.mock(
  "@/app/api/project-categories/project-category.repository",
  () => projectRepositoryMocks
);

import {
  createArticleCategory,
  updateArticleCategories,
  updateArticleCategoryById,
  updateArticleCategoryBySlug,
} from "@/app/api/article-categories/article-category.service";
import {
  createProjectCategory,
  updateProjectCategories,
  updateProjectCategoryById,
  updateProjectCategoryBySlug,
} from "@/app/api/project-categories/project-category.service";

const CATEGORY_ID = "507f1f77bcf86cd799439011";
const PARENT_ID = "507f1f77bcf86cd799439012";

const makeCategory = () => ({
  _id: CATEGORY_ID,
  name: "Systems",
  slug: "systems",
  slug_history: [],
  parent: null as string | null,
  save: vi.fn().mockResolvedValue(undefined),
});

const variants = [
  {
    label: "Article category",
    create: createArticleCategory,
    updateMany: updateArticleCategories,
    updateById: updateArticleCategoryById,
    updateBySlug: updateArticleCategoryBySlug,
    repository: articleRepositoryMocks,
  },
  {
    label: "Project category",
    create: createProjectCategory,
    updateMany: updateProjectCategories,
    updateById: updateProjectCategoryById,
    updateBySlug: updateProjectCategoryBySlug,
    repository: projectRepositoryMocks,
  },
] as const;

describe.each(variants)("$label service parent integrity", (variant) => {
  beforeEach(() => {
    infrastructureMocks.connectDB.mockResolvedValue({
      startSession: infrastructureMocks.startSession,
    });
    infrastructureMocks.startSession.mockResolvedValue({
      withTransaction: infrastructureMocks.withTransaction,
      endSession: infrastructureMocks.endSession,
    });
    infrastructureMocks.withTransaction.mockImplementation(
      async (callback: () => Promise<void>) => callback()
    );
    infrastructureMocks.allocateContentSlug.mockResolvedValue("systems");
    infrastructureMocks.reserveContentSlug.mockResolvedValue(undefined);
  });

  it("rejects an inactive parent before category creation", async () => {
    variant.repository.findParentHierarchyNodeById.mockResolvedValue({
      parent: null,
      status: "inactive",
      is_deleted: false,
    });

    await expect(
      variant.create({
        name: "Systems",
        slug: "systems",
        sequence: 1,
        parent: PARENT_ID,
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(infrastructureMocks.allocateContentSlug).not.toHaveBeenCalled();
    expect(variant.repository.create).not.toHaveBeenCalled();
  });

  it("rejects a descendant parent through the slug update path", async () => {
    const category = makeCategory();
    variant.repository.findBySlug.mockResolvedValue(category);
    variant.repository.findParentHierarchyNodeById.mockResolvedValue({
      parent: CATEGORY_ID,
      status: "active",
      is_deleted: false,
    });

    await expect(
      variant.updateBySlug("systems", { parent: PARENT_ID })
    ).rejects.toMatchObject({ status: 409 });
    expect(category.save).not.toHaveBeenCalled();
  });

  it("rejects self-parenting through the ID update path", async () => {
    const category = makeCategory();
    variant.repository.findById.mockResolvedValue(category);

    await expect(
      variant.updateById(CATEGORY_ID, { parent: CATEGORY_ID })
    ).rejects.toMatchObject({ status: 409 });
    expect(
      variant.repository.findParentHierarchyNodeById
    ).not.toHaveBeenCalled();
    expect(category.save).not.toHaveBeenCalled();
  });

  it("persists an explicit null parent through the ID update path", async () => {
    const category = makeCategory();
    category.parent = PARENT_ID;
    variant.repository.findById.mockResolvedValue(category);

    await expect(
      variant.updateById(CATEGORY_ID, { parent: null })
    ).resolves.toMatchObject({ parent: null });
    expect(
      variant.repository.findParentHierarchyNodeById
    ).not.toHaveBeenCalled();
    expect(category.save).toHaveBeenCalledOnce();
  });

  it("rejects a bulk reparent when the parent descends from any target", async () => {
    variant.repository.findManyBySlugs.mockResolvedValue([makeCategory()]);
    variant.repository.findParentHierarchyNodeById.mockResolvedValue({
      parent: CATEGORY_ID,
      status: "active",
      is_deleted: false,
    });

    await expect(
      variant.updateMany(["systems"], { parent: PARENT_ID })
    ).rejects.toMatchObject({ status: 409 });
    expect(variant.repository.updateManyBySlugs).not.toHaveBeenCalled();
  });
});
