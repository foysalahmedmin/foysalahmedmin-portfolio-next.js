import connectDB from '@/lib/db';
import ProjectResource from './project-resource.model';
import AppError from '@/builder/app-error';
import AppQuery from '@/builder/app-query';
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
        .populate([{ path: 'project', select: '_id name' }])
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
    .populate([{ path: 'project', select: '_id name' }])
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

  return await resource.populate([{ path: 'project', select: '_id name' }]);
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

  return await resource.populate([{ path: 'project', select: '_id name' }]);
};

export const updateProjectResources = async (
  ids: string[],
  payload: Partial<{
    type: 'repository' | 'design' | 'documentation' | 'other';
    is_private: boolean;
  }>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const resources = await ProjectResource.find({ _id: { $in: ids } }).lean();
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectResource.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
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

export const deleteProjectResourcePermanent = async (id: string): Promise<void> => {
  await connectDB();
  const resource = await ProjectResource.findById(id).setOptions({ bypassDeleted: true });
  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found');
  }

  await ProjectResource.findByIdAndDelete(id);
};

export const deleteProjectResources = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const resources = await ProjectResource.find({ _id: { $in: ids } }).lean();
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ProjectResource.updateMany(
    { _id: { $in: foundIds } },
    { is_deleted: true },
  );

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectResourcesPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const resources = await ProjectResource.find({ _id: { $in: ids } }).lean();
  const foundIds = resources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ProjectResource.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreProjectResource = async (id: string) => {
  await connectDB();
  const resource = await ProjectResource.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );

  if (!resource) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project resource not found or not deleted');
  }

  return resource;
};

export const restoreProjectResources = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await ProjectResource.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredResources = await ProjectResource.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredResources.map((resource) => resource._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
