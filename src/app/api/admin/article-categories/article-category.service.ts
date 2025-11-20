import connectDB from '@/lib/db';
import ArticleCategory from './article-category.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TArticleCategoryDocument } from './article-category.type';

export const getArticleCategories = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TArticleCategoryDocument>(
    ArticleCategory.find(),
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

export const getArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategory.findOne({ slug })
    .populate('parent', 'name slug')
    .lean();

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

  const existingCategory = await ArticleCategory.findOne({ slug: payload.slug });

  if (existingCategory) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Article category with this slug already exists',
    );
  }

  const category = await ArticleCategory.create({
    ...payload,
    parent: payload.parent || null,
    status: payload.status || 'active',
    tags: payload.tags || [],
    layout: payload.layout || 'default',
  });

  return category;
};

export const updateArticleCategoryBySlug = async (
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

  const category = await ArticleCategory.findOne({ slug });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  // Check if new slug conflicts with existing category
  if (payload.slug && payload.slug !== slug) {
    const existingCategory = await ArticleCategory.findOne({ slug: payload.slug });
    if (existingCategory) {
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

export const deleteArticleCategoryBySlug = async (slug: string) => {
  await connectDB();

  const category = await ArticleCategory.findOne({ slug });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await category.softDelete();

  return null;
};

