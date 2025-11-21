import connectDB from '@/lib/db';
import httpStatus from 'http-status';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import { TJwtPayload } from '@/types/jsonwebtoken.type';
import { User } from './user.model';
import { TUser } from './user.type';
import { deleteFile } from '@/utils/fileUtils';

export const getUser = async (id: string): Promise<TUser> => {
  await connectDB();
  const result = await User.findById(id).lean();
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};

export const getUsers = async (
  query: Record<string, unknown>,
): Promise<{
  data: TUser[];
  meta: { total: number; page: number; limit: number };
}> => {
  await connectDB();
  const userQuery = new AppQuery<TUser>(User.find(), query)
    .search(['name', 'email', 'image'])
    .filter()
    .sort()
    .paginate()
    .fields()
    .tap((q) => q.lean());

  const result = await userQuery.execute();

  return result;
};

export const updateSelf = async (
  user: TJwtPayload,
  payload: Partial<Pick<TUser, 'name' | 'email' | 'image'>>,
): Promise<TUser> => {
  await connectDB();
  const data = await User.findById(user._id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (payload.email && data.email !== payload.email) {
    const emailExists = await User.findOne({ email: payload.email }).lean();
    if (emailExists) {
      throw new AppError(httpStatus.CONFLICT, 'Email already exists');
    }
  }

  // Handle file deletion/replacement
  // Delete old image if it's being replaced or removed
  if (payload.image !== undefined) {
    if (data.image && data.image !== payload.image) {
      deleteFile(data.image);
    }
    // If image is explicitly set to empty/null, delete old one
    if (payload.image === '' || payload.image === null) {
      if (data.image) {
        deleteFile(data.image);
      }
    }
  }

  const result = await User.findByIdAndUpdate(user._id, payload, {
    new: true,
    runValidators: true,
  });

  return result!;
};

export const updateUser = async (
  id: string,
  payload: Partial<
    Pick<TUser, 'name' | 'email' | 'image' | 'role' | 'status' | 'is_verified'>
  >,
): Promise<TUser> => {
  await connectDB();
  const data = await User.findById(id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Handle file deletion/replacement
  // Delete old image if it's being replaced or removed
  if (payload.image !== undefined) {
    if (data.image && data.image !== payload.image) {
      deleteFile(data.image);
    }
    // If image is explicitly set to empty/null, delete old one
    if (payload.image === '' || payload.image === null) {
      if (data.image) {
        deleteFile(data.image);
      }
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updatedUser!;
};

export const updateUsers = async (
  ids: string[],
  payload: Partial<Pick<TUser, 'role' | 'status' | 'is_verified'>>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const users = await User.find({ _id: { $in: ids } }).lean();
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await User.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteUser = async (id: string): Promise<void> => {
  await connectDB();
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  await user.softDelete();
};

export const deleteUserPermanent = async (id: string): Promise<void> => {
  await connectDB();
  const user = await User.findById(id).setOptions({ bypassDeleted: true });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Delete associated files
  if (user.image) {
    deleteFile(user.image);
  }

  await User.findByIdAndDelete(id);
};

export const deleteUsers = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const users = await User.find({ _id: { $in: ids } }).lean();
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await User.updateMany({ _id: { $in: foundIds } }, { is_deleted: true });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteUsersPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const users = await User.find({ _id: { $in: ids } }).lean();
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  // Delete all associated files
  for (const user of users) {
    if (user.image) {
      deleteFile(user.image);
    }
  }

  await User.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreUser = async (id: string): Promise<TUser> => {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found or not deleted');
  }

  return user;
};

export const restoreUsers = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await User.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredUsers = await User.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredUsers.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

