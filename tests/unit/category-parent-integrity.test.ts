import {
  assertCategoryParentIntegrity,
  categoryParentIdSchema,
} from "@/app/api/category-parent-integrity";
import {
  createArticleCategorySchema,
  updateArticleCategoriesSchema,
  updateArticleCategoryByIdSchema,
  updateArticleCategorySchema,
} from "@/app/api/article-categories/article-category.validation";
import {
  createProjectCategorySchema,
  updateProjectCategoriesSchema,
  updateProjectCategoryByIdSchema,
  updateProjectCategorySchema,
} from "@/app/api/project-categories/project-category.validation";
import { describe, expect, it, vi } from "vitest";

const CATEGORY_ID = "507f1f77bcf86cd799439011";
const PARENT_ID = "507f1f77bcf86cd799439012";
const ANCESTOR_ID = "507f1f77bcf86cd799439013";
const EXTRA_ID = "507f1f77bcf86cd799439014";

const activeNode = (parent: string | null = null) => ({
  parent,
  status: "active",
  is_deleted: false,
});

describe("category parent validation", () => {
  it("uses the same strict ObjectId contract for category parents", () => {
    expect(categoryParentIdSchema.safeParse(PARENT_ID).success).toBe(true);
    expect(categoryParentIdSchema.safeParse("not-an-object-id").success).toBe(
      false
    );
  });

  describe.each([
    [
      "article",
      [
        [
          createArticleCategorySchema,
          {
            body: {
              name: "Backend",
              slug: "backend",
              sequence: 1,
              parent: "invalid",
            },
          },
        ],
        [
          updateArticleCategorySchema,
          { params: { slug: "backend" }, body: { parent: "invalid" } },
        ],
        [
          updateArticleCategoryByIdSchema,
          { params: { id: CATEGORY_ID }, body: { parent: "invalid" } },
        ],
        [
          updateArticleCategoriesSchema,
          { body: { slugs: ["backend"], parent: "invalid" } },
        ],
      ],
    ],
    [
      "project",
      [
        [
          createProjectCategorySchema,
          {
            body: {
              name: "Systems",
              slug: "systems",
              sequence: 1,
              parent: "invalid",
            },
          },
        ],
        [
          updateProjectCategorySchema,
          { params: { slug: "systems" }, body: { parent: "invalid" } },
        ],
        [
          updateProjectCategoryByIdSchema,
          { params: { id: CATEGORY_ID }, body: { parent: "invalid" } },
        ],
        [
          updateProjectCategoriesSchema,
          { body: { slugs: ["systems"], parent: "invalid" } },
        ],
      ],
    ],
  ] as const)("%s category schemas", (_kind, cases) => {
    it("rejects malformed parent IDs", () => {
      for (const [schema, input] of cases) {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            "Invalid parent ID format"
          );
        }
      }
    });

    it("preserves an explicit null root parent", () => {
      const updateSchema = cases[2][0];
      const result = updateSchema.safeParse({
        params: { id: CATEGORY_ID },
        body: { parent: null },
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.body.parent).toBeNull();
    });
  });
});

describe.each(["Article category", "Project category"] as const)(
  "%s parent integrity",
  (categoryLabel) => {
    it("accepts null without reading hierarchy data", async () => {
      const findParentNodeById = vi.fn();
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: null,
          findParentNodeById,
        })
      ).resolves.toBeUndefined();
      expect(findParentNodeById).not.toHaveBeenCalled();
    });

    it("rejects missing, deleted, and inactive parent nodes consistently", async () => {
      const invalidParents = [
        null,
        { ...activeNode(), is_deleted: true },
        { ...activeNode(), status: "inactive" },
      ];

      for (const parent of invalidParents) {
        await expect(
          assertCategoryParentIntegrity({
            categoryLabel,
            categoryIds: [CATEGORY_ID],
            parentId: PARENT_ID,
            findParentNodeById: vi.fn().mockResolvedValue(parent),
          })
        ).rejects.toMatchObject({
          status: 400,
          message: `${categoryLabel} parent must reference an active category`,
        });
      }
    });

    it("rejects self-parenting across equivalent ObjectId casing", async () => {
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: CATEGORY_ID.toUpperCase(),
          findParentNodeById: vi.fn(),
        })
      ).rejects.toMatchObject({
        status: 409,
        message: `${categoryLabel} parent would create a hierarchy cycle`,
      });
    });

    it("rejects a descendant parent", async () => {
      const nodes = new Map([
        [PARENT_ID, activeNode(ANCESTOR_ID)],
        [ANCESTOR_ID, activeNode(CATEGORY_ID)],
      ]);
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: PARENT_ID,
          findParentNodeById: vi.fn(async (id) => nodes.get(id) ?? null),
        })
      ).rejects.toMatchObject({
        status: 409,
        message: `${categoryLabel} parent would create a hierarchy cycle`,
      });
    });

    it("rejects an active parent whose ancestor is inactive", async () => {
      const nodes = new Map([
        [PARENT_ID, activeNode(ANCESTOR_ID)],
        [ANCESTOR_ID, { parent: null, status: "inactive", is_deleted: false }],
      ]);
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: PARENT_ID,
          findParentNodeById: vi.fn(async (id) => nodes.get(id) ?? null),
        })
      ).rejects.toMatchObject({
        status: 400,
        message: `${categoryLabel} parent must reference an active category`,
      });
    });

    it("accepts an active acyclic hierarchy", async () => {
      const nodes = new Map([
        [PARENT_ID, activeNode(ANCESTOR_ID)],
        [ANCESTOR_ID, activeNode()],
      ]);
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: PARENT_ID,
          findParentNodeById: vi.fn(async (id) => nodes.get(id) ?? null),
        })
      ).resolves.toBeUndefined();
    });

    it("bounds corrupt cycles and over-deep hierarchies", async () => {
      const cyclicNodes = new Map([
        [PARENT_ID, activeNode(ANCESTOR_ID)],
        [ANCESTOR_ID, activeNode(PARENT_ID)],
      ]);
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: PARENT_ID,
          findParentNodeById: vi.fn(async (id) => cyclicNodes.get(id) ?? null),
        })
      ).rejects.toMatchObject({ status: 409 });

      const deepNodes = new Map([
        [PARENT_ID, activeNode(ANCESTOR_ID)],
        [ANCESTOR_ID, activeNode(EXTRA_ID)],
        [EXTRA_ID, activeNode()],
      ]);
      await expect(
        assertCategoryParentIntegrity({
          categoryLabel,
          categoryIds: [CATEGORY_ID],
          parentId: PARENT_ID,
          maxDepth: 2,
          findParentNodeById: vi.fn(async (id) => deepNodes.get(id) ?? null),
        })
      ).rejects.toMatchObject({
        status: 409,
        message: `${categoryLabel} parent hierarchy exceeds the maximum depth of 2`,
      });
    });
  }
);
