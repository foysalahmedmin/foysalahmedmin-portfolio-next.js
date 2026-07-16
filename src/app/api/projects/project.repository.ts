import AppQuery from "@/builder/app-query";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import type { ClientSession } from "mongoose";
import ProjectCategory from "../project-categories/project-category.model";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import ProjectResource from "../project-resources/project-resource.model";
import {
  getPublicCategoryFilter,
  getPublicProjectFilter,
  withPublicCategories,
} from "../public-visibility";
import { Review } from "../reviews/review.model";
import { User } from "../users/user.model";
import Project from "./project.model";
import type { TProject, TProjectDocument } from "./project.type";

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
  { path: "client", select: "_id name email image" },
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
      purpose: "project",
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
      purpose: "project",
    },
    select: PUBLIC_FILE_SELECT,
  },
];

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter(Boolean).map(toIdString)),
];

export const PUBLIC_PROJECT_LIST_FIELDS: Array<keyof TProject> = [
  "name",
  "slug",
  "description",
  "thumbnail",
  "tags",
  "category",
  "status",
  "delivery_status",
  "project_type",
  "role",
  "primary_pillar",
  "secondary_pillars",
  "outcomes",
  "is_featured",
  "is_premium",
  "started_at",
];

export const PUBLIC_PROJECT_DETAIL_FIELDS: Array<keyof TProject> = [
  ...PUBLIC_PROJECT_LIST_FIELDS,
  "content",
  "rich_content",
  "images",
  "author",
  "ended_at",
  "layout",
  "problem",
  "constraints",
  "role",
  "architecture",
  "decisions",
  "implementation",
  "security",
  "performance_reliability",
  "learnings",
  "live_url",
  "live_url_visibility",
  "source_url",
  "source_url_visibility",
];

const getPublicProjectRepositoryFilter = async () => {
  const categories = await ProjectCategory.find(getPublicCategoryFilter())
    .select("_id")
    .lean();

  return withPublicCategories(
    getPublicProjectFilter(),
    categories.map((category) => category._id)
  );
};

