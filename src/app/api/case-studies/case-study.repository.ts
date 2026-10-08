import AppQuery from "@/builder/app-query";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession } from "mongoose";
import CaseStudyCategory from "../case-study-categories/case-study-category.model";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import {
  getPublicCaseStudyFilter,
  getPublicCategoryFilter,
  withPublicCategories,
} from "../public-visibility";
import { User } from "../users/user.model";
import CaseStudy from "./case-study.model";
import type { TCaseStudy, TCaseStudyDocument } from "./case-study.type";

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
      purpose: "case_study",
    },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "images",
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "case_study",
    },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "rich_content.blocks.file",
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "case_study",
    },
    select: PUBLIC_FILE_SELECT,
  },
];

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter(Boolean).map(toIdString)),
];

export const PUBLIC_CASE_STUDY_LIST_FIELDS: Array<keyof TCaseStudy> = [
  "name",
  "slug",
  "description",
  "thumbnail",
  "category",
  "author",
  "client_name",
  "show_client_name",
  "client_industry",
  "engagement_type",
  "primary_pillar",
  "secondary_pillars",
  "role",
  "duration_label",
  "tech_stack",
  "outcomes",
  "keywords",
  "status",
  "is_featured",
  "published_at",
  "updated_at",
];

export const PUBLIC_CASE_STUDY_DETAIL_FIELDS: Array<keyof TCaseStudy> = [
  ...PUBLIC_CASE_STUDY_LIST_FIELDS,
  "overview",
  "content",
  "rich_content",
  "images",
  "client_location",
  "team_size",
  "started_at",
  "ended_at",
  "challenge",
  "approach",
  "solution",
  "key_decisions",
  "results_summary",
  "services",
  "learnings",
  "live_url",
  "live_url_visibility",
  "source_url",
  "source_url_visibility",
  "expired_at",
  "layout",
];

const getPublicCaseStudyRepositoryFilter = async () => {
  const categories = await CaseStudyCategory.find(getPublicCategoryFilter())
    .select("_id")
    .lean();

  return withPublicCategories(
    getPublicCaseStudyFilter(),
    categories.map((category) => category._id)
  );
};

export const create = async (
  data: Partial<TCaseStudy>,
  session?: ClientSession
): Promise<TCaseStudyDocument> => {
  const created = session
    ? (await CaseStudy.create([data], { session }))[0]!
    : await CaseStudy.create(data);
  if (session) return created;
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (
  id: string
): Promise<TCaseStudyDocument | null> => await CaseStudy.findById(id);

export const findByIdPopulated = async (id: string) =>
  await CaseStudy.findById(id).populate(POPULATE_FIELDS).lean();

export const findPublicByIdentifierPopulated = async (identifier: string) => {
  const publicFilter = await getPublicCaseStudyRepositoryFilter();
  const normalized = normalizeSlugIdentifier(identifier);
  if (!normalized) return null;
  const identityFilter = isMongoObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: normalized }] }
    : { $or: [{ slug: normalized }, { "slug_history.slug": normalized }] };

  const direct = await CaseStudy.findOne({
    $and: [publicFilter, identityFilter],
  })
    .select(PUBLIC_CASE_STUDY_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
  if (direct) return direct;

  const aliasTarget = await findSlugTarget("case_study", normalized);
  if (!aliasTarget) return null;
  return await CaseStudy.findOne({ $and: [publicFilter, { _id: aliasTarget }] })
    .select(PUBLIC_CASE_STUDY_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
};

export const findPublicByIdPopulated = findPublicByIdentifierPopulated;

export const findPublicForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  const publicFilter = await getPublicCaseStudyRepositoryFilter();
  const filter: Record<string, unknown> = { ...publicFilter };
  if (input.ids?.length) filter._id = { $in: input.ids };
  if (typeof input.filters.featured === "boolean") {
    filter.is_featured = input.filters.featured;
  }
  if (typeof input.filters.pillar === "string") {
    filter.primary_pillar = input.filters.pillar;
  }
  const records = await setSoftDeleteScope(CaseStudy.find(filter), "active", {
    exact_active: true,
  })
    .select(PUBLIC_CASE_STUDY_LIST_FIELDS.join(" "))
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
): Promise<TCaseStudyDocument | null> =>
  await setSoftDeleteScope(CaseStudy.findById(id), "with_deleted");

