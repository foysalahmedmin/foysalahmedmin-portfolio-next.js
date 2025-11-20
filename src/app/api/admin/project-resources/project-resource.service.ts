import connectDB from '@/lib/db';
import ProjectResource from './project-resource.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TProjectResourceDocument } from './project-resource.type';

export const getProjectResources = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TProjectResourceDocument>(
    ProjectResource.find(),
    queryParams,
  );

  const result = await query
    .search(['title', 'url', 'description'])
    .filter(['project', 'type', 'is_private'])
    .sort(['sequence', 'title'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (resource: any) => {
      return await ProjectResource.findById(resource._id)
        .populate('project', 'name slug')
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResource.findById(id)
    .populate('project', 'name slug')
    .lean();

  if (!resource) {
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

  const resource = await ProjectResource.create({
    ...payload,
    type: payload.type || 'other',
    is_private: payload.is_private || false,
  });

  return await resource.populate('project', 'name slug');
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

  const resource = await ProjectResource.findById(id);

  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  Object.assign(resource, payload);
  await resource.save();

  return await resource.populate('project', 'name slug');
};

export const deleteProjectResourceById = async (id: string) => {
  await connectDB();

  const resource = await ProjectResource.findById(id);

  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  await resource.softDelete();

  return null;
};

