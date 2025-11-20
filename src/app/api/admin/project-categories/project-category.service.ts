import connectDB from '@/lib/db';
import ProjectCategory from './project-category.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TProjectCategoryDocument } from './project-category.type';

export const getProjectCategories = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TProjectCategoryDocument>(
    ProjectCategory.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'parent'])
    .sort(['sequence', 'name'])
    .paginate()
    .fields()
    .execute();

  return result;
};

export const getProjectCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ProjectCategory.findOne({ slug })
    .populate('parent', 'name slug')
    .lean();

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
  thumbnail?: string;
  parent?: string | null;
  status?: 'active' | 'inactive';
  tags?: string[];
  layout?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}) => {
  await connectDB();

  const existingCategory = await ProjectCategory.findOne({ slug: payload.slug });

  if (existingCategory) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Project category with this slug already exists',
    );
  }

  const category = await ProjectCategory.create({
    ...payload,
    parent: payload.parent || null,
    status: payload.status || 'active',
    tags: payload.tags || [],
    layout: payload.layout || 'default',
  });

  return category;
};

export const updateProjectCategoryBySlug = async (
  slug: string,
  payload: Partial<{
    name: string;
    slug: string;
    sequence: number;
    description: string;
    icon: string;
    thumbnail: string;
    parent: string | null;
    status: 'active' | 'inactive';
    tags: string[];
    layout: string;
    seo: {
      title?: string;
      description?: string;
      keywords?: string[];
    };
  }>,
) => {
  await connectDB();

  const category = await ProjectCategory.findOne({ slug });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  // Check if new slug conflicts with existing category
  if (payload.slug && payload.slug !== slug) {
    const existingCategory = await ProjectCategory.findOne({ slug: payload.slug });
    if (existingCategory) {
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

export const deleteProjectCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ProjectCategory.findOne({ slug });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project category not found');
  }

  await category.softDelete();

  return null;
};

