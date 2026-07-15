import AppQuery from "@/builder/app-query";
import ProjectCategory from "../project-categories/project-category.model";
import Project from "../projects/project.model";
import {
  getPublicCategoryFilter,
  getPublicProjectFilter,
  getPublicProjectResourceFilter,
  withPublicCategories,
} from "../public-visibility";
import ProjectResource from "./project-resource.model";
import type {
  TProjectResource,
  TProjectResourceDocument,
} from "./project-resource.type";

const POPULATE_PROJECT = [{ path: "project", select: "_id name" }];
const PUBLIC_POPULATE_PROJECT = [
  {
    path: "project",
    match: { status: "completed" },
    select: "_id name",
  },
];
const PUBLIC_FIELDS: Array<keyof TProjectResource> = [
  "project",
  "sequence",
  "type",
  "title",
  "url",
  "description",
  "created_at",
  "updated_at",
];

const findPublicProjectIds = async () => {
  const categories = await ProjectCategory.find(getPublicCategoryFilter())
    .select("_id")
    .lean();
  const projectFilter = withPublicCategories(
    getPublicProjectFilter(),
    categories.map((category) => category._id)
  );
  const projects = await Project.find(projectFilter).select("_id").lean();

  return projects.map((project) => project._id);
};

export const create = async (
  data: Partial<TProjectResource>
): Promise<TProjectResourceDocument> => {
  const created = await ProjectResource.create(data);
  return await created.populate(POPULATE_PROJECT);
};

export const findById = async (
  id: string
): Promise<TProjectResourceDocument | null> => {
  return await ProjectResource.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await ProjectResource.findById(id).populate(POPULATE_PROJECT).lean();
};

export const findPublicByIdPopulated = async (id: string) => {
  const publicProjectIds = await findPublicProjectIds();

  return await ProjectResource.findOne({
    _id: id,
    ...getPublicProjectResourceFilter({ $in: publicProjectIds }),
  })
    .select(PUBLIC_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_PROJECT)
    .lean();
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TProjectResourceDocument | null> => {
  return await ProjectResource.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await ProjectResource.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TProjectResourceDocument>(
    ProjectResource.find(),
    queryParams
  );

  const result = await query
    .search(["title", "url", "description"])
    .filter(["project", "type", "is_private"])
    .sort(["sequence", "title"])
    .paginate()
    .fields()
    .execute();

  const populated = await Promise.all(
    result.data.map(async (resource) => {
      return await ProjectResource.findById((resource as { _id: unknown })._id)
        .populate(POPULATE_PROJECT)
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
  const publicProjectIds = await findPublicProjectIds();
  const requestedProject =
    typeof queryParams.project === "string" ? queryParams.project : null;
  const requestedProjectIsPublic = requestedProject
    ? publicProjectIds.some(
        (projectId) => projectId.toString() === requestedProject
      )
    : false;
  const projectFilter = requestedProject
    ? requestedProjectIsPublic
      ? requestedProject
      : { $in: [] }
    : { $in: publicProjectIds };
  const safeQueryParams = { ...queryParams };
  delete safeQueryParams.project;

  const query = new AppQuery<TProjectResourceDocument>(
    ProjectResource.find(getPublicProjectResourceFilter(projectFilter)),
    safeQueryParams
  );

  return await query
    .search(["title", "description"])
    .filter(["type"])
    .sort(["sequence", "title"])
    .paginate()
    .fields(PUBLIC_FIELDS)
    .tap((resourceQuery) =>
      resourceQuery.populate(PUBLIC_POPULATE_PROJECT).lean()
    )
    .execute();
};

export const updateMany = async (
  ids: string[],
  payload: Partial<TProjectResource>
) => {
  return await ProjectResource.updateMany(
    { _id: { $in: ids } },
    { ...payload }
  );
};

export const softDeleteMany = async (ids: string[]) => {
  await ProjectResource.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await ProjectResource.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true }
  );
};

export const restoreMany = async (ids: string[]) => {
  return await ProjectResource.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false }
  );
};

export const hardDeleteById = async (id: string) => {
  await ProjectResource.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await ProjectResource.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
