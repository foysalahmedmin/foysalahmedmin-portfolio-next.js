import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { withPublicPagination } from '@/utils/public-query';
import httpStatus from 'http-status';
import * as ProjectResourceRepository from './project-resource.repository';

export const getProjectResources = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ProjectResourceRepository.findPaginated(queryParams);
};

export const getPublicProjectResources = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ProjectResourceRepository.findPublicPaginated(
    withPublicPagination(queryParams),
  );
};

export const getProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findByIdPopulated(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  return resource;
};

export const getPublicProjectResourceById = async (id: string) => {
  await connectDB();

  const resource =
    await ProjectResourceRepository.findPublicByIdPopulated(id);
  if (!resource || !resource.project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  return resource;
};

export const createProjectResource = async (payload: {
  project: string;
  sequence: number;
  title: string;
  url: string;
  type?: 'repository' | 'design' | 'documentation' | 'other';
  description?: string;
  is_private?: boolean;
}) => {
  await connectDB();

  return await ProjectResourceRepository.create({
    ...payload,
    type: payload.type || 'other',
    is_private: payload.is_private || false,
  } as never);
};

export const updateProjectResourceById = async (
  id: string,
  payload: Partial<{
    sequence: number;
    type: 'repository' | 'design' | 'documentation' | 'other';
    title: string;
    url: string;
    description: string;
    is_private: boolean;
  }>,
) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findById(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  Object.assign(resource, payload);
  await resource.save();

  return await resource.populate([{ path: 'project', select: '_id name' }]);
};

export const updateProjectResources = async (
  ids: string[],
  payload: Partial<{
    type: 'repository' | 'design' | 'documentation' | 'other';
    is_private: boolean;
  }>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectResourceRepository.updateMany(
    foundIds,
    payload as never,
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.findById(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  await resource.softDelete();
  return null;
};

export const deleteProjectResourcePermanent = async (
  id: string,
): Promise<void> => {
  await connectDB();

  const resource = await ProjectResourceRepository.findByIdWithDeleted(id);
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  await ProjectResourceRepository.hardDeleteById(id);
};

export const deleteProjectResources = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ProjectResourceRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectResourcesPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const resources = await ProjectResourceRepository.findManyByIds(ids);
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ProjectResourceRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreProjectResource = async (id: string) => {
  await connectDB();

  const resource = await ProjectResourceRepository.restoreById(id);
  if (!resource) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Project resource not found or not deleted',
    );
  }

  return resource;
};

export const restoreProjectResources = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await ProjectResourceRepository.restoreMany(ids);

  const restored = await ProjectResourceRepository.findManyByIds(ids);
  const restoredIds = restored.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
