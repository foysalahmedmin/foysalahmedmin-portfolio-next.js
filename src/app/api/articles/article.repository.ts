import AppQuery from "@/builder/app-query";
import ArticleCategory from "../article-categories/article-category.model";
import {
  getPublicArticleFilter,
  getPublicCategoryFilter,
  withPublicCategories,
} from "../public-visibility";
import Article from "./article.model";
import type { TArticle, TArticleDocument } from "./article.type";

const FILE_SELECT = "_id url filename mimetype size provider metadata";
const PUBLIC_FILE_SELECT =
  "_id url mimetype metadata.width metadata.height metadata.format";

const POPULATE_FIELDS = [
  {
    path: "author",
    select: "_id name email image",
    populate: { path: "image", select: FILE_SELECT },
  },
  { path: "category", select: "_id name slug" },
  { path: "collaborators", select: "_id name email" },
  { path: "thumbnail", select: FILE_SELECT },
  { path: "images", select: FILE_SELECT },
];

const PUBLIC_POPULATE_FIELDS = [
  {
    path: "author",
    select: "_id name image",
    match: { status: "in-progress" },
    populate: {
      path: "image",
      match: { status: "active" },
      select: PUBLIC_FILE_SELECT,
    },
  },
  {
    path: "category",
    match: { status: "active" },
    select: "_id name slug",
  },
  {
    path: "thumbnail",
    match: { status: "active" },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "images",
    match: { status: "active" },
    select: PUBLIC_FILE_SELECT,
  },
];

export const PUBLIC_ARTICLE_LIST_FIELDS: Array<keyof TArticle> = [
  "name",
  "description",
  "thumbnail",
  "tags",
  "category",
  "author",
  "status",
  "is_featured",
  "is_premium",
  "published_at",
];

export const PUBLIC_ARTICLE_DETAIL_FIELDS: Array<keyof TArticle> = [
  ...PUBLIC_ARTICLE_LIST_FIELDS,
  "content",
  "images",
  "expired_at",
  "layout",
];

const getPublicArticleRepositoryFilter = async () => {
  const categories = await ArticleCategory.find(getPublicCategoryFilter())
    .select("_id")
    .lean();

  return withPublicCategories(
    getPublicArticleFilter(),
    categories.map((category) => category._id)
  );
};

export const create = async (
  data: Partial<TArticle>
): Promise<TArticleDocument> => {
  const created = await Article.create(data);
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (
  id: string
): Promise<TArticleDocument | null> => {
  return await Article.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await Article.findById(id).populate(POPULATE_FIELDS).lean();
};

export const findPublicByIdPopulated = async (id: string) => {
  const publicFilter = await getPublicArticleRepositoryFilter();

  return await Article.findOne({ _id: id, ...publicFilter })
    .select(PUBLIC_ARTICLE_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TArticleDocument | null> => {
  return await Article.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await Article.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TArticleDocument>(Article.find(), queryParams);

  return await query
    .search(["name", "description"])
    .filter(["status", "category", "author", "is_featured"])
    .sort(["name", "status", "published_at"])
    .paginate()
    .fields()
    .tap((articleQuery) => articleQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>
) => {
  const publicFilter = await getPublicArticleRepositoryFilter();
  const query = new AppQuery<TArticleDocument>(Article.find(publicFilter), {
    ...queryParams,
    status: "published",
  });

  return await query
    .search(["name", "description"])
    .filter(["status", "category", "author", "is_featured"])
    .sort(["name", "status", "published_at"])
    .paginate()
    .fields(PUBLIC_ARTICLE_LIST_FIELDS)
    .tap((articleQuery) => articleQuery.populate(PUBLIC_POPULATE_FIELDS).lean())
    .execute();
};

export const updateMany = async (ids: string[], payload: Partial<TArticle>) => {
  return await Article.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  await Article.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await Article.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true }
  );
};

export const restoreMany = async (ids: string[]) => {
  return await Article.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false }
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
