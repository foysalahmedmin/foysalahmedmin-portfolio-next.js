import AppQuery from '@/builder/app-query';
import { getPublicCategoryFilter } from '../public-visibility';
import ArticleCategory from './article-category.model';
import type {
  TArticleCategory,
  TArticleCategoryDocument,
} from './article-category.type';

const POPULATE_PARENT = { path: 'parent', select: '_id name' };
const PUBLIC_POPULATE_PARENT = {
  path: 'parent',
  match: { status: 'active' },
  select: '_id name slug',
};
const PUBLIC_FIELDS: Array<keyof TArticleCategory> = [
  'sequence',
  'icon',
  'name',
  'slug',
  'description',
  'tags',
  'parent',
  'layout',
  'created_at',
  'updated_at',
];

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

export const findPublicByIdPopulated = async (id: string) => {
  return await ArticleCategory.findOne({
    _id: id,
    ...getPublicCategoryFilter(),
  })
    .select(PUBLIC_FIELDS.join(' '))
    .populate(PUBLIC_POPULATE_PARENT)
    .lean();
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

export const findPublicBySlugPopulated = async (slug: string) => {
  return await ArticleCategory.findOne({
    slug,
    ...getPublicCategoryFilter(),
  })
    .select(PUBLIC_FIELDS.join(' '))
    .populate(PUBLIC_POPULATE_PARENT)
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

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>,
) => {
  const query = new AppQuery<TArticleCategoryDocument>(
    ArticleCategory.find(getPublicCategoryFilter()),
    { ...queryParams, status: 'active' },
  );

  return await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'parent'])
    .sort(['sequence', 'name'])
    .paginate()
    .fields(PUBLIC_FIELDS)
    .tap((categoryQuery) =>
      categoryQuery.populate(PUBLIC_POPULATE_PARENT).lean(),
    )
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
