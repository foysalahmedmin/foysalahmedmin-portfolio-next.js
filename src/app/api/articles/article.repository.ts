import AppQuery from '@/builder/app-query';
import Article from './article.model';
import type { TArticle, TArticleDocument } from './article.type';

const POPULATE_FIELDS = [
  { path: 'author', select: '_id name email image' },
  { path: 'category', select: '_id name' },
  { path: 'collaborators', select: '_id name email' },
];

export const create = async (
  data: Partial<TArticle>,
): Promise<TArticleDocument> => {
  const created = await Article.create(data);
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (
  id: string,
): Promise<TArticleDocument | null> => {
  return await Article.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await Article.findById(id).populate(POPULATE_FIELDS).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TArticleDocument | null> => {
  return await Article.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await Article.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TArticleDocument>(Article.find(), queryParams);

  const result = await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'published_at'])
    .paginate()
    .fields()
    .execute();

  const populated = await Promise.all(
    result.data.map(async (article) => {
      return await Article.findById((article as { _id: unknown })._id)
        .populate(POPULATE_FIELDS)
        .lean();
    }),
  );

  return {
    data: populated,
    meta: result.meta,
  };
};

export const updateMany = async (
  ids: string[],
  payload: Partial<TArticle>,
) => {
  return await Article.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  await Article.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await Article.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );
};

export const restoreMany = async (ids: string[]) => {
  return await Article.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await Article.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await Article.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
