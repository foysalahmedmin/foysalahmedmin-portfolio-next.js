import AppQuery from "@/builder/app-query";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession } from "mongoose";
import CaseStudy from "../case-studies/case-study.model";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import { getPublicCategoryFilter } from "../public-visibility";
import CaseStudyCategory from "./case-study-category.model";
import type {
  TCaseStudyCategory,
  TCaseStudyCategoryDocument,
} from "./case-study-category.type";

const POPULATE_PARENT = { path: "parent", select: "_id name" };
const PUBLIC_POPULATE_PARENT = {
  path: "parent",
  match: { status: "active" },
  select: "_id name slug",
};
const PUBLIC_FIELDS: Array<keyof TCaseStudyCategory> = [
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
  data: Partial<TCaseStudyCategory>,
  session?: ClientSession
): Promise<TCaseStudyCategoryDocument> => {
  return session
    ? (await CaseStudyCategory.create([data], { session }))[0]!
    : await CaseStudyCategory.create(data);
};

export const findById = async (
  id: string
): Promise<TCaseStudyCategoryDocument | null> => {
  return await CaseStudyCategory.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await CaseStudyCategory.findById(id).populate(POPULATE_PARENT).lean();
};

export const findPublicByIdPopulated = async (id: string) => {
  return await CaseStudyCategory.findOne({
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
  const direct = await CaseStudyCategory.findOne({
    $and: [getPublicCategoryFilter(), identityFilter],
  })
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_PARENT)
    .lean();
  if (direct) return direct;

  const aliasTarget = await findSlugTarget("case_study_category", slug);
  return aliasTarget ? await findPublicByIdPopulated(aliasTarget) : null;
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TCaseStudyCategoryDocument | null> => {
  return await setSoftDeleteScope(CaseStudyCategory.findById(id), "with_deleted");
};

export const findParentHierarchyNodeById = async (id: string) => {
  return await setSoftDeleteScope(CaseStudyCategory.findById(id), "with_deleted")
    .select("_id parent status +is_deleted")
    .lean();
};

export const findDeletedById = async (
  id: string
): Promise<TCaseStudyCategoryDocument | null> => {
  return await setSoftDeleteScope(CaseStudyCategory.findById(id), "only_deleted");
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    CaseStudyCategory.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findActiveParentsByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];

  return await CaseStudyCategory.find({
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

  return await CaseStudyCategory.find({
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

  const [childCategories, caseStudies] = await Promise.all([
    setSoftDeleteScope(
      CaseStudyCategory.find({ parent: { $in: ids } }).select("parent"),
      "with_deleted"
    ).lean(),
    setSoftDeleteScope(
      CaseStudy.find({ category: { $in: ids } }).select("category"),
      "with_deleted"
    ).lean(),
  ]);

  return Array.from(
    new Set([
      ...childCategories.map((category) => category.parent?.toString()),
      ...caseStudies.map((caseStudy) => caseStudy.category.toString()),
    ])
  ).filter((id): id is string => Boolean(id));
};

export const findBySlug = async (
  slug: string
): Promise<TCaseStudyCategoryDocument | null> => {
  return await CaseStudyCategory.findOne({
    $or: [{ slug }, { "slug_history.slug": slug }],
  });
};

export const findBySlugPopulated = async (slug: string) => {
  return await CaseStudyCategory.findOne({
    $or: [{ slug }, { "slug_history.slug": slug }],
  })
    .populate(POPULATE_PARENT)
    .lean();
};

export const findPublicBySlugPopulated = async (slug: string) => {
  return await CaseStudyCategory.findOne({
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
  return await CaseStudyCategory.find({ slug: { $in: slugs } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TCaseStudyCategoryDocument>(
    setSoftDeleteScope(CaseStudyCategory.find(), scope),
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
  const query = new AppQuery<TCaseStudyCategoryDocument>(
    CaseStudyCategory.find(getPublicCategoryFilter()),
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
  payload: Partial<TCaseStudyCategory>
) => {
  return await CaseStudyCategory.updateMany(
    { slug: { $in: slugs } },
    { ...payload }
  );
};

export const softDeleteManyBySlugs = async (slugs: string[]) => {
  return await CaseStudyCategory.updateMany(
    { slug: { $in: slugs } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await CaseStudyCategory.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    CaseStudyCategory.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(
    CaseStudyCategory.findByIdAndDelete(id),
    "only_deleted"
  );
};

export const hardDeleteManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    CaseStudyCategory.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
