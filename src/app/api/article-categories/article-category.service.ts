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
import * as ArticleCategoryRepository from "./article-category.repository";

const assertArticleCategoryParentIntegrity = async (
  categoryIds: Iterable<string>,
  parentId: string | null | undefined
) =>
  await assertCategoryParentIntegrity({
    categoryLabel: "Article category",
    categoryIds,
    parentId,
    findParentNodeById: ArticleCategoryRepository.findParentHierarchyNodeById,
  });

export const getArticleCategories = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await ArticleCategoryRepository.findPaginated(queryParams);
};

export const getPublicArticleCategories = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await ArticleCategoryRepository.findPublicPaginated(
    withPublicPagination(queryParams, { defaultLimit: 50 })
  );
};

export const getArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlugPopulated(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return category;
};

export const getPublicArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findPublicBySlugPopulated(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return category;
};

export const getArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return category;
};

export const getPublicArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findPublicByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return category;
};

export const getPublicArticleCategoryByIdentifier = async (
  identifier: string
) => {
  await connectDB();
  const category =
    await ArticleCategoryRepository.findPublicByIdentifierPopulated(identifier);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }
  return category;
};

export const createArticleCategory = async (payload: {
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
  await assertArticleCategoryParentIntegrity([entityId], payload.parent);
  const slug = await allocateContentSlug({
    scope: "article_category",
    requested: payload.slug || payload.name,
    fallback: "article-category",
    target: entityId,
  });
  const session = await db.startSession();
  try {
    let category:
      | Awaited<ReturnType<typeof ArticleCategoryRepository.create>>
      | undefined;
    await session.withTransaction(async () => {
      category = await ArticleCategoryRepository.create(
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
        scope: "article_category",
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

export const updateArticleCategoryBySlug = async (
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

  const category = await ArticleCategoryRepository.findBySlug(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  await assertArticleCategoryParentIntegrity(
    [category._id.toString()],
    payload.parent
  );

  const nextSlug = payload.slug
    ? await allocateContentSlug({
        scope: "article_category",
        requested: payload.slug,
        fallback: "article-category",
        target: category._id.toString(),
      })
    : category.slug;
  const previousSlug = category.slug;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      await reserveContentSlug({
        scope: "article_category",
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

export const updateArticleCategoryById = async (
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

  const category = await ArticleCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  await assertArticleCategoryParentIntegrity([id], payload.parent);

  const nextSlug = payload.slug
    ? await allocateContentSlug({
        scope: "article_category",
        requested: payload.slug,
        fallback: "article-category",
        target: id,
      })
    : category.slug;
  const previousSlug = category.slug;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      await reserveContentSlug({
        scope: "article_category",
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

export const updateArticleCategories = async (
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
    await ArticleCategoryRepository.findManyBySlugs(normalizedSlugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter(
    (slug) => !foundSlugs.includes(normalizeSlugIdentifier(slug) ?? "")
  );

  await assertArticleCategoryParentIntegrity(
    categories.map((category) => category._id.toString()),
    payload.parent
  );

  const result = await ArticleCategoryRepository.updateManyBySlugs(
    foundSlugs,
    payload as never
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlug(
    normalizeSlugIdentifier(slug) ?? "__invalid__"
  );
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  const deleted = await ArticleCategoryRepository.softDeleteById(
    category._id.toString()
  );
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return null;
};

export const deleteArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  const deleted = await ArticleCategoryRepository.softDeleteById(id);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  return null;
};

export const deleteArticleCategoryPermanentById = async (
  id: string
): Promise<void> => {
  await connectDB();

  const category = await ArticleCategoryRepository.findDeletedById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Article category not found");
  }

  const dependencyIds =
    await ArticleCategoryRepository.findPermanentDeleteDependencyIds([id]);
  if (dependencyIds.includes(id)) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Article category cannot be permanently deleted while child categories or articles reference it"
    );
  }

  const deleted = await ArticleCategoryRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Article category not found or not deleted"
    );
  }
};

export const deleteArticleCategories = async (
  slugs: string[]
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const normalizedSlugs = [
    ...new Set(slugs.map(normalizeSlugIdentifier).filter(Boolean)),
  ] as string[];
  const categories =
    await ArticleCategoryRepository.findManyBySlugs(normalizedSlugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter(
    (slug) => !foundSlugs.includes(normalizeSlugIdentifier(slug) ?? "")
  );

  const result =
    await ArticleCategoryRepository.softDeleteManyBySlugs(foundSlugs);

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteArticleCategoriesPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const requestedIds = Array.from(new Set(ids));
  const categories =
    await ArticleCategoryRepository.findDeletedManyByIds(requestedIds);
  const foundIds = categories.map((category) => category._id.toString());
  const foundIdSet = new Set(foundIds);
  const notFoundIds = requestedIds.filter((id) => !foundIdSet.has(id));
  const dependencyIds =
    await ArticleCategoryRepository.findPermanentDeleteDependencyIds(foundIds);

  if (dependencyIds.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Article categories cannot be permanently deleted while dependencies reference these IDs: ${dependencyIds.join(", ")}`
    );
  }

  const result = await ArticleCategoryRepository.hardDeleteManyByIds(foundIds);

  return {
    count: result.deletedCount,
    not_found_ids: notFoundIds,
  };
};

export const restoreArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findDeletedById(id);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Article category not found or not deleted"
    );
  }

  const parentIds = category.parent ? [category.parent.toString()] : [];
  const [activeParents, activeConflicts] = await Promise.all([
    ArticleCategoryRepository.findActiveParentsByIds(parentIds),
    ArticleCategoryRepository.findActiveIdentityConflicts([category]),
  ]);
  const { nonRestorableIds } = partitionCategoryRestoreCandidates({
    candidates: [category],
    activeParentIds: activeParents.map((parent) => parent._id.toString()),
    activeConflicts,
  });

  if (nonRestorableIds.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Article category cannot be restored until its parent is active and its name and slug are available"
    );
  }

  try {
    const restored = await ArticleCategoryRepository.restoreById(id);
    if (!restored) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Article category not found or not deleted"
      );
    }

    return restored;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Article category name or slug is already in use"
      );
    }

    throw error;
  }
};

export const restoreArticleCategories = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  non_restorable_ids: string[];
}> => {
  await connectDB();

  const requestedIds = Array.from(new Set(ids));
  const categories =
    await ArticleCategoryRepository.findDeletedManyByIds(requestedIds);
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
    ArticleCategoryRepository.findActiveParentsByIds(parentIds),
    ArticleCategoryRepository.findActiveIdentityConflicts(categories),
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
      const restored = await ArticleCategoryRepository.restoreById(id);
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
