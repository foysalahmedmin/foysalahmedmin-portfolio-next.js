import AppQuery from "@/builder/app-query";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession } from "mongoose";
import Article from "../articles/article.model";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import { getPublicCategoryFilter } from "../public-visibility";
import ArticleCategory from "./article-category.model";
import type {
  TArticleCategory,
  TArticleCategoryDocument,
} from "./article-category.type";

const POPULATE_PARENT = { path: "parent", select: "_id name" };
const PUBLIC_POPULATE_PARENT = {
  path: "parent",
  match: { status: "active" },
  select: "_id name slug",
};
const PUBLIC_FIELDS: Array<keyof TArticleCategory> = [
  "sequence",
  "icon",
  "name",
  "slug",
  "description",
  "tags",
  "parent",
  "layout",
  "created_at",
  "updated_at",
];

export const create = async (
  data: Partial<TArticleCategory>,
  session?: ClientSession
): Promise<TArticleCategoryDocument> => {
  return session
    ? (await ArticleCategory.create([data], { session }))[0]!
    : await ArticleCategory.create(data);
};

export const findById = async (
  id: string
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
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_PARENT)
    .lean();
};

export const findPublicByIdentifierPopulated = async (identifier: string) => {
  const slug = normalizeSlugIdentifier(identifier);
  if (!slug) return null;
  const identityFilter = isMongoObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug }] }
    : { $or: [{ slug }, { "slug_history.slug": slug }] };
  const direct = await ArticleCategory.findOne({
    $and: [getPublicCategoryFilter(), identityFilter],
  })
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_PARENT)
    .lean();
  if (direct) return direct;

  const aliasTarget = await findSlugTarget("article_category", slug);
  return aliasTarget ? await findPublicByIdPopulated(aliasTarget) : null;
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TArticleCategoryDocument | null> => {
  return await setSoftDeleteScope(ArticleCategory.findById(id), "with_deleted");
};

export const findParentHierarchyNodeById = async (id: string) => {
  return await setSoftDeleteScope(ArticleCategory.findById(id), "with_deleted")
    .select("_id parent status +is_deleted")
    .lean();
};

export const findDeletedById = async (
  id: string
): Promise<TArticleCategoryDocument | null> => {
  return await setSoftDeleteScope(ArticleCategory.findById(id), "only_deleted");
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    ArticleCategory.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findActiveParentsByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];

  return await ArticleCategory.find({
    _id: { $in: ids },
    status: "active",
  })
    .select("_id")
    .lean();
};

export const findActiveIdentityConflicts = async (
  categories: Array<{ name: string; slug: string }>
) => {
  if (categories.length === 0) return [];

  return await ArticleCategory.find({
    $or: [
      { name: { $in: categories.map((category) => category.name) } },
      { slug: { $in: categories.map((category) => category.slug) } },
    ],
  })
    .select("_id name slug")
    .lean();
};

export const findPermanentDeleteDependencyIds = async (ids: string[]) => {
  if (ids.length === 0) return [];

  const [childCategories, articles] = await Promise.all([
    setSoftDeleteScope(
      ArticleCategory.find({ parent: { $in: ids } }).select("parent"),
      "with_deleted"
    ).lean(),
    setSoftDeleteScope(
      Article.find({ category: { $in: ids } }).select("category"),
      "with_deleted"
    ).lean(),
  ]);

  return Array.from(
    new Set([
      ...childCategories.map((category) => category.parent?.toString()),
      ...articles.map((article) => article.category.toString()),
    ])
  ).filter((id): id is string => Boolean(id));
};

export const findBySlug = async (
  slug: string
): Promise<TArticleCategoryDocument | null> => {
  return await ArticleCategory.findOne({
    $or: [{ slug }, { "slug_history.slug": slug }],
  });
};

export const findBySlugPopulated = async (slug: string) => {
  return await ArticleCategory.findOne({
    $or: [{ slug }, { "slug_history.slug": slug }],
  })
    .populate(POPULATE_PARENT)
    .lean();
};

export const findPublicBySlugPopulated = async (slug: string) => {
  return await ArticleCategory.findOne({
    $and: [
      getPublicCategoryFilter(),
      { $or: [{ slug }, { "slug_history.slug": slug }] },
    ],
  })
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_PARENT)
    .lean();
};

export const findManyBySlugs = async (slugs: string[]) => {
  return await ArticleCategory.find({ slug: { $in: slugs } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TArticleCategoryDocument>(
    setSoftDeleteScope(ArticleCategory.find(), scope),
    queryParams
  );

  return await query
    .search(["name", "slug", "description"])
    .filter(["status", "parent"])
    .sort(["sequence", "name"])
    .paginate()
    .fields()
    .execute();
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>
) => {
  const query = new AppQuery<TArticleCategoryDocument>(
    ArticleCategory.find(getPublicCategoryFilter()),
    { ...queryParams, status: "active" }
  );

  return await query
    .search(["name", "slug", "description"])
    .filter(["status", "parent"])
    .sort(["sequence", "name"])
    .paginate()
    .fields(PUBLIC_FIELDS)
    .tap((categoryQuery) =>
      categoryQuery.populate(PUBLIC_POPULATE_PARENT).lean()
    )
    .execute();
};

export const updateManyBySlugs = async (
  slugs: string[],
  payload: Partial<TArticleCategory>
) => {
  return await ArticleCategory.updateMany(
    { slug: { $in: slugs } },
    { ...payload }
  );
};

export const softDeleteManyBySlugs = async (slugs: string[]) => {
  return await ArticleCategory.updateMany(
    { slug: { $in: slugs } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await ArticleCategory.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    ArticleCategory.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(
    ArticleCategory.findByIdAndDelete(id),
    "only_deleted"
  );
};

export const hardDeleteManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    ArticleCategory.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
