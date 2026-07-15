import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import {
  deleteCloudStorageObject,
  type TCloudinaryResourceType,
  type TStorageResult,
} from '@/lib/storage';
import type { TJwtPayload } from '@/types/jsonwebtoken.type';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import httpStatus from 'http-status';
import type { Types } from 'mongoose';
import { ALLOWED_FILE_MIME_TYPES } from './file.constants';
import * as FileRepository from './file.repository';
import type { TFile, TFileInput, TFileReferenceModel } from './file.type';
import { getExtensionFromFilename, getFileTypeFromMime } from './file.util';

const ALLOWED_MIME_TYPES = new Set<string>(ALLOWED_FILE_MIME_TYPES);

const assertFilesAreUnreferenced = (files: TFile[]): void => {
  const referenced = files.filter((file) => file.references?.length);
  if (!referenced.length) return;

  throw new AppError(
    httpStatus.CONFLICT,
    `Cannot delete referenced file(s): ${referenced.map((file) => file._id?.toString()).join(', ')}`,
  );
};

export type TLocalFileInput = {
  filename: string;
  originalname: string;
  path: string;
  mimetype: string;
  size: number;
};

export const createLocalFile = async (
  user: TJwtPayload,
  fileInput: TLocalFileInput,
  payload: TFileInput,
  baseUrl: string = '',
): Promise<TFile> => {
  await connectDB();

  if (!fileInput) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No file uploaded');
  }

  if (!ALLOWED_MIME_TYPES.has(fileInput.mimetype)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `File type "${fileInput.mimetype}" is not allowed`,
    );
  }

  const normalizedPath = fileInput.path.replace(/\\/g, '/');
  const extension = getExtensionFromFilename(fileInput.filename);
  const fileType = getFileTypeFromMime(fileInput.mimetype, extension);

  const url = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`
    : normalizedPath;

  const data: Partial<TFile> = {
    name: payload.name || fileInput.originalname,
    originalname: fileInput.originalname,
    filename: fileInput.filename,
    url,
    mimetype: fileInput.mimetype,
    size: fileInput.size,
    author: user._id as unknown as Types.ObjectId,
    provider: 'local',
    category: payload.category,
    description: payload.description,
    caption: payload.caption,
    status: payload.status || 'active',
    is_deleted: false,
    metadata: {
      path: normalizedPath,
      extension,
      file_type: fileType,
    },
  };

  return await FileRepository.create(data);
};

export const createCloudFiles = async (
  user: TJwtPayload,
  results: TStorageResult[],
  payload: TFileInput,
): Promise<TFile[]> => {
  await connectDB();

  if (!results || results.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No storage results found');
  }

  const invalidMime = results.find((r) => !ALLOWED_MIME_TYPES.has(r.mimetype));
  if (invalidMime) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `File type "${invalidMime.mimetype}" is not allowed`,
    );
  }

  const data: Partial<TFile>[] = results.map((result) => {
    const extension = getExtensionFromFilename(
      result.filename || result.original_name,
    );
    const fileType = getFileTypeFromMime(result.mimetype, extension);

    return {
      name: payload.name || result.original_name,
      originalname: result.original_name,
      filename: result.filename,
      url: result.public_url,
      mimetype: result.mimetype,
      size: result.size,
      author: user._id as unknown as Types.ObjectId,
      provider: result.provider === 'gcp' ? 'gcs' : result.provider,
      category: payload.category,
      description: payload.description,
      caption: payload.caption,
      status: payload.status || 'active',
      is_deleted: false,
      metadata: {
        bucket: result.bucket,
        storage_key: result.storage_key,
        public_id: result.public_id,
        asset_id: result.asset_id,
        cloud_name: result.cloud_name,
        folder: result.folder,
        resource_type: result.resource_type,
        delivery_type: result.delivery_type,
        format: result.format,
        version: result.version,
        etag: result.etag,
        width: result.width,
        height: result.height,
        duration: result.duration,
        extension,
        file_type: fileType,
      },
    };
  });

  return await FileRepository.createMany(data);
};

export const getFile = async (id: string): Promise<TFile> => {
  await connectDB();

  const result = await FileRepository.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'File not found');
  }

  return result;
};

export const getFiles = async (query: Record<string, unknown>) => {
  await connectDB();

  const typeValue = query.file_type || query.type;
  if (typeValue) {
    query['metadata.file_type'] = typeValue;
    delete query.file_type;
    delete query.type;
  }

  return await FileRepository.findPaginated(query);
};

export const getSelfFiles = async (
  user: TJwtPayload,
  query: Record<string, unknown>,
) => {
  await connectDB();

  const typeValue = query.file_type || query.type;
  if (typeValue) {
    query['metadata.file_type'] = typeValue;
    delete query.file_type;
    delete query.type;
  }

  return await FileRepository.findPaginated(query, { author: user._id });
};

export const updateFile = async (
  id: string,
  payload: Partial<
    Pick<TFile, 'name' | 'description' | 'category' | 'caption' | 'status'>
  >,
): Promise<TFile> => {
  await connectDB();

  const exists = await FileRepository.findByIdLean(id);
  if (!exists) {
    throw new AppError(httpStatus.NOT_FOUND, 'File not found');
  }

  const result = await FileRepository.updateById(id, payload);
  return result!;
};

export const updateFiles = async (
  ids: string[],
  payload: Partial<Pick<TFile, 'status'>>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const files = await FileRepository.findManyByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await FileRepository.updateManyByIds(foundIds, payload);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteFile = async (id: string): Promise<void> => {
  await connectDB();

  const file = await FileRepository.findById(id);
  if (!file) {
    throw new AppError(httpStatus.NOT_FOUND, 'File not found');
  }

  assertFilesAreUnreferenced([file]);
  const deleted = await FileRepository.softDeleteByIdIfUnreferenced(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'File was referenced while deletion was in progress',
    );
  }
};

export const deleteFiles = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const files = await FileRepository.findManyByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertFilesAreUnreferenced(files);
  const result = await FileRepository.softDeleteManyByIds(foundIds);
  if (result.modifiedCount !== foundIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      'One or more files were referenced while deletion was in progress',
    );
  }

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

const removePhysicalFile = async (file: TFile): Promise<void> => {
  if (file.provider === 'local') {
    if (!file.metadata?.path || !file.metadata.path.startsWith('/uploads/')) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Invalid local storage path for file ${file.filename}`,
      );
    }

    const relativePath = file.metadata.path.replace(/^\/+/, '');
    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    const fullPath = path.resolve(process.cwd(), 'public', relativePath);
    if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Unsafe local storage path for file ${file.filename}`,
      );
    }
    try {
      await unlink(fullPath);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'ENOENT') {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          `Failed to delete local file ${file.filename}`,
        );
      }
    }
    return;
  }

  if (file.provider === 'gcs' || file.provider === 'cloudinary') {
    const storageKey =
      file.metadata?.storage_key || file.metadata?.public_id || file.filename;
    if (!storageKey) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Missing storage key for file ${file.filename}`,
      );
    }

    await deleteCloudStorageObject({
      provider: file.provider === 'gcs' ? 'gcp' : file.provider,
      storage_key: storageKey,
      bucket: file.metadata?.bucket,
      resource_type:
        file.metadata?.resource_type ||
        (getCloudinaryResourceType(file.mimetype) as TCloudinaryResourceType),
      delivery_type: file.metadata?.delivery_type,
    });
  }
};

