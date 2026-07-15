import AppQuery from '@/builder/app-query';
import Article from './article.model';
import type { TArticle, TArticleDocument } from './article.type';

const FILE_SELECT = '_id url filename mimetype size provider metadata';

const POPULATE_FIELDS = [
  {
    path: 'author',
    select: '_id name email image',
    populate: { path: 'image', select: FILE_SELECT },
  },
  { path: 'category', select: '_id name slug' },
  { path: 'collaborators', select: '_id name email' },
  { path: 'thumbnail', select: FILE_SELECT },
  { path: 'images', select: FILE_SELECT },
];

const PUBLIC_POPULATE_FIELDS = [
  {
    path: 'author',
    select: '_id name image',
    populate: { path: 'image', select: FILE_SELECT },
  },
  { path: 'category', select: '_id name slug' },
  { path: 'collaborators', select: '_id name' },
  { path: 'thumbnail', select: FILE_SELECT },
  { path: 'images', select: FILE_SELECT },
];

const getPublicArticleFilter = () => {
  const now = new Date();
  return {
    status: 'published' as const,
    published_at: { $lte: now },
    $or: [
      { expired_at: { $exists: false } },
      { expired_at: null },
      { expired_at: { $gt: now } },
    ],
  };
};

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

export const findPublicByIdPopulated = async (id: string) => {
  return await Article.findOne({ _id: id, ...getPublicArticleFilter() })
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
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

  return await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'published_at'])
    .paginate()
    .fields()
    .tap((articleQuery) => articleQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>,
) => {
  const query = new AppQuery<TArticleDocument>(
    Article.find(getPublicArticleFilter()),
    {
      ...queryParams,
      status: 'published',
    },
  );

  return await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'published_at'])
    .paginate()
    .fields()
    .tap((articleQuery) =>
      articleQuery.populate(PUBLIC_POPULATE_FIELDS).lean(),
    )
    .execute();
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
