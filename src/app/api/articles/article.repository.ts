import AppQuery from "@/builder/app-query";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import type { ClientSession } from "mongoose";
import ArticleCategory from "../article-categories/article-category.model";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import {
  getPublicArticleFilter,
  getPublicCategoryFilter,
  withPublicCategories,
} from "../public-visibility";
import { Review } from "../reviews/review.model";
import { User } from "../users/user.model";
import Article from "./article.model";
import type { TArticle, TArticleDocument } from "./article.type";

const FILE_SELECT = "_id url filename mimetype size provider metadata";
const PUBLIC_FILE_SELECT =
  "_id url mimetype metadata.width metadata.height metadata.format alt_text caption focal_point dominant_color blur_data_url is_decorative";

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
      match: {
        status: "active",
        lifecycle_state: "ready",
        access: "public",
        purpose: "profile",
      },
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
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "article",
    },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "images",
    match: { status: "active" },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "rich_content.blocks.file",
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "article",
    },
    select: PUBLIC_FILE_SELECT,
  },
];

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter(Boolean).map(toIdString)),
];

export const PUBLIC_ARTICLE_LIST_FIELDS: Array<keyof TArticle> = [
  "name",
  "slug",
  "description",
  "excerpt",
  "thumbnail",
  "tags",
  "category",
  "author",
  "status",
  "is_featured",
  "is_premium",
  "published_at",
  "primary_pillar",
  "secondary_pillars",
  "topics",
  "reading_time_minutes",
  "reading_time_source",
  "body_metadata",
  "updated_at",
];

