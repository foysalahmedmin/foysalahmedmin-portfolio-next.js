import AppQuery from '@/builder/app-query';
import ArticleCategory from './article-category.model';
import type {
  TArticleCategory,
  TArticleCategoryDocument,
} from './article-category.type';

const POPULATE_PARENT = { path: 'parent', select: '_id name' };

export const create = async (
  data: Partial<TArticleCategory>,
): Promise<TArticleCategoryDocument> => {
  return await ArticleCategory.create(data);
};

export const findById = async (
  id: string,
): Promise<TArticleCategoryDocument | null> => {
  return await ArticleCategory.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await ArticleCategory.findById(id).populate(POPULATE_PARENT).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TArticleCategoryDocument | null> => {
  return await ArticleCategory.findById(id).setOptions({ bypassDeleted: true });
};

export const findBySlug = async (
  slug: string,
): Promise<TArticleCategoryDocument | null> => {
  return await ArticleCategory.findOne({ slug });
};

export const findBySlugPopulated = async (slug: string) => {
  return await ArticleCategory.findOne({ slug })
    .populate(POPULATE_PARENT)
    .lean();
};

export const findBySlugWithDeleted = async (
  slug: string,
): Promise<TArticleCategoryDocument | null> => {
  return await ArticleCategory.findOne({ slug }).setOptions({
    bypassDeleted: true,
  });
};

export const findManyBySlugs = async (slugs: string[]) => {
  return await ArticleCategory.find({ slug: { $in: slugs } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TArticleCategoryDocument>(
    ArticleCategory.find(),
    queryParams,
  );

  return await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'parent'])
    .sort(['sequence', 'name'])
    .paginate()
    .fields()
    .execute();
};

export const updateManyBySlugs = async (
  slugs: string[],
  payload: Partial<TArticleCategory>,
) => {
  return await ArticleCategory.updateMany(
    { slug: { $in: slugs } },
    { ...payload },
  );
};

export const softDeleteManyBySlugs = async (slugs: string[]) => {
  await ArticleCategory.updateMany(
    { slug: { $in: slugs } },
    { is_deleted: true },
  );
};

export const restoreBySlug = async (slug: string) => {
  return await ArticleCategory.findOneAndUpdate(
    { slug, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );
};

export const restoreById = async (id: string) => {
  return await ArticleCategory.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );
};

export const restoreManyBySlugs = async (slugs: string[]) => {
  return await ArticleCategory.updateMany(
    { slug: { $in: slugs }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await ArticleCategory.findByIdAndDelete(id);
};

export const hardDeleteManyBySlugs = async (slugs: string[]) => {
  await ArticleCategory.deleteMany({ slug: { $in: slugs } }).setOptions({
    bypassDeleted: true,
  });
};
