import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { normalizeSlugIdentifier } from "@/lib/content/slug";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { assertCategoryParentIntegrity } from "../category-parent-integrity";
import {
  allocateContentSlug,
  reserveContentSlug,
} from "../content-slug-aliases/content-slug-alias.service";
import {
  isDuplicateKeyError,
  partitionCategoryRestoreCandidates,
} from "../category-lifecycle";
import * as CaseStudyCategoryRepository from "./case-study-category.repository";

const assertCaseStudyCategoryParentIntegrity = async (
  categoryIds: Iterable<string>,
  parentId: string | null | undefined
) =>
  await assertCategoryParentIntegrity({
    categoryLabel: "Case study category",
    categoryIds,
    parentId,
    findParentNodeById: CaseStudyCategoryRepository.findParentHierarchyNodeById,
  });

export const getCaseStudyCategories = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await CaseStudyCategoryRepository.findPaginated(queryParams);
};

export const getPublicCaseStudyCategories = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await CaseStudyCategoryRepository.findPublicPaginated(
    withPublicPagination(queryParams, { defaultLimit: 50 })
  );
};

export const getCaseStudyCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findBySlugPopulated(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return category;
};

export const getPublicCaseStudyCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findPublicBySlugPopulated(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return category;
};

export const getCaseStudyCategoryById = async (id: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return category;
};

export const getPublicCaseStudyCategoryById = async (id: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findPublicByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return category;
};

export const getPublicCaseStudyCategoryByIdentifier = async (
  identifier: string
) => {
  await connectDB();
  const category =
    await CaseStudyCategoryRepository.findPublicByIdentifierPopulated(identifier);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }
  return category;
};

export const createCaseStudyCategory = async (payload: {
  name: string;
  slug: string;
  sequence: number;
  description?: string;
  icon?: string;
  parent?: string | null;
  status?: "active" | "inactive";
  tags?: string[];
  layout?: string;
}) => {
  const db = await connectDB();
  const entityId = new Types.ObjectId().toString();
  await assertCaseStudyCategoryParentIntegrity([entityId], payload.parent);
  const slug = await allocateContentSlug({
    scope: "case_study_category",
    requested: payload.slug || payload.name,
    fallback: "case-study-category",
    target: entityId,
  });
  const session = await db.startSession();
  try {
    let category:
      | Awaited<ReturnType<typeof CaseStudyCategoryRepository.create>>
      | undefined;
    await session.withTransaction(async () => {
      category = await CaseStudyCategoryRepository.create(
        {
          ...payload,
          _id: entityId,
          slug,
          slug_history: [],
          parent: payload.parent ?? null,
          status: payload.status || "active",
          tags: payload.tags || [],
          layout: payload.layout || "default",
        } as never,
        session
      );
      await reserveContentSlug({
        scope: "case_study_category",
        slug,
        target: entityId,
        session,
      });
    });
    return category;
  } finally {
    await session.endSession();
  }
};

export const updateCaseStudyCategoryBySlug = async (
  slug: string,
  payload: Partial<{
    name: string;
    slug: string;
    sequence: number;
    description: string;
    icon: string;
    parent: string | null;
    status: "active" | "inactive";
    tags: string[];
    layout: string;
  }>
) => {
  const db = await connectDB();

  const category = await CaseStudyCategoryRepository.findBySlug(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  await assertCaseStudyCategoryParentIntegrity(
    [category._id.toString()],
    payload.parent
  );

  const nextSlug = payload.slug
    ? await allocateContentSlug({
        scope: "case_study_category",
        requested: payload.slug,
        fallback: "case-study-category",
        target: category._id.toString(),
      })
    : category.slug;
  const previousSlug = category.slug;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      await reserveContentSlug({
        scope: "case_study_category",
        slug: nextSlug,
        target: category._id.toString(),
        session,
      });
      Object.assign(category, payload, { slug: nextSlug });
      if (nextSlug !== previousSlug) {
        category.slug_history = [
          ...(category.slug_history ?? []),
          { slug: previousSlug, changed_at: new Date() },
        ];
      }
      await category.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return category;
};

export const updateCaseStudyCategoryById = async (
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    sequence: number;
    description: string;
    icon: string;
    parent: string | null;
    status: "active" | "inactive";
    tags: string[];
    layout: string;
  }>
) => {
  const db = await connectDB();

  const category = await CaseStudyCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  await assertCaseStudyCategoryParentIntegrity([id], payload.parent);

  const nextSlug = payload.slug
    ? await allocateContentSlug({
        scope: "case_study_category",
        requested: payload.slug,
        fallback: "case-study-category",
        target: id,
      })
    : category.slug;
  const previousSlug = category.slug;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      await reserveContentSlug({
        scope: "case_study_category",
        slug: nextSlug,
        target: id,
        session,
      });
      Object.assign(category, payload, { slug: nextSlug });
      if (nextSlug !== previousSlug) {
        category.slug_history = [
          ...(category.slug_history ?? []),
          { slug: previousSlug, changed_at: new Date() },
        ];
      }
      await category.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return category;
};