const getCloudinaryResourceType = (
  mimetype: string,
): TCloudinaryResourceType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) {
    return 'video';
  }
  return 'raw';
};

export const deleteFilePermanent = async (id: string): Promise<void> => {
  await connectDB();

  const file = await FileRepository.findDeletedById(id);
  if (!file) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Soft-deleted file not found; soft delete it before permanent deletion',
    );
  }

  assertFilesAreUnreferenced([file]);
  await removePhysicalFile(file);
  await FileRepository.hardDeleteById(id);
};

export const deleteFilesPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const files = await FileRepository.findManyDeletedByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertFilesAreUnreferenced(files);
  for (const file of files) {
    await removePhysicalFile(file);
    await FileRepository.hardDeleteById(file._id!.toString());
  }

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreFile = async (id: string): Promise<TFile> => {
  await connectDB();

  const file = await FileRepository.restoreById(id);
  if (!file) {
    throw new AppError(httpStatus.NOT_FOUND, 'File not found or not deleted');
  }

  return file;
};

export const restoreFiles = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await FileRepository.restoreManyByIds(ids);

  const restored = await FileRepository.findManyByIds(ids);
  const restoredIds = restored.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

// ─── Entity Attachment Helpers ───────────────────────────────────────────────

const normalizeIds = (input?: string | string[] | null): string[] => {
  if (!input) return [];
  return Array.isArray(input) ? input.filter(Boolean) : [input];
};

export const validateFileIds = async (ids: string[]): Promise<void> => {
  await connectDB();

  if (!ids.length) return;

  const found = await FileRepository.findManyByIds(ids);
  const foundIds = new Set(found.map((f) => f._id!.toString()));
  const missing = ids.filter((id) => !foundIds.has(id));

  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `File ID(s) not found: ${missing.join(', ')}`,
    );
  }
};

export const attachToEntity = async (params: {
  fileIds: string | string[] | null | undefined;
  model: TFileReferenceModel;
  entity: string;
  field: string;
}): Promise<void> => {
  await connectDB();

  const ids = normalizeIds(params.fileIds);
  if (!ids.length) return;

  const failedIds = await FileRepository.attachReferences(ids, {
    model: params.model,
    entity: params.entity,
    field: params.field,
  });
  if (failedIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot attach missing or deleted file(s): ${failedIds.join(', ')}`,
    );
  }
};

export const detachFromEntity = async (params: {
  fileIds: string | string[] | null | undefined;
  model: TFileReferenceModel;
  entity: string;
  field?: string;
}): Promise<void> => {
  await connectDB();

  const ids = normalizeIds(params.fileIds);
  if (!ids.length) return;

  await FileRepository.detachReferences(ids, {
    model: params.model,
    entity: params.entity,
    field: params.field,
  });
};

export const reconcileEntityRefs = async (params: {
  model: TFileReferenceModel;
  entity: string;
  field: string;
  previous: string | string[] | null | undefined;
  next: string | string[] | null | undefined;
}): Promise<void> => {
  await connectDB();

  const previousSet = new Set(normalizeIds(params.previous));
  const nextSet = new Set(normalizeIds(params.next));

  const toAttach: string[] = [];
  const toDetach: string[] = [];

  for (const id of nextSet) {
    if (!previousSet.has(id)) toAttach.push(id);
  }
  for (const id of previousSet) {
    if (!nextSet.has(id)) toDetach.push(id);
  }

  if (toAttach.length) {
    const failedIds = await FileRepository.attachReferences(toAttach, {
      model: params.model,
      entity: params.entity,
      field: params.field,
    });
    if (failedIds.length) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Cannot attach missing or deleted file(s): ${failedIds.join(', ')}`,
      );
    }
  }
  if (toDetach.length) {
    await FileRepository.detachReferences(toDetach, {
      model: params.model,
      entity: params.entity,
      field: params.field,
    });
  }
};

export const detachAllForEntity = async (params: {
  model: TFileReferenceModel;
  entity: string;
}): Promise<void> => {
  await connectDB();
  await FileRepository.detachAllForEntity(params);
};
