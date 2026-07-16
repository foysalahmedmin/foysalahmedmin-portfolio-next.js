import AppQuery from "@/builder/app-query";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import ArticleCategory from "../article-categories/article-category.model";
import Article from "../articles/article.model";
import ProjectCategory from "../project-categories/project-category.model";
import Project from "../projects/project.model";
import {
  getPublicArticleFilter,
  getPublicCategoryFilter,
  getPublicProjectFilter,
  getPublicReviewFilter,
  withPublicCategories,
} from "../public-visibility";
import { User } from "../users/user.model";
import { Review } from "./review.model";
import type { TReview, TReviewDocument } from "./review.type";

const POPULATE_FIELDS = [
  { path: "author", select: "_id name email image" },
  { path: "target", select: "_id name" },
];
const PUBLIC_FILE_SELECT =
  "_id url mimetype metadata.width metadata.height metadata.format";
const PUBLIC_POPULATE_FIELDS = [
  {
    path: "author",
    match: { status: "in-progress" },
    select: "_id name image",
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
  { path: "target", select: "_id name" },
];
const PUBLIC_FIELDS: Array<keyof TReview> = [
  "author",
  "target",
  "target_model",
  "rating",
  "review",
  "is_edited",
  "edited_at",
  "created_at",
  "updated_at",
];

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const getReviewKey = (
  review: Pick<TReview, "author" | "target" | "target_model">
): string =>
  `${review.target_model}:${toIdString(review.target)}:${toIdString(review.author)}`;

const getPublicTargetConditions = async () => {
  const [articleCategories, projectCategories] = await Promise.all([
    ArticleCategory.find(getPublicCategoryFilter()).select("_id").lean(),
    ProjectCategory.find(getPublicCategoryFilter()).select("_id").lean(),
  ]);
  const [articles, projects] = await Promise.all([
    Article.find(
      withPublicCategories(
        getPublicArticleFilter(),
        articleCategories.map((category) => category._id)
      )
    )
      .select("_id")
      .lean(),
    Project.find(
      withPublicCategories(
        getPublicProjectFilter(),
        projectCategories.map((category) => category._id)
      )
    )
      .select("_id")
      .lean(),
  ]);

  return [
    {
      target_model: "Article" as const,
      target: { $in: articles.map((article) => article._id) },
    },
    {
      target_model: "Project" as const,
      target: { $in: projects.map((project) => project._id) },
    },
  ];
};

export const create = async (
  data: Partial<TReview>
): Promise<TReviewDocument> => {
  const created = await Review.create(data);
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (id: string): Promise<TReviewDocument | null> => {
  return await Review.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await Review.findById(id).populate(POPULATE_FIELDS).lean();
};

export const findPublicByIdPopulated = async (id: string) => {
  const publicTargetConditions = await getPublicTargetConditions();

  return await Review.findOne({
    _id: id,
    ...getPublicReviewFilter(publicTargetConditions),
  })
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TReviewDocument | null> => {
  return await setSoftDeleteScope(Review.findById(id), "with_deleted");
};

export const findDeletedById = async (
  id: string
): Promise<TReviewDocument | null> => {
  return await setSoftDeleteScope(Review.findById(id), "only_deleted");
};

export const findManyByIds = async (ids: string[]) => {
  return await Review.find({ _id: { $in: ids } }).lean();
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Review.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findNotRestorableIds = async (
  reviews: Array<
    Pick<TReview, "author" | "target" | "target_model"> & { _id: unknown }
  >
): Promise<string[]> => {
  if (!reviews.length) return [];

  const authorIds = [
    ...new Set(reviews.map(({ author }) => toIdString(author))),
  ];
  const articleIds = [
    ...new Set(
      reviews
        .filter(({ target_model }) => target_model === "Article")
        .map(({ target }) => toIdString(target))
    ),
  ];
  const projectIds = [
    ...new Set(
      reviews
        .filter(({ target_model }) => target_model === "Project")
        .map(({ target }) => toIdString(target))
    ),
  ];
  const uniqueKeys = new Map(
    reviews.map((review) => [
      getReviewKey(review),
      {
        author: review.author,
        target: review.target,
        target_model: review.target_model,
      },
    ])
  );

  const [authors, articles, projects, activeConflicts] = await Promise.all([
    User.find({
      _id: { $in: authorIds },
      status: "in-progress",
    })
      .select("_id")
      .lean(),
    Article.find({ _id: { $in: articleIds } })
      .select("_id")
      .lean(),
    Project.find({ _id: { $in: projectIds } })
      .select("_id")
      .lean(),
    Review.find({ $or: [...uniqueKeys.values()] })
      .select("author target target_model")
      .lean(),
  ]);

  const activeAuthorIds = new Set(authors.map(({ _id }) => _id.toString()));
  const activeArticleIds = new Set(articles.map(({ _id }) => _id.toString()));
  const activeProjectIds = new Set(projects.map(({ _id }) => _id.toString()));
  const activeReviewKeys = new Set(activeConflicts.map(getReviewKey));
  const candidateKeyCounts = reviews.reduce((counts, review) => {
    const key = getReviewKey(review);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return reviews
    .filter((review) => {
      const targetId = toIdString(review.target);
      const targetIsActive =
        review.target_model === "Article"
          ? activeArticleIds.has(targetId)
          : activeProjectIds.has(targetId);
      const key = getReviewKey(review);

      return (
        !activeAuthorIds.has(toIdString(review.author)) ||
        !targetIsActive ||
        activeReviewKeys.has(key) ||
        (candidateKeyCounts.get(key) ?? 0) > 1
      );
    })
    .map(({ _id }) => toIdString(_id));
};

export const areReferencesActive = async (
  authorId: string,
  targetId: string,
  targetModel: "Project" | "Article"
): Promise<boolean> => {
  const [author, target] = await Promise.all([
    User.exists({ _id: authorId, status: "in-progress" }),
    targetModel === "Article"
      ? Article.exists({ _id: targetId })
      : Project.exists({ _id: targetId }),
  ]);

  return Boolean(author && target);
};

export const findExisting = async (
  authorId: string,
  targetId: string,
  targetModel: string
) => {
  return await Review.findOne({
    author: authorId,
    target: targetId,
    target_model: targetModel,
  });
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TReviewDocument>(
    setSoftDeleteScope(Review.find(), scope),
    queryParams
  );

  const result = await query
    .search(["review"])
    .filter(["status", "target", "target_model", "rating", "author"])
    .sort(["created_at", "rating"])
    .paginate()
    .fields()
    .execute();

  const populated = await Promise.all(
    result.data.map(async (review) => {
      return await setSoftDeleteScope(
        Review.findById((review as { _id: unknown })._id),
        scope
      )
        .populate(POPULATE_FIELDS)
        .lean();
    })
  );

  return {
    data: populated,
    meta: result.meta,
  };
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>
) => {
  const publicTargetConditions = await getPublicTargetConditions();
  const query = new AppQuery<TReviewDocument>(
    Review.find(getPublicReviewFilter(publicTargetConditions)),
    queryParams
  );

  return await query
    .search(["review"])
    .filter(["target", "target_model", "rating", "author"])
    .sort(["created_at", "rating"])
    .paginate()
    .fields(PUBLIC_FIELDS)
    .tap((reviewQuery) => reviewQuery.populate(PUBLIC_POPULATE_FIELDS).lean())
    .execute();
};

export const updateById = async (id: string, payload: Partial<TReview>) => {
  return await Review.findByIdAndUpdate(id, payload, { new: true });
};

export const updateMany = async (ids: string[], payload: Partial<TReview>) => {
  return await Review.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  return await Review.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await Review.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    Review.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const restoreMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Review.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(Review.findByIdAndDelete(id), "only_deleted");
};

export const hardDeleteMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Review.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
