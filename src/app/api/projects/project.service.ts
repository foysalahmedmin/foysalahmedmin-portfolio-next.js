import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import httpStatus from 'http-status';
import * as FileService from '../files/file.service';
import * as ProjectRepository from './project.repository';

const MODEL = 'Project' as const;

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: { toString(): string }; toString?(): string };
    if (obj._id) return obj._id.toString();
    if (obj.toString) return obj.toString();
  }
  return null;
};

const toIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => toIdString(v))
    .filter((v): v is string => Boolean(v));
};

export const getProjects = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ProjectRepository.findPaginated(queryParams);
};

export const getPublicProjects = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ProjectRepository.findPublicPaginated(queryParams);
};

export const getProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.findByIdPopulated(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

export const getPublicProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.findPublicByIdPopulated(id);
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
  thumbnail?: string | null;
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

  const fileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(fileIds);

  const created = await ProjectRepository.create({
    ...payload,
    status: payload.status || 'planned',
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    started_at: payload.started_at ? new Date(payload.started_at) : undefined,
    ended_at: payload.ended_at ? new Date(payload.ended_at) : undefined,
    layout: payload.layout || 'default',
  } as never);

  const entityId = (created._id as { toString(): string }).toString();

  await Promise.all([
    payload.thumbnail
      ? FileService.attachToEntity({
          fileIds: payload.thumbnail,
          model: MODEL,
          entity: entityId,
          field: 'thumbnail',
        })
      : Promise.resolve(),
    payload.images?.length
      ? FileService.attachToEntity({
          fileIds: payload.images,
          model: MODEL,
          entity: entityId,
          field: 'images',
        })
      : Promise.resolve(),
  ]);

  return created;
};

export const updateProjectById = async (
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    content: string;
    thumbnail: string | null;
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
) => {
  await connectDB();

  const project = await ProjectRepository.findById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  const newFileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(newFileIds);

  const previousThumbnail = toIdString(project.thumbnail);
  const previousImages = toIdArray(project.images);

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.started_at) {
    updateData.started_at = new Date(payload.started_at);
  }
  if (payload.ended_at) {
    updateData.ended_at = new Date(payload.ended_at);
  }

  Object.assign(project, updateData);
  await project.save();

  const reconcileTasks: Promise<void>[] = [];

  if (payload.thumbnail !== undefined) {
    reconcileTasks.push(
      FileService.reconcileEntityRefs({
        model: MODEL,
        entity: id,
        field: 'thumbnail',
        previous: previousThumbnail,
        next: payload.thumbnail,
      }),
    );
  }

  if (payload.images !== undefined) {
    reconcileTasks.push(
      FileService.reconcileEntityRefs({
        model: MODEL,
        entity: id,
        field: 'images',
        previous: previousImages,
        next: payload.images,
      }),
    );
  }

  await Promise.all(reconcileTasks);

  return await ProjectRepository.findByIdPopulated(id);
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

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
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

  await Promise.all(
    foundIds.map((entityId) =>
      FileService.detachAllForEntity({ model: MODEL, entity: entityId }),
    ),
  );

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
