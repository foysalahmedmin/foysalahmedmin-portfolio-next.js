import connectDB from '@/lib/db';
import Project from './project.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TProjectDocument } from './project.type';

export const getProjects = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TProjectDocument>(
    Project.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'started_at'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (project: any) => {
      return await Project.findById(project._id)
        .populate('author', 'name email image')
        .populate('category', 'name slug')
        .populate('client', 'name email image')
        .populate('collaborators', 'name email')
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getProjectBySlug = async (slug: string) => {
  await connectDB();

  const project = await Project.findOne({ slug })
    .populate('author', 'name email image')
    .populate('category', 'name slug')
    .populate('client', 'name email image')
    .populate('collaborators', 'name email')
    .lean();

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

export const createProject = async (payload: {
  name: string;
  slug: string;
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

  const existingProject = await Project.findOne({ slug: payload.slug });

  if (existingProject) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Project with this slug already exists',
    );
  }

  const project = await Project.create({
    ...payload,
    status: payload.status || 'planned',
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    started_at: payload.started_at ? new Date(payload.started_at) : undefined,
    ended_at: payload.ended_at ? new Date(payload.ended_at) : undefined,
    layout: payload.layout || 'default',
  });

  return await project
    .populate('author', 'name email')
    .populate('category', 'name slug')
    .populate('client', 'name email')
    .populate('collaborators', 'name email');
};

export const updateProjectBySlug = async (
  slug: string,
  payload: Partial<{
    name: string;
    slug: string;
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
) => {
  await connectDB();

  const project = await Project.findOne({ slug });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Check if new slug conflicts with existing project
  if (payload.slug && payload.slug !== slug) {
    const existingProject = await Project.findOne({ slug: payload.slug });
    if (existingProject) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Project with this slug already exists',
      );
    }
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
  await project.save();

  return await project
    .populate('author', 'name email')
    .populate('category', 'name slug')
    .populate('client', 'name email')
    .populate('collaborators', 'name email');
};

export const updateProjects = async (
  slugs: string[],
  payload: Partial<{
    status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    is_featured: boolean;
    category: string;
  }>,
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = projects.map((project) => project.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  const result = await Project.updateMany(
    { slug: { $in: foundSlugs } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteProjectBySlug = async (slug: string) => {
  await connectDB();

  const project = await Project.findOne({ slug });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  await project.softDelete();

  return null;
};

export const deleteProjectPermanent = async (slug: string): Promise<void> => {
  await connectDB();
  const project = await Project.findOne({ slug }).setOptions({ bypassDeleted: true });
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  await Project.findByIdAndDelete(project._id);
};

export const deleteProjects = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = projects.map((project) => project.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await Project.updateMany(
    { slug: { $in: foundSlugs } },
    { is_deleted: true },
  );

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const deleteProjectsPermanent = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const projects = await Project.find({ slug: { $in: slugs } }).lean();
  const foundSlugs = projects.map((project) => project.slug);
  const notFoundSlugs = slugs.filter((slug) => !foundSlugs.includes(slug));

  await Project.deleteMany({ slug: { $in: foundSlugs } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundSlugs.length,
    not_found_slugs: notFoundSlugs,
  };
};

export const restoreProject = async (slug: string) => {
  await connectDB();
  const project = await Project.findOneAndUpdate(
    { slug, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found or not deleted');
  }

  return project;
};

export const restoreProjects = async (
  slugs: string[],
): Promise<{
  count: number;
  not_found_slugs: string[];
}> => {
  await connectDB();
  const result = await Project.updateMany(
    { slug: { $in: slugs }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredProjects = await Project.find({ slug: { $in: slugs } }).lean();
  const restoredSlugs = restoredProjects.map((project) => project.slug);
  const notFoundSlugs = slugs.filter((slug) => !restoredSlugs.includes(slug));

  return {
    count: result.modifiedCount,
    not_found_slugs: notFoundSlugs,
  };
};
