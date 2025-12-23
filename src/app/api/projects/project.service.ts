import connectDB from '@/lib/db';
import Project from './project.model';
import AppError from '@/builder/app-error';
import AppQuery from '@/builder/app-query';
import httpStatus from 'http-status';
import type { TProjectDocument } from './project.type';
import { deleteFile, deleteFiles } from '@/utils/file-utils';

export const getProjects = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TProjectDocument>(
    Project.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'started_at'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (project: any) => {
      return await Project.findById(project._id)
        .populate([
          { path: 'author', select: '_id name email image' },
          { path: 'category', select: '_id name' },
          { path: 'client', select: '_id name email image' },
          { path: 'collaborators', select: '_id name email' }
        ])
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getProjectById = async (id: string) => {
  await connectDB();

  const project = await Project.findById(id)
    .populate([
      { path: 'author', select: '_id name email image' },
      { path: 'category', select: '_id name' },
      { path: 'client', select: '_id name email image' },
      { path: 'collaborators', select: '_id name email' }
    ])
    .lean();

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

  const project = await Project.create({
    ...payload,
    status: payload.status || 'planned',
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    started_at: payload.started_at ? new Date(payload.started_at) : undefined,
    ended_at: payload.ended_at ? new Date(payload.ended_at) : undefined,
    layout: payload.layout || 'default',
  });

  return await project.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'client', select: '_id name email' },
    { path: 'collaborators', select: '_id name email' }
  ]);
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

  const project = await Project.findById(id);

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Get current project data if not provided
  const current = currentProject || project.toObject();

  // Handle file deletion/replacement
  // Delete old thumbnail if it's being replaced or removed
  if (payload.thumbnail !== undefined) {
    if (current.thumbnail && current.thumbnail !== payload.thumbnail) {
      // Old thumbnail exists and is being changed
      deleteFile(current.thumbnail);
    }
  }

  // Handle images array - delete removed images
  if (payload.images !== undefined && Array.isArray(payload.images)) {
    const currentImages = current.images || [];
    const newImages = payload.images.filter((img) => img !== 'DELETE' && typeof img === 'string');
    
    // Find images that were removed
    const removedImages = currentImages.filter(
      (oldImg: string) => !newImages.includes(oldImg),
    );
    
    // Delete removed images
    if (removedImages.length > 0) {
      deleteFiles(removedImages);
    }
    
    // Update payload with cleaned images array
    payload.images = newImages;
  }

  // Handle date conversions
  const updateData: any = { ...payload };
  if (payload.started_at) {
    updateData.started_at = new Date(payload.started_at);
  }
  if (payload.ended_at) {
    updateData.ended_at = new Date(payload.ended_at);
  }

  Object.assign(project, updateData);
  const savedProject = await project.save();

  return await savedProject.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'client', select: '_id name email' },
    { path: 'collaborators', select: '_id name email' }
  ]);
};

export const updateProjects = async (
  ids: string[],
  payload: Partial<{
    status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    is_featured: boolean;
    category: string;
  }>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ _id: { $in: ids } }).lean();
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await Project.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectById = async (id: string) => {
  await connectDB();

  const project = await Project.findById(id);

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  await project.softDelete();

  return null;
};

export const deleteProjectPermanentById = async (id: string): Promise<void> => {
  await connectDB();
  const project = await Project.findById(id).setOptions({ bypassDeleted: true });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Delete associated files
  if (project.thumbnail) {
    deleteFile(project.thumbnail);
  }
  if (project.images && project.images.length > 0) {
    deleteFiles(project.images);
  }

  await Project.findByIdAndDelete(id);
};

export const deleteProjects = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ _id: { $in: ids } }).lean();
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Project.updateMany(
    { _id: { $in: foundIds } },
    { is_deleted: true },
  );

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectsPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ _id: { $in: ids } }).lean();
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  // Delete all associated files
  for (const project of projects) {
    if (project.thumbnail) {
      deleteFile(project.thumbnail);
    }
    if (project.images && project.images.length > 0) {
      deleteFiles(project.images);
    }
  }

  await Project.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreProjectById = async (id: string) => {
  await connectDB();
  const project = await Project.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found or not deleted');
  }

  return project;
};

export const restoreProjects = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await Project.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredProjects = await Project.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredProjects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
