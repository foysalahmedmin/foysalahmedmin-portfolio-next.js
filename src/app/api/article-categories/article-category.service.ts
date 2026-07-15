import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { withPublicPagination } from '@/utils/public-query';
import httpStatus from 'http-status';
import * as ArticleCategoryRepository from './article-category.repository';

export const getArticleCategories = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ArticleCategoryRepository.findPaginated(queryParams);
};

export const getPublicArticleCategories = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ArticleCategoryRepository.findPublicPaginated(
    withPublicPagination(queryParams, { defaultLimit: 50 }),
  );
};

export const getArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlugPopulated(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  return category;
};

export const getPublicArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category =
    await ArticleCategoryRepository.findPublicBySlugPopulated(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  return category;
};

export const getArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  return category;
};

export const getPublicArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findPublicByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
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
  status?: 'active' | 'inactive';
  tags?: string[];
  layout?: string;
}) => {
  await connectDB();

  const existing = await ArticleCategoryRepository.findBySlug(payload.slug);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Article category with this slug already exists',
    );
  }

  return await ArticleCategoryRepository.create({
    ...payload,
    parent: payload.parent || null,
    status: payload.status || 'active',
    tags: payload.tags || [],
    layout: payload.layout || 'default',
  } as never);
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
    status: 'active' | 'inactive';
    tags: string[];
    layout: string;
  }>,
) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlug(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  if (payload.slug && payload.slug !== slug) {
    const existing = await ArticleCategoryRepository.findBySlug(payload.slug);
    if (existing) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Article category with this slug already exists',
      );
    }
  }

  Object.assign(category, payload);
  await category.save();

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
    status: 'active' | 'inactive';
    tags: string[];
    layout: string;
  }>,
) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  if (payload.slug) {
    const existing = await ArticleCategoryRepository.findBySlug(payload.slug);
    if (existing && existing._id.toString() !== id) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Article category with this slug already exists',
      );
    }
  }

  Object.assign(category, payload);
  await category.save();

  return category;
};

export const updateArticleCategories = async (
  slugs: string[],
  payload: Partial<{
    status: 'active' | 'inactive';
    parent: string | null;
  }>,
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ArticleCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  const result = await ArticleCategoryRepository.updateManyBySlugs(
    foundSlugs,
    payload as never,
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlug(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await category.softDelete();
  return null;
};

export const deleteArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await category.softDelete();
  return null;
};

export const deleteArticleCategoryPermanent = async (
  slug: string,
): Promise<void> => {
  await connectDB();

  const category = await ArticleCategoryRepository.findBySlugWithDeleted(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await ArticleCategoryRepository.hardDeleteById(category._id.toString());
};

export const deleteArticleCategoryPermanentById = async (
  id: string,
): Promise<void> => {
  await connectDB();

  const category = await ArticleCategoryRepository.findByIdWithDeleted(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await ArticleCategoryRepository.hardDeleteById(id);
};

export const deleteArticleCategories = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ArticleCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ArticleCategoryRepository.softDeleteManyBySlugs(foundSlugs);

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteArticleCategoriesPermanent = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ArticleCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ArticleCategoryRepository.hardDeleteManyBySlugs(foundSlugs);

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const restoreArticleCategory = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.restoreBySlug(slug);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Article category not found or not deleted',
    );
  }

  return category;
};

export const restoreArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategoryRepository.restoreById(id);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Article category not found or not deleted',
    );
  }

  return category;
};

export const restoreArticleCategories = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const result = await ArticleCategoryRepository.restoreManyBySlugs(slugs);

  const restored = await ArticleCategoryRepository.findManyBySlugs(slugs);
  const restoredSlugs = restored.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !restoredSlugs.includes(slug));

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};
