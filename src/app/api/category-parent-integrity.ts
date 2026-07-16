import AppError from "@/builder/app-error";
import { isMongoObjectId } from "@/lib/content/slug";
import httpStatus from "http-status";
import { z } from "zod";

export const MAX_CATEGORY_PARENT_DEPTH = 32;

export const categoryParentIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Invalid parent ID format");

export type TCategoryParentHierarchyNode = {
  parent?: unknown | null;
  status: string;
  is_deleted?: boolean;
};

type TCategoryParentIntegrityInput = Readonly<{
  categoryLabel: "Article category" | "Project category";
  categoryIds: Iterable<string>;
  parentId: string | null | undefined;
  findParentNodeById: (
    id: string
  ) => Promise<TCategoryParentHierarchyNode | null>;
  maxDepth?: number;
}>;

const toNullableId = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value).toLowerCase();

/**
 * Validates a proposed category parent against the complete active ancestry.
 * The bounded walk prevents corrupt or adversarial hierarchy data from
 * producing an unbounded request while still detecting descendant cycles.
 */
export const assertCategoryParentIntegrity = async ({
  categoryLabel,
  categoryIds,
  parentId,
  findParentNodeById,
  maxDepth = MAX_CATEGORY_PARENT_DEPTH,
}: TCategoryParentIntegrityInput): Promise<void> => {
  if (parentId === null || parentId === undefined) return;

  if (!isMongoObjectId(parentId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${categoryLabel} parent ID must be a valid ObjectId`
    );
  }

  const subjectIds = new Set(Array.from(categoryIds, (id) => id.toLowerCase()));
  const visitedIds = new Set<string>();
  let ancestorId: string | null = parentId.toLowerCase();

  for (let depth = 0; depth < maxDepth && ancestorId; depth += 1) {
    if (subjectIds.has(ancestorId) || visitedIds.has(ancestorId)) {
      throw new AppError(
        httpStatus.CONFLICT,
        `${categoryLabel} parent would create a hierarchy cycle`
      );
    }
    visitedIds.add(ancestorId);

    const ancestor = await findParentNodeById(ancestorId);
    if (
      !ancestor ||
      ancestor.is_deleted === true ||
      ancestor.status !== "active"
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `${categoryLabel} parent must reference an active category`
      );
    }

    ancestorId = toNullableId(ancestor.parent);
  }

  if (ancestorId) {
    throw new AppError(
      httpStatus.CONFLICT,
      `${categoryLabel} parent hierarchy exceeds the maximum depth of ${maxDepth}`
    );
  }
};
