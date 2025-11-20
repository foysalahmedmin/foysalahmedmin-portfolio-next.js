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

export const getArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategory.findById(id)
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

export const updateArticleCategoryById = async (
  id: string,
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

  const category = await ArticleCategory.findById(id);

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  // Check if new slug conflicts with existing category
  if (payload.slug) {
    const existingCategory = await ArticleCategory.findOne({ slug: payload.slug });
    if (existingCategory && existingCategory._id.toString() !== id) {
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
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const categories = await ArticleCategory.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  const result = await ArticleCategory.updateMany(
    { slug: { $in: foundSlugs } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
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

export const deleteArticleCategoryById = async (id: string) => {
  await connectDB();

  const category = await ArticleCategory.findById(id);

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await category.softDelete();

  return null;
};

export const deleteArticleCategoryPermanent = async (slug: string): Promise<void> => {
  await connectDB();
  const category = await ArticleCategory.findOne({ slug }).setOptions({ bypassDeleted: true });
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await ArticleCategory.findByIdAndDelete(category._id);
};

export const deleteArticleCategoryPermanentById = async (id: string): Promise<void> => {
  await connectDB();
  const category = await ArticleCategory.findById(id).setOptions({ bypassDeleted: true });
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found');
  }

  await ArticleCategory.findByIdAndDelete(id);
};

export const deleteArticleCategories = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const categories = await ArticleCategory.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ArticleCategory.updateMany(
    { slug: { $in: foundSlugs } },
    { is_deleted: true },
  );

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteArticleCategoriesPermanent = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const categories = await ArticleCategory.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = categories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await ArticleCategory.deleteMany({ slug: { $in: foundSlugs } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const restoreArticleCategory = async (slug: string) => {
  await connectDB();
  const category = await ArticleCategory.findOneAndUpdate(
    { slug, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found or not deleted');
  }

  return category;
};

export const restoreArticleCategoryById = async (id: string) => {
  await connectDB();
  const category = await ArticleCategory.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article category not found or not deleted');
  }

  return category;
};

export const restoreArticleCategories = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const result = await ArticleCategory.updateMany(
    { slug: { $in: slugs }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredCategories = await ArticleCategory.find({ slug: { $in: slugs } }).lean();
  const restoredSlugs = restoredCategories.map((cat) => cat.slug);
  const notFoundSlugs = slugs.filter((slug) => !restoredSlugs.includes(slug));

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};
