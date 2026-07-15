import AppQuery from "@/builder/app-query";
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
      match: { status: "active" },
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
  return await Review.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await Review.find({ _id: { $in: ids } }).lean();
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
  const query = new AppQuery<TReviewDocument>(Review.find(), queryParams);

  const result = await query
    .search(["review"])
    .filter(["status", "target", "target_model", "rating", "author"])
    .sort(["created_at", "rating"])
    .paginate()
    .fields()
    .execute();

  const populated = await Promise.all(
    result.data.map(async (review) => {
      return await Review.findById((review as { _id: unknown })._id)
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
  await Review.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await Review.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true }
  );
};

export const restoreMany = async (ids: string[]) => {
  return await Review.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false }
  );
};

export const hardDeleteById = async (id: string) => {
  await Review.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await Review.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
