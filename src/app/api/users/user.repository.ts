import AppQuery from '@/builder/app-query';
import { User } from './user.model';
import type { TUser, TUserDocument } from './user.type';

const FILE_SELECT = '_id url filename mimetype size provider metadata';

export const create = async (data: Partial<TUser>): Promise<TUserDocument> => {
  return await User.create(data);
};

export const findById = async (id: string): Promise<TUserDocument | null> => {
  return await User.findById(id);
};

export const findByIdLean = async (id: string) => {
  return await User.findById(id)
    .populate({ path: 'image', select: FILE_SELECT })
    .lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TUserDocument | null> => {
  return await User.findById(id).setOptions({ bypassDeleted: true });
};

export const findByEmail = async (email: string) => {
  return await User.findOne({ email }).lean();
};

export const findManyByIds = async (ids: string[]) => {
  return await User.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const userQuery = new AppQuery<TUser>(User.find(), queryParams)
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.execute();

  const populated = await Promise.all(
    result.data.map(async (user) => {
      return await User.findById((user as unknown as { _id: unknown })._id)
        .populate({ path: 'image', select: FILE_SELECT })
        .lean();
    }),
  );

  return { data: populated, meta: result.meta };
};

export const updateById = async (id: string, payload: Partial<TUser>) => {
  return await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate({ path: 'image', select: FILE_SELECT });
};

export const updateMany = async (ids: string[], payload: Partial<TUser>) => {
  return await User.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  await User.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await User.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );
};

export const restoreMany = async (ids: string[]) => {
  return await User.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await User.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await User.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
