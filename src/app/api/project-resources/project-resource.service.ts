import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import * as ProjectResourceRepository from "./project-resource.repository";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";

export const getProjectResources = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await ProjectResourceRepository.findPaginated(queryParams);
};

export const getPublicProjectResources = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const result = await ProjectResourceRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
  return {
    ...result,
    data: result.data.filter(
      (resource) =>
        typeof resource?.url === "string" &&
        isAllowedPublicProjectUrl(resource.url)
    ),
  };
};

export const getProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findByIdPopulated(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, "Project resource not found");
  }

  return resource;
};

export const getPublicProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findPublicByIdPopulated(id);
  if (
    !resource ||
    !resource.project ||
    !isAllowedPublicProjectUrl(resource.url)
  ) {
    throw new AppError(httpStatus.NOT_FOUND, "Project resource not found");
  }

  return resource;
};

export const createProjectResource = async (payload: {
  project: string;
  sequence: number;
  title: string;
  url: string;
  type?: "repository" | "design" | "documentation" | "other";
  description?: string;
  is_private?: boolean;
}) => {
  await connectDB();

  if (!(await ProjectResourceRepository.isProjectActive(payload.project))) {
    throw new AppError(httpStatus.BAD_REQUEST, "An active project is required");
  }

  return await ProjectResourceRepository.create({
    ...payload,
    type: payload.type || "other",
    is_private: payload.is_private || false,
  } as never);
};

export const updateProjectResourceById = async (
  id: string,
  payload: Partial<{
    sequence: number;
    type: "repository" | "design" | "documentation" | "other";
    title: string;
    url: string;
    description: string;
    is_private: boolean;
  }>
) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findById(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, "Project resource not found");
  }

  Object.assign(resource, payload);
  await resource.save();

  return await resource.populate([{ path: "project", select: "_id name" }]);
};

export const updateProjectResources = async (
  ids: string[],
  payload: Partial<{
    type: "repository" | "design" | "documentation" | "other";
    is_private: boolean;
  }>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectResourceRepository.updateMany(
    foundIds,
    payload as never
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.softDeleteById(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, "Project resource not found");
  }

  return null;
};

export const deleteProjectResourcePermanent = async (
  id: string
): Promise<void> => {
  await connectDB();

  const resource = await ProjectResourceRepository.findDeletedById(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, "Project resource not found");
  }

  const deleted = await ProjectResourceRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project resource changed while permanent deletion was in progress"
    );
  }
};

export const deleteProjectResources = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectResourceRepository.softDeleteMany(foundIds);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectResourcesPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findDeletedManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) =>
      Boolean(await ProjectResourceRepository.hardDeleteById(entityId))
    )
  );
  const notDeletedIds = foundIds.filter((_, index) => !outcomes[index]);

  return {
    count: outcomes.filter(Boolean).length,
    not_found_ids: [...new Set([...notFoundIds, ...notDeletedIds])],
  };
};

export const restoreProjectResource = async (id: string) => {
  await connectDB();

  const candidate = await ProjectResourceRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Project resource not found or not deleted"
    );
  }

  const notRestorableIds = await ProjectResourceRepository.findNotRestorableIds(
    [candidate]
  );
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project resource cannot be restored until its project is active"
    );
  }

  const resource = await ProjectResourceRepository.restoreById(id);
  if (!resource) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project resource changed while restoration was in progress"
    );
  }

  return resource;
};

export const restoreProjectResources = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findDeletedManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds =
    await ProjectResourceRepository.findNotRestorableIds(resources);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await ProjectResourceRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
