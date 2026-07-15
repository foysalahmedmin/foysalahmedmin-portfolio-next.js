import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { withPublicPagination } from '@/utils/public-query';
import httpStatus from 'http-status';
import * as ProjectCategoryRepository from './project-category.repository';

export const getProjectCategories = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ProjectCategoryRepository.findPaginated(queryParams);
};

export const getPublicProjectCategories = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ProjectCategoryRepository.findPublicPaginated(
    withPublicPagination(queryParams, { defaultLimit: 50 }),
  );
};

export const getProjectCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.findBySlugPopulated(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  return category;
};

export const getPublicProjectCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category =
    await ProjectCategoryRepository.findPublicBySlugPopulated(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  return category;
};

export const getProjectCategoryById = async (id: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.findByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  return category;
};

export const getPublicProjectCategoryById = async (id: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.findPublicByIdPopulated(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  return category;
};

export const createProjectCategory = async (payload: {
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

  const existing = await ProjectCategoryRepository.findBySlug(payload.slug);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Project category with this slug already exists',
    );
  }

  return await ProjectCategoryRepository.create({
    ...payload,
    parent: payload.parent || null,
    status: payload.status || 'active',
    tags: payload.tags || [],
    layout: payload.layout || 'default',
  } as never);
};

export const updateProjectCategoryBySlug = async (
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

  const category = await ProjectCategoryRepository.findBySlug(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  if (payload.slug && payload.slug !== slug) {
    const existing = await ProjectCategoryRepository.findBySlug(payload.slug);
    if (existing) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Project category with this slug already exists',
      );
    }
  }

  Object.assign(category, payload);
  await category.save();

  return category;
};

export const updateProjectCategoryById = async (
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

  const category = await ProjectCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  if (payload.slug) {
    const existing = await ProjectCategoryRepository.findBySlug(payload.slug);
    if (existing && existing._id.toString() !== id) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Project category with this slug already exists',
      );
    }
  }

  Object.assign(category, payload);
  await category.save();

  return category;
};

export const updateProjectCategories = async (
  slugs: string[],
  payload: Partial<{
    status: 'active' | 'inactive';
    parent: string | null;
  }>,
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ProjectCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  const result = await ProjectCategoryRepository.updateManyBySlugs(
    foundSlugs,
    payload as never,
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteProjectCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.findBySlug(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  await category.softDelete();
  return null;
};

export const deleteProjectCategoryById = async (id: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  await category.softDelete();
  return null;
};

export const deleteProjectCategoryPermanent = async (
  slug: string,
): Promise<void> => {
  await connectDB();

  const category = await ProjectCategoryRepository.findBySlugWithDeleted(slug);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  await ProjectCategoryRepository.hardDeleteById(category._id.toString());
};

export const deleteProjectCategoryPermanentById = async (
  id: string,
): Promise<void> => {
  await connectDB();

  const category = await ProjectCategoryRepository.findByIdWithDeleted(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  await ProjectCategoryRepository.hardDeleteById(id);
};

export const deleteProjectCategories = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ProjectCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ProjectCategoryRepository.softDeleteManyBySlugs(foundSlugs);

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteProjectCategoriesPermanent = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const categories = await ProjectCategoryRepository.findManyBySlugs(slugs);
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ProjectCategoryRepository.hardDeleteManyBySlugs(foundSlugs);

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const restoreProjectCategory = async (slug: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.restoreBySlug(slug);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Project category not found or not deleted',
    );
  }

  return category;
};

export const restoreProjectCategoryById = async (id: string) => {
  await connectDB();

  const category = await ProjectCategoryRepository.restoreById(id);
  if (!category) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Project category not found or not deleted',
    );
  }

  return category;
};

export const restoreProjectCategories = async (
  slugs: string[],
): Promise<{ count: number; not_found_slugs: string[] }> => {
  await connectDB();

  const result = await ProjectCategoryRepository.restoreManyBySlugs(slugs);

  const restored = await ProjectCategoryRepository.findManyBySlugs(slugs);
  const restoredSlugs = restored.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !restoredSlugs.includes(slug));

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};
