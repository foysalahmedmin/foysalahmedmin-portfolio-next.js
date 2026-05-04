import AppQuery from '@/builder/app-query';
import ProjectResource from './project-resource.model';
import type {
  TProjectResource,
  TProjectResourceDocument,
} from './project-resource.type';

const POPULATE_PROJECT = [{ path: 'project', select: '_id name' }];

export const create = async (
  data: Partial<TProjectResource>,
): Promise<TProjectResourceDocument> => {
  const created = await ProjectResource.create(data);
  return await created.populate(POPULATE_PROJECT);
};

export const findById = async (
  id: string,
): Promise<TProjectResourceDocument | null> => {
  return await ProjectResource.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await ProjectResource.findById(id).populate(POPULATE_PROJECT).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TProjectResourceDocument | null> => {
  return await ProjectResource.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await ProjectResource.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
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

  const populated = await Promise.all(
    result.data.map(async (resource) => {
      return await ProjectResource.findById((resource as { _id: unknown })._id)
        .populate(POPULATE_PROJECT)
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
  payload: Partial<TProjectResource>,
) => {
  return await ProjectResource.updateMany(
    { _id: { $in: ids } },
    { ...payload },
  );
};

export const softDeleteMany = async (ids: string[]) => {
  await ProjectResource.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true },
  );
};

export const restoreById = async (id: string) => {
  return await ProjectResource.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );
};

export const restoreMany = async (ids: string[]) => {
  return await ProjectResource.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
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
