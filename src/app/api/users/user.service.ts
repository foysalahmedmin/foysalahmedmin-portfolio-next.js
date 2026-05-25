import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import type { TJwtPayload } from '@/types/jsonwebtoken.type';
import httpStatus from 'http-status';
import * as FileService from '../files/file.service';
import * as UserRepository from './user.repository';
import type { TUser } from './user.type';

const MODEL = 'User' as const;

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

export const getUser = async (id: string) => {
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
) => {
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
    const newImageId = payload.image ? String(payload.image) : null;
    if (newImageId) {
      await FileService.validateFileIds([newImageId]);
    }
    await FileService.reconcileEntityRefs({
      model: MODEL,
      entity: user._id,
      field: 'image',
      previous: toIdString(data.image),
      next: newImageId,
    });
  }

  return await UserRepository.updateById(user._id, payload);
};

export const updateUser = async (
  id: string,
  payload: Partial<Pick<TUser, 'name' | 'email' | 'image' | 'role' | 'status' | 'is_verified'>>,
) => {
  await connectDB();

  const data = await UserRepository.findById(id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (payload.image !== undefined) {
    const newImageId = payload.image ? String(payload.image) : null;
    if (newImageId) {
      await FileService.validateFileIds([newImageId]);
    }
    await FileService.reconcileEntityRefs({
      model: MODEL,
      entity: id,
      field: 'image',
      previous: toIdString(data.image),
      next: newImageId,
    });
  }

  return await UserRepository.updateById(id, payload);
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

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
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

  await Promise.all(
    foundIds.map((entityId) =>
      FileService.detachAllForEntity({ model: MODEL, entity: entityId }),
    ),
  );

  await UserRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreUser = async (id: string) => {
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