export const findDeletedById = async (
  id: string
): Promise<TCaseStudyDocument | null> =>
  await setSoftDeleteScope(CaseStudy.findById(id), "only_deleted");

export const findManyByIds = async (ids: string[]) =>
  await CaseStudy.find({ _id: { $in: ids } }).lean();

export const findDeletedManyByIds = async (ids: string[]) =>
  await setSoftDeleteScope(
    CaseStudy.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();

export const findNotRestorableIds = async (
  caseStudies: Array<Pick<TCaseStudy, "category" | "author"> & { _id: unknown }>
): Promise<string[]> => {
  if (!caseStudies.length) return [];

  const categoryIds = uniqueIds(caseStudies.map(({ category }) => category));
  const userIds = uniqueIds(caseStudies.map(({ author }) => author));

  const [categories, users] = await Promise.all([
    CaseStudyCategory.find({ _id: { $in: categoryIds }, status: "active" })
      .select("_id")
      .lean(),
    User.find({ _id: { $in: userIds }, status: "in-progress" })
      .select("_id")
      .lean(),
  ]);

  const activeCategoryIds = new Set(
    categories.map(({ _id }) => _id.toString())
  );
  const activeUserIds = new Set(users.map(({ _id }) => _id.toString()));

  return caseStudies
    .filter(
      ({ category, author }) =>
        !activeCategoryIds.has(toIdString(category)) ||
        !activeUserIds.has(toIdString(author))
    )
    .map(({ _id }) => toIdString(_id));
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TCaseStudyDocument>(
    setSoftDeleteScope(CaseStudy.find(), scope),
    queryParams
  );

  return await query
    .search(["name", "description", "client_industry", "tech_stack"])
    .filter([
      "status",
      "category",
      "author",
      "is_featured",
      "primary_pillar",
      "engagement_type",
    ])
    .sort(["name", "status", "published_at", "created_at"])
    .paginate()
    .fields()
    .tap((caseStudyQuery) => caseStudyQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicDiscoveryFacets = async () => {
  const publicFilter = await getPublicCaseStudyRepositoryFilter();
  const technologies = await CaseStudy.distinct("tech_stack", publicFilter);
  return {
    technologies: Array.from(
      new Set(
        technologies
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
  const publicFilter = await getPublicCaseStudyRepositoryFilter();
  const query = new AppQuery<TCaseStudyDocument>(
    CaseStudy.find(publicFilter),
    {
      ...queryParams,
      status: "published",
    }
  );

  return await query
    .search([
      "name",
      "description",
      "overview",
      "client_industry",
      "tech_stack",
      "keywords",
    ])
    .filter([
      "status",
      "category",
      "is_featured",
      "primary_pillar",
      "engagement_type",
      "tech_stack",
    ])
    .sort(["name", "status", "published_at", "is_featured", "_id"])
    .paginate()
    .fields(PUBLIC_CASE_STUDY_LIST_FIELDS)
    .tap((caseStudyQuery) =>
      caseStudyQuery.populate(PUBLIC_POPULATE_FIELDS).lean()
    )
    .execute();
};

export const updateMany = async (
  ids: string[],
  payload: Partial<TCaseStudy>
) => await CaseStudy.updateMany({ _id: { $in: ids } }, { ...payload });

export const setPublishedAtIfMissing = async (ids: string[], now: Date) =>
  CaseStudy.updateMany(
    {
      _id: { $in: ids },
      $or: [{ published_at: { $exists: false } }, { published_at: null }],
    },
    { $set: { published_at: now } }
  );

export const softDeleteMany = async (ids: string[]) =>
  await CaseStudy.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );

export const softDeleteById = async (id: string) =>
  await CaseStudy.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );

export const restoreById = async (id: string) =>
  await setSoftDeleteScope(
    CaseStudy.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );

export const restoreMany = async (ids: string[]) =>
  await setSoftDeleteScope(
    CaseStudy.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );

export const hardDeleteById = async (id: string) =>
  await setSoftDeleteScope(CaseStudy.findByIdAndDelete(id), "only_deleted");

export const hardDeleteMany = async (ids: string[]) =>
  await setSoftDeleteScope(
    CaseStudy.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
