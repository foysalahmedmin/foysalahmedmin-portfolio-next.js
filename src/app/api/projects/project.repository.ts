import AppQuery from '@/builder/app-query';
import Project from './project.model';
import type { TProject, TProjectDocument } from './project.type';

const POPULATE_FIELDS = [
  { path: 'author', select: '_id name email image' },
  { path: 'category', select: '_id name' },
  { path: 'client', select: '_id name email image' },
  { path: 'collaborators', select: '_id name email' },
];

export const create = async (
  data: Partial<TProject>,
): Promise<TProjectDocument> => {
  const created = await Project.create(data);
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (
  id: string,
): Promise<TProjectDocument | null> => {
  return await Project.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await Project.findById(id).populate(POPULATE_FIELDS).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TProjectDocument | null> => {
  return await Project.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await Project.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TProjectDocument>(Project.find(), queryParams);

  const result = await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'started_at'])
    .paginate()
    .fields()
    .execute();

  const populated = await Promise.all(
    result.data.map(async (project) => {
      return await Project.findById((project as { _id: unknown })._id)
        .populate(POPULATE_FIELDS)
        .lean();
    }),
  );

  return {
    data: populated,
    meta: result.meta,
  };
};

export const updateMany = async (
  ids: string[],
  payload: Partial<TProject>,
) => {
  return await Project.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  await Project.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await Project.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );
};

export const restoreMany = async (ids: string[]) => {
  return await Project.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await Project.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await Project.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