export const create = async (
  data: Partial<TProject>,
  session?: ClientSession
): Promise<TProjectDocument> => {
  const created = session
    ? (await Project.create([data], { session }))[0]!
    : await Project.create(data);
  if (session) return created;
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (
  id: string
): Promise<TProjectDocument | null> => {
  return await Project.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await Project.findById(id).populate(POPULATE_FIELDS).lean();
};

export const findPublicByIdentifierPopulated = async (identifier: string) => {
  const publicFilter = await getPublicProjectRepositoryFilter();
  const normalized = normalizeSlugIdentifier(identifier);
  if (!normalized) return null;
  const identityFilter = isMongoObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: normalized }] }
    : { $or: [{ slug: normalized }, { "slug_history.slug": normalized }] };

  const direct = await Project.findOne({ $and: [publicFilter, identityFilter] })
    .select(PUBLIC_PROJECT_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
  if (direct) return direct;

  const aliasTarget = await findSlugTarget("project", normalized);
  if (!aliasTarget) return null;
  return await Project.findOne({ $and: [publicFilter, { _id: aliasTarget }] })
    .select(PUBLIC_PROJECT_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
};

export const findPublicByIdPopulated = findPublicByIdentifierPopulated;

export const findPublicForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  const publicFilter = await getPublicProjectRepositoryFilter();
  const filter: Record<string, unknown> = { ...publicFilter };
  if (input.ids?.length) filter._id = { $in: input.ids };
  if (typeof input.filters.featured === "boolean") {
    filter.is_featured = input.filters.featured;
  }
  if (typeof input.filters.pillar === "string") {
    filter.primary_pillar = input.filters.pillar;
  }
  if (typeof input.filters.project_type === "string") {
    filter.project_type = input.filters.project_type;
  }
  const records = await setSoftDeleteScope(Project.find(filter), "active", {
    exact_active: true,
  })
    .select([...PUBLIC_PROJECT_LIST_FIELDS, "author"].join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .sort({ is_featured: -1, started_at: -1, _id: 1 })
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
): Promise<TProjectDocument | null> => {
  return await setSoftDeleteScope(Project.findById(id), "with_deleted");
};

export const findDeletedById = async (
  id: string
): Promise<TProjectDocument | null> => {
  return await setSoftDeleteScope(Project.findById(id), "only_deleted");
};

export const findManyByIds = async (ids: string[]) => {
  return await Project.find({ _id: { $in: ids } }).lean();
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Project.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findNotRestorableIds = async (
  projects: Array<
    Pick<TProject, "category" | "author" | "client" | "collaborators"> & {
      _id: unknown;
    }
  >
): Promise<string[]> => {
  if (!projects.length) return [];

  const categoryIds = uniqueIds(projects.map(({ category }) => category));
  const userIds = uniqueIds(
    projects.flatMap(({ author, client, collaborators }) => [
      author,
      client,
      ...(collaborators ?? []),
    ])
  );

  const [categories, users] = await Promise.all([
    ProjectCategory.find({
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

  return projects
    .filter(({ category, author, client, collaborators }) => {
      if (!activeCategoryIds.has(toIdString(category))) return true;

      return [author, client, ...(collaborators ?? [])]
        .filter(Boolean)
        .some((userId) => !activeUserIds.has(toIdString(userId)));
    })
    .map(({ _id }) => toIdString(_id));
};

export const findIdsWithDependents = async (
  ids: string[]
): Promise<string[]> => {
  if (!ids.length) return [];

  const [reviewTargetIds, resourceProjectIds] = await Promise.all([
    setSoftDeleteScope(
      Review.distinct("target", {
        target_model: "Project",
        target: { $in: ids },
      }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      ProjectResource.distinct("project", { project: { $in: ids } }),
      "with_deleted"
    ),
  ]);

  return uniqueIds([...reviewTargetIds, ...resourceProjectIds]);
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TProjectDocument>(
    setSoftDeleteScope(Project.find(), scope),
    queryParams
  );

  return await query
    .search(["name", "description", "tags", "problem", "role"])
    .filter([
      "status",
      "delivery_status",
      "publication_status",
      "project_type",
      "primary_pillar",
      "category",
      "author",
      "is_featured",
    ])
    .sort(["name", "delivery_status", "publication_status", "started_at"])
    .paginate()
    .fields()
    .tap((projectQuery) => projectQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>
) => {
  const publicFilter = await getPublicProjectRepositoryFilter();
  const year = Number(queryParams.year);
  const hasYear = Number.isSafeInteger(year) && year >= 1990 && year <= 9999;
  const repositoryQueryParams = { ...queryParams };
  delete repositoryQueryParams.year;
  const query = new AppQuery<TProjectDocument>(
    Project.find(
      hasYear
        ? {
            $and: [
              publicFilter,
              {
                started_at: {
                  $gte: new Date(Date.UTC(year, 0, 1)),
                  $lt: new Date(Date.UTC(year + 1, 0, 1)),
                },
              },
            ],
          }
        : publicFilter
    ),
    repositoryQueryParams
  );

  return await query
    .search(["name", "description", "tags"])
    .filter([
      "delivery_status",
      "project_type",
      "primary_pillar",
      "category",
      "tags",
      "is_featured",
    ])
    .sort(["name", "delivery_status", "started_at", "is_featured", "_id"])
    .paginate()
    .fields(PUBLIC_PROJECT_LIST_FIELDS)
    .tap((projectQuery) => projectQuery.populate(PUBLIC_POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicDiscoveryFacets = async () => {
  const publicFilter = await getPublicProjectRepositoryFilter();
  const [technologies, yearRows] = await Promise.all([
    Project.distinct("tags", publicFilter),
    Project.aggregate<{ _id: number }>([
      { $match: { ...publicFilter, is_deleted: { $ne: true } } },
      { $match: { started_at: { $type: "date" } } },
      { $group: { _id: { $year: "$started_at" } } },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
  ]);

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
    years: yearRows
      .map(({ _id }) => _id)
      .filter((value) => Number.isSafeInteger(value) && value >= 1990),
  };
};

export const updateMany = async (ids: string[], payload: Partial<TProject>) => {
  return await Project.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const replaceRichContentMany = async (
  items: Array<Pick<TProject, "content" | "rich_content"> & { id: string }>
) => {
  if (!items.length) return;

  await Project.bulkWrite(
    items.map(({ id, content, rich_content }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { content, rich_content } },
      },
    }))
  );
};

export const softDeleteMany = async (ids: string[]) => {
  return await Project.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await Project.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    Project.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const restoreMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Project.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(
    Project.findByIdAndDelete(id),
    "only_deleted"
  );
};

export const hardDeleteMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    Project.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
