import AppError from '@/builder/app-error';
import { getStorageAdapter } from '@/lib/storage';
import type {
  TCloudStorageProvider,
  TStorageFile,
  TStorageResult,
} from '@/lib/storage/storage.type';
import httpStatus from 'http-status';
import type { NextRequest, NextResponse } from 'next/server';

export type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageDeleteInput,
  TStorageFile,
  TStorageResult,
} from '@/lib/storage/storage.type';

const parseMultipartBody = (
  formData: FormData,
): Record<string, string | string[]> => {
  const parsedBody: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const current = parsedBody[key];
    parsedBody[key] = current
      ? Array.isArray(current)
        ? [...current, value]
        : [current, value]
      : value;
  }
  return parsedBody;
};

const collectAndValidateFiles = (
  formData: FormData,
  files: TStorageFile[],
): Record<string, File[]> => {
  const collected: Record<string, File[]> = {};

  for (const config of files) {
    const fieldFiles = formData
      .getAll(config.name)
      .filter((entry): entry is File => entry instanceof File);

    for (const entry of fieldFiles) {
      if (config.allowed_types && !config.allowed_types.includes(entry.type)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Invalid file type for field "${config.name}". Allowed types: ${config.allowed_types.join(', ')}`,
        );
      }
      if (config.max_size && entry.size > config.max_size) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `File "${config.name}" exceeds maximum size of ${config.max_size} bytes`,
        );
      }
      if (config.min_size && entry.size < config.min_size) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `File "${config.name}" is below minimum size of ${config.min_size} bytes`,
        );
      }
    }

    if (config.min_count && fieldFiles.length < config.min_count) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `At least ${config.min_count} file(s) required for field "${config.name}"`,
      );
    }
    if (config.max_count && fieldFiles.length > config.max_count) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Maximum ${config.max_count} file(s) allowed for field "${config.name}"`,
      );
    }
    if (fieldFiles.length) collected[config.name] = fieldFiles;
  }

  return collected;
};

export const storage = (...files: TStorageFile[]) => {
  return async (
    req: NextRequest,
    handler: (
      req: NextRequest & {
        storages?: TStorageResult[];
        storageUploadsCommitted?: boolean;
      },
    ) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    const uploaded: TStorageResult[] = [];
    let handlerStarted = false;
    try {
      const formData = await req.formData();
      const parsedBody = parseMultipartBody(formData);
      const collected = collectAndValidateFiles(formData, files);
      const adapter = getStorageAdapter();

      for (const config of files) {
        for (const file of collected[config.name] || []) {
          uploaded.push(await adapter.upload(file, config));
        }
      }

      const modifiedReq = Object.assign(req, {
        storages: uploaded,
        parsedBody,
        storageProvider: adapter.provider,
      }) as NextRequest & {
        storages?: TStorageResult[];
        parsedBody?: Record<string, string | string[]>;
        storageProvider?: TCloudStorageProvider;
        storageUploadsCommitted?: boolean;
      };

      handlerStarted = true;
      return await handler(modifiedReq);
    } catch (error) {
      const uploadsCommitted = (
        req as NextRequest & { storageUploadsCommitted?: boolean }
      ).storageUploadsCommitted;
      if (uploaded.length && !uploadsCommitted) {
        await Promise.allSettled(
          uploaded.map((result) =>
            getStorageAdapter(result.provider).remove(result),
          ),
        );
      }
      if (error instanceof AppError) throw error;
      if (handlerStarted) throw error;
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        'Cloud storage upload failed',
      );
    }
  };
};