export const PUBLIC_ARTICLE_DETAIL_FIELDS: Array<keyof TArticle> = [
  ...PUBLIC_ARTICLE_LIST_FIELDS,
  "content",
  "rich_content",
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
  data: Partial<TArticle>,
  session?: ClientSession
): Promise<TArticleDocument> => {
  const created = session
    ? (await Article.create([data], { session }))[0]!
    : await Article.create(data);
  if (session) return created;
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

export const findPublicByIdentifierPopulated = async (identifier: string) => {
  const publicFilter = await getPublicArticleRepositoryFilter();
  const normalized = normalizeSlugIdentifier(identifier);
  if (!normalized) return null;
  const identityFilter = isMongoObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: normalized }] }
    : { $or: [{ slug: normalized }, { "slug_history.slug": normalized }] };

  const direct = await Article.findOne({ $and: [publicFilter, identityFilter] })
    .select(PUBLIC_ARTICLE_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
  if (direct) return direct;

  const aliasTarget = await findSlugTarget("article", normalized);
  if (!aliasTarget) return null;
  return await Article.findOne({ $and: [publicFilter, { _id: aliasTarget }] })
    .select(PUBLIC_ARTICLE_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
};

export const findPublicByIdPopulated = findPublicByIdentifierPopulated;

export const findPublicForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  const publicFilter = await getPublicArticleRepositoryFilter();
  const filter: Record<string, unknown> = { ...publicFilter };
  if (input.ids?.length) filter._id = { $in: input.ids };
  if (typeof input.filters.featured === "boolean") {
    filter.is_featured = input.filters.featured;
  }
  if (typeof input.filters.pillar === "string") {
    filter.primary_pillar = input.filters.pillar;
  }
  const records = await setSoftDeleteScope(Article.find(filter), "active", {
    exact_active: true,
  })
    .select(PUBLIC_ARTICLE_LIST_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .sort({ is_featured: -1, published_at: -1, _id: 1 })
    .limit(Math.min(24, Math.max(1, input.limit)))
    .lean();
  const eligible = records.filter((record) => record.category && record.author);
  if (!input.ids?.length) return eligible;
  const byId = new Map(
    eligible.map((record) => [record._id.toString(), record] as const)
  );
  return input.ids.flatMap((recordId) => {
    const record = byId.get(recordId);
    return record ? [record] : [];
  });
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TArticleDocument | null> => {
  return await setSoftDeleteScope(Article.findById(id), "with_deleted");
};

export const findDeletedById = async (
  id: string
): Promise<TArticleDocument | null> => {
  return await setSoftDeleteScope(Article.findById(id), "only_deleted");
};

export const findManyByIds = async (ids: string[]) => {
  return await Article.find({ _id: { $in: ids } }).lean();
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Article.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findNotRestorableIds = async (
  articles: Array<
    Pick<TArticle, "category" | "author" | "collaborators"> & {
      _id: unknown;
    }
  >
): Promise<string[]> => {
  if (!articles.length) return [];

  const categoryIds = uniqueIds(articles.map(({ category }) => category));
  const userIds = uniqueIds(
    articles.flatMap(({ author, collaborators }) => [
      author,
      ...(collaborators ?? []),
    ])
  );

  const [categories, users] = await Promise.all([
    ArticleCategory.find({
      _id: { $in: categoryIds },
      status: "active",
    })
      .select("_id")
      .lean(),
    User.find({
      _id: { $in: userIds },
      status: "in-progress",
    })
      .select("_id")
      .lean(),
  ]);

  const activeCategoryIds = new Set(
    categories.map(({ _id }) => _id.toString())
  );
  const activeUserIds = new Set(users.map(({ _id }) => _id.toString()));

  return articles
    .filter(({ category, author, collaborators }) => {
      if (!activeCategoryIds.has(toIdString(category))) return true;

      return [author, ...(collaborators ?? [])].some(
        (userId) => !activeUserIds.has(toIdString(userId))
      );
    })
    .map(({ _id }) => toIdString(_id));
};

export const findIdsWithDependentReviews = async (
  ids: string[]
): Promise<string[]> => {
  if (!ids.length) return [];

  const targetIds = await setSoftDeleteScope(
    Review.distinct("target", {
      target_model: "Article",
      target: { $in: ids },
    }),
    "with_deleted"
  );

  return uniqueIds(targetIds);
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TArticleDocument>(
    setSoftDeleteScope(Article.find(), scope),
    queryParams
  );

  return await query
    .search(["name", "description", "excerpt", "topics"])
    .filter([
      "status",
      "category",
      "author",
      "is_featured",
      "primary_pillar",
      "topics",
    ])
    .sort(["name", "status", "published_at"])
    .paginate()
    .fields()
    .tap((articleQuery) => articleQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicDiscoveryFacets = async () => {
  const publicFilter = await getPublicArticleRepositoryFilter();
  const topics = await Article.distinct("topics", publicFilter);
  return {
    topics: Array.from(
      new Set(
        topics
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().slice(0, 96))
          .filter(Boolean)
      )
    )
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 60),
  };
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
    .search(["name", "description", "excerpt", "topics"])
    .filter([
      "status",
      "category",
      "author",
      "is_featured",
      "primary_pillar",
      "topics",
    ])
    .sort(["name", "status", "published_at", "is_featured", "_id"])
    .paginate()
    .fields(PUBLIC_ARTICLE_LIST_FIELDS)
    .tap((articleQuery) => articleQuery.populate(PUBLIC_POPULATE_FIELDS).lean())
    .execute();
};

export const updateMany = async (ids: string[], payload: Partial<TArticle>) => {
  return await Article.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const setPublishedAtIfMissing = async (ids: string[], now: Date) =>
  Article.updateMany(
    {
      _id: { $in: ids },
      $or: [{ published_at: { $exists: false } }, { published_at: null }],
    },
    { $set: { published_at: now } }
  );

export const replaceRichContentMany = async (
  items: Array<
    Pick<
      TArticle,
      | "content"
      | "rich_content"
      | "body_metadata"
      | "reading_time_minutes"
      | "reading_time_source"
    > & { id: string }
  >
) => {
  if (!items.length) return;

  await Article.bulkWrite(
    items.map(
      ({
        id,
        content,
        rich_content,
        body_metadata,
        reading_time_minutes,
        reading_time_source,
      }) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              content,
              rich_content,
              body_metadata,
              reading_time_minutes,
              reading_time_source,
            },
          },
        },
      })
    )
  );
};

export const softDeleteMany = async (ids: string[]) => {
  return await Article.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await Article.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    Article.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const restoreMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Article.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(
    Article.findByIdAndDelete(id),
    "only_deleted"
  );
};

export const hardDeleteMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Article.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
