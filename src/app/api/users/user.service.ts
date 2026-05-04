import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import type { TJwtPayload } from '@/types/jsonwebtoken.type';
import { deleteFile } from '@/utils/file-utils';
import httpStatus from 'http-status';
import * as UserRepository from './user.repository';
import type { TUser } from './user.type';

export const getUser = async (id: string): Promise<TUser> => {
  await connectDB();
  const result = await UserRepository.findByIdLean(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};

export const getUsers = async (query: Record<string, unknown>) => {
  await connectDB();
  return await UserRepository.findPaginated(query);
};

export const updateSelf = async (
  user: TJwtPayload,
  payload: Partial<Pick<TUser, 'name' | 'email' | 'image'>>,
): Promise<TUser> => {
  await connectDB();

  const data = await UserRepository.findById(user._id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (payload.email && data.email !== payload.email) {
    const emailExists = await UserRepository.findByEmail(payload.email);
    if (emailExists) {
      throw new AppError(httpStatus.CONFLICT, 'Email already exists');
    }
  }

  if (payload.image !== undefined) {
    if (data.image && data.image !== payload.image) {
      deleteFile(data.image);
    }
    if (payload.image === '' || payload.image === null) {
      if (data.image) {
        deleteFile(data.image);
      }
    }
  }

  const result = await UserRepository.updateById(user._id, payload);
  return result!;
};

export const updateUser = async (
  id: string,
  payload: Partial<
    Pick<TUser, 'name' | 'email' | 'image' | 'role' | 'status' | 'is_verified'>
  >,
): Promise<TUser> => {
  await connectDB();

  const data = await UserRepository.findById(id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (payload.image !== undefined) {
    if (data.image && data.image !== payload.image) {
      deleteFile(data.image);
    }
    if (payload.image === '' || payload.image === null) {
      if (data.image) {
        deleteFile(data.image);
      }
    }
  }

  const updated = await UserRepository.updateById(id, payload);
  return updated!;
};

export const updateUsers = async (
  ids: string[],
  payload: Partial<Pick<TUser, 'role' | 'status' | 'is_verified'>>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await UserRepository.updateMany(foundIds, payload);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteUser = async (id: string): Promise<void> => {
  await connectDB();
  const user = await UserRepository.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  await user.softDelete();
};

export const deleteUserPermanent = async (id: string): Promise<void> => {
  await connectDB();
  const user = await UserRepository.findByIdWithDeleted(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.image) {
    deleteFile(user.image);
  }

  await UserRepository.hardDeleteById(id);
};

export const deleteUsers = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await UserRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteUsersPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  for (const user of users) {
    if (user.image) {
      deleteFile(user.image);
    }
  }

  await UserRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreUser = async (id: string): Promise<TUser> => {
  await connectDB();

  const user = await UserRepository.restoreById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found or not deleted');
  }

  return user;
};

export const restoreUsers = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const result = await UserRepository.restoreMany(ids);

  const restored = await UserRepository.findManyByIds(ids);
  const restoredIds = restored.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
