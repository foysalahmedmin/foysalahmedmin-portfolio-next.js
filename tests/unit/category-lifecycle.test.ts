import {
  isDuplicateKeyError,
  partitionCategoryRestoreCandidates,
} from "@/app/api/category-lifecycle";
import { articleCategoryIdsOperationValidationSchema } from "@/app/api/article-categories/article-category.validation";
import { projectCategoryIdsOperationValidationSchema } from "@/app/api/project-categories/project-category.validation";
import { describe, expect, it } from "vitest";

const FIRST_ID = "507f1f77bcf86cd799439011";
const SECOND_ID = "507f191e810c19729de860ea";
const PARENT_ID = "65a1f88a18bc2e30d4f331aa";

describe("category restore lifecycle", () => {
  it("allows a category whose parent is active and identity is available", () => {
    expect(
      partitionCategoryRestoreCandidates({
        candidates: [
          {
            _id: FIRST_ID,
            name: "Platform engineering",
            slug: "platform-engineering",
            parent: PARENT_ID,
          },
        ],
        activeParentIds: [PARENT_ID],
        activeConflicts: [],
      })
    ).toEqual({
      restorableIds: [FIRST_ID],
      nonRestorableIds: [],
    });
  });

  it("reports missing active parents and active identity collisions", () => {
    expect(
      partitionCategoryRestoreCandidates({
        candidates: [
          {
            _id: FIRST_ID,
            name: "Backend",
            slug: "backend",
            parent: PARENT_ID,
          },
          {
            _id: SECOND_ID,
            name: "Frontend",
            slug: "frontend",
          },
        ],
        activeParentIds: [],
        activeConflicts: [{ name: "Frontend", slug: "other-slug" }],
      })
    ).toEqual({
      restorableIds: [],
      nonRestorableIds: [FIRST_ID, SECOND_ID],
    });
  });

  it("does not choose an arbitrary winner when deleted identities collide", () => {
    expect(
      partitionCategoryRestoreCandidates({
        candidates: [
          { _id: FIRST_ID, name: "Systems", slug: "systems" },
          { _id: SECOND_ID, name: "Different", slug: "systems" },
        ],
        activeParentIds: [],
        activeConflicts: [],
      })
    ).toEqual({
      restorableIds: [],
      nonRestorableIds: [FIRST_ID, SECOND_ID],
    });
  });

  it("recognizes only Mongo duplicate-key failures", () => {
    expect(isDuplicateKeyError({ code: 11_000 })).toBe(true);
    expect(isDuplicateKeyError({ code: 400 })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });
});

describe.each([
  ["article", articleCategoryIdsOperationValidationSchema],
  ["project", projectCategoryIdsOperationValidationSchema],
])("%s category trash contract", (_kind, schema) => {
  it("accepts a non-empty list of unique ObjectIds", () => {
    expect(
      schema.safeParse({ body: { ids: [FIRST_ID, SECOND_ID] } }).success
    ).toBe(true);
  });

  it("rejects slug-based and duplicate-ID payloads", () => {
    expect(schema.safeParse({ body: { slugs: ["systems"] } }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ body: { ids: [FIRST_ID, FIRST_ID] } }).success
    ).toBe(false);
  });
});
