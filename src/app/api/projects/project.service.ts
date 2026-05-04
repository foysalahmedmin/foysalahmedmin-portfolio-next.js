import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { deleteFile, deleteFiles } from '@/utils/file-utils';
import httpStatus from 'http-status';
import * as ProjectRepository from './project.repository';

export const getProjects = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ProjectRepository.findPaginated(queryParams);
};

export const getProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.findByIdPopulated(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

export const createProject = async (payload: {
  name: string;
  content: string;
  category: string;
  author: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  tags?: string[];
  client?: string;
  collaborators?: string[];
  status?: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  is_featured?: boolean;
  is_premium?: boolean;
  started_at?: Date | string;
  ended_at?: Date | string;
  layout?: string;
}) => {
  await connectDB();

  return await ProjectRepository.create({
    ...payload,
    status: payload.status || 'planned',
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    started_at: payload.started_at ? new Date(payload.started_at) : undefined,
    ended_at: payload.ended_at ? new Date(payload.ended_at) : undefined,
    layout: payload.layout || 'default',
  } as never);
};

export const updateProjectById = async (
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    content: string;
    thumbnail: string;
    images: string[];
    tags: string[];
    category: string;
    client: string;
    collaborators: string[];
    status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    is_featured: boolean;
    is_premium: boolean;
    started_at: Date | string;
    ended_at: Date | string;
    layout: string;
  }>,
  currentProject?: any,
) => {
  await connectDB();

  const project = await ProjectRepository.findById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  const current = currentProject || project.toObject();

  if (payload.thumbnail !== undefined) {
    if (current.thumbnail && current.thumbnail !== payload.thumbnail) {
      deleteFile(current.thumbnail);
    }
  }

  if (payload.images !== undefined && Array.isArray(payload.images)) {
    const currentImages = current.images || [];
    const newImages = payload.images.filter(
      (img) => img !== 'DELETE' && typeof img === 'string',
    );

    const removedImages = currentImages.filter(
      (oldImg: string) => !newImages.includes(oldImg),
    );

    if (removedImages.length > 0) {
      deleteFiles(removedImages);
    }

    payload.images = newImages;
  }

  const updateData: any = { ...payload };
  if (payload.started_at) {
    updateData.started_at = new Date(payload.started_at);
  }
  if (payload.ended_at) {
    updateData.ended_at = new Date(payload.ended_at);
  }

  Object.assign(project, updateData);
  const saved = await project.save();

  return await saved.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'client', select: '_id name email' },
    { path: 'collaborators', select: '_id name email' },
  ]);
};

export const updateProjects = async (
  ids: string[],
  payload: Partial<{
    status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    is_featured: boolean;
    category: string;
  }>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const projects = await ProjectRepository.findManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectRepository.updateMany(foundIds, payload as never);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.findById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  await project.softDelete();
  return null;
};

export const deleteProjectPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const project = await ProjectRepository.findByIdWithDeleted(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  if (project.thumbnail) {
    deleteFile(project.thumbnail);
  }
  if (project.images && project.images.length > 0) {
    deleteFiles(project.images);
  }

  await ProjectRepository.hardDeleteById(id);
};

export const deleteProjects = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const projects = await ProjectRepository.findManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ProjectRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectsPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const projects = await ProjectRepository.findManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  for (const project of projects) {
    if (project.thumbnail) {
      deleteFile(project.thumbnail);
    }
    if (project.images && project.images.length > 0) {
      deleteFiles(project.images);
    }
  }

  await ProjectRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.restoreById(id);
  if (!project) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Project not found or not deleted',
    );
  }

  return project;
};

export const restoreProjects = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await ProjectRepository.restoreMany(ids);

  const restored = await ProjectRepository.findManyByIds(ids);
  const restoredIds = restored.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