export const updateCaseStudyCategories = async (
  slugs: string[],
  payload: Partial<{
    status: "active" | "inactive";
    parent: string | null;
  }>
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const normalizedSlugs = [
    ...new Set(slugs.map(normalizeSlugIdentifier).filter(Boolean)),
  ] as string[];
  const categories =
    await CaseStudyCategoryRepository.findManyBySlugs(normalizedSlugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter(
    (slug) => !foundSlugs.includes(normalizeSlugIdentifier(slug) ?? "")
  );

  await assertCaseStudyCategoryParentIntegrity(
    categories.map((category) => category._id.toString()),
    payload.parent
  );

  const result = await CaseStudyCategoryRepository.updateManyBySlugs(
    foundSlugs,
    payload as never
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteCaseStudyCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findBySlug(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  const deleted = await CaseStudyCategoryRepository.softDeleteById(
    category._id.toString()
  );
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return null;
};

export const deleteCaseStudyCategoryById = async (id: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  const deleted = await CaseStudyCategoryRepository.softDeleteById(id);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  return null;
};

export const deleteCaseStudyCategoryPermanentById = async (
  id: string
): Promise<void> => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findDeletedById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study category not found");
  }

  const dependencyIds =
    await CaseStudyCategoryRepository.findPermanentDeleteDependencyIds([id]);
  if (dependencyIds.includes(id)) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Case study category cannot be permanently deleted while child categories or case studies reference it"
    );
  }

  const deleted = await CaseStudyCategoryRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Case study category not found or not deleted"
    );
  }
};

export const deleteCaseStudyCategories = async (
  slugs: string[]
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const normalizedSlugs = [
    ...new Set(slugs.map(normalizeSlugIdentifier).filter(Boolean)),
  ] as string[];
  const categories =
    await CaseStudyCategoryRepository.findManyBySlugs(normalizedSlugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter(
    (slug) => !foundSlugs.includes(normalizeSlugIdentifier(slug) ?? "")
  );

  const result =
    await CaseStudyCategoryRepository.softDeleteManyBySlugs(foundSlugs);

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteCaseStudyCategoriesPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const requestedIds = Array.from(new Set(ids));
  const categories =
    await CaseStudyCategoryRepository.findDeletedManyByIds(requestedIds);
  const foundIds = categories.map((category) => category._id.toString());
  const foundIdSet = new Set(foundIds);
  const notFoundIds = requestedIds.filter((id) => !foundIdSet.has(id));
  const dependencyIds =
    await CaseStudyCategoryRepository.findPermanentDeleteDependencyIds(foundIds);

  if (dependencyIds.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Case study categories cannot be permanently deleted while dependencies reference these IDs: ${dependencyIds.join(", ")}`
    );
  }

  const result = await CaseStudyCategoryRepository.hardDeleteManyByIds(foundIds);

  return {
    count: result.deletedCount,
    not_found_ids: notFoundIds,
  };
};

export const restoreCaseStudyCategoryById = async (id: string) => {
  await connectDB();

  const category = await CaseStudyCategoryRepository.findDeletedById(id);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Case study category not found or not deleted"
    );
  }

  const parentIds = category.parent ? [category.parent.toString()] : [];
  const [activeParents, activeConflicts] = await Promise.all([
    CaseStudyCategoryRepository.findActiveParentsByIds(parentIds),
    CaseStudyCategoryRepository.findActiveIdentityConflicts([category]),
  ]);
  const { nonRestorableIds } = partitionCategoryRestoreCandidates({
    candidates: [category],
    activeParentIds: activeParents.map((parent) => parent._id.toString()),
    activeConflicts,
  });

  if (nonRestorableIds.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Case study category cannot be restored until its parent is active and its name and slug are available"
    );
  }

  try {
    const restored = await CaseStudyCategoryRepository.restoreById(id);
    if (!restored) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Case study category not found or not deleted"
      );
    }

    return restored;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Case study category name or slug is already in use"
      );
    }

    throw error;
  }
};

export const restoreCaseStudyCategories = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  non_restorable_ids: string[];
}> => {
  await connectDB();

  const requestedIds = Array.from(new Set(ids));
  const categories =
    await CaseStudyCategoryRepository.findDeletedManyByIds(requestedIds);
  const foundIdSet = new Set(
    categories.map((category) => category._id.toString())
  );
  const notFoundIdSet = new Set(
    requestedIds.filter((id) => !foundIdSet.has(id))
  );
  const parentIds = Array.from(
    new Set(
      categories
        .map((category) => category.parent?.toString())
        .filter((parentId): parentId is string => Boolean(parentId))
    )
  );
  const [activeParents, activeConflicts] = await Promise.all([
    CaseStudyCategoryRepository.findActiveParentsByIds(parentIds),
    CaseStudyCategoryRepository.findActiveIdentityConflicts(categories),
  ]);
  const partition = partitionCategoryRestoreCandidates({
    candidates: categories,
    activeParentIds: activeParents.map((parent) => parent._id.toString()),
    activeConflicts,
  });
  const restorableIdSet = new Set(partition.restorableIds);
  const nonRestorableIdSet = new Set(partition.nonRestorableIds);
  let count = 0;

  for (const id of requestedIds) {
    if (!restorableIdSet.has(id)) continue;

    try {
      const restored = await CaseStudyCategoryRepository.restoreById(id);
      if (restored) {
        count += 1;
      } else {
        notFoundIdSet.add(id);
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        nonRestorableIdSet.add(id);
        continue;
      }

      throw error;
    }
  }

  return {
    count,
    not_found_ids: requestedIds.filter((id) => notFoundIdSet.has(id)),
    non_restorable_ids: requestedIds.filter((id) => nonRestorableIdSet.has(id)),
  };
};
