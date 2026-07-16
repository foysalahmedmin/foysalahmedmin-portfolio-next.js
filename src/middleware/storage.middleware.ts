import {
  acquireUploadConcurrencySlot,
  assertEarlyUploadRequest,
  getManagedUploadLimits,
  prepareManagedMedia,
  type TPreparedManagedMedia,
} from "@/app/api/files/managed-media.service";
import { isFilePurpose } from "@/app/api/files/managed-media.policy";
import AppError from "@/builder/app-error";
import type { TStorageFile } from "@/lib/storage/storage.type";
import httpStatus from "http-status";
import type { NextRequest, NextResponse } from "next/server";

export type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageDeleteInput,
  TStorageFile,
  TStorageResult,
} from "@/lib/storage/storage.type";

export type TPreparedStorageMedia = TPreparedManagedMedia & {
  field_name: string;
  storage: Pick<TStorageFile, "bucket" | "folder">;
};

type TStorageRequest = NextRequest & {
  preparedMedia?: TPreparedStorageMedia[];
  parsedBody?: Record<string, string | string[]>;
};

const parseMultipartBody = (
  formData: FormData
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

const getPurpose = (
  config: TStorageFile,
  body: Record<string, string | string[]>
) => {
  const fieldValue = config.purpose_field
    ? body[config.purpose_field]
    : undefined;
  if (Array.isArray(fieldValue)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Media purpose must be singular"
    );
  }
  const purpose = fieldValue || config.purpose || "generic";
  if (!isFilePurpose(purpose)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unsupported media purpose");
  }
  return purpose;
};

const collectFiles = (
  formData: FormData,
  configs: readonly TStorageFile[]
): Map<TStorageFile, File[]> => {
  const configuredNames = new Set(configs.map(({ name }) => name));
  let total = 0;
  for (const [name, entry] of formData.entries()) {
    if (!(entry instanceof File)) continue;
    total += 1;
    if (!configuredNames.has(name)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Unexpected upload field");
    }
  }
  if (total > getManagedUploadLimits().max_files) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Too many files in upload request"
    );
  }

  const collected = new Map<TStorageFile, File[]>();
  for (const config of configs) {
    const fieldFiles = formData
      .getAll(config.name)
      .filter((entry): entry is File => entry instanceof File);
    if (config.min_count && fieldFiles.length < config.min_count) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `At least ${config.min_count} file(s) are required`
      );
    }
    if (config.max_count && fieldFiles.length > config.max_count) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `At most ${config.max_count} file(s) are allowed`
      );
    }
    for (const file of fieldFiles) {
      if (config.max_size && file.size > config.max_size) {
        throw new AppError(
          httpStatus.REQUEST_ENTITY_TOO_LARGE,
          "Media file is too large"
        );
      }
      if (config.min_size && file.size < config.min_size) {
        throw new AppError(httpStatus.BAD_REQUEST, "Media file is too small");
      }
    }
    collected.set(config, fieldFiles);
  }
  return collected;
};

export const storage = (...files: TStorageFile[]) => {
  const names = files.map(({ name }) => name);
  if (!files.length || new Set(names).size !== names.length) {
    throw new Error("Storage middleware requires unique configured fields");
  }

  return async (
    req: NextRequest,
    handler: (req: TStorageRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    assertEarlyUploadRequest(req);
    const release = acquireUploadConcurrencySlot();
    try {
      // Content-Length and process concurrency are checked before this call,
      // because Next's FormData parser buffers multipart bodies.
      const formData = await req.formData();
      const parsedBody = parseMultipartBody(formData);
      const collected = collectFiles(formData, files);
      const preparedMedia: TPreparedStorageMedia[] = [];

      // Sequential decode bounds per-request native-memory pressure. Global
      // request concurrency is capped above.
      for (const config of files) {
        const purpose = getPurpose(config, parsedBody);
        for (const file of collected.get(config) || []) {
          const prepared = await prepareManagedMedia({ file, purpose });
          preparedMedia.push({
            ...prepared,
            field_name: config.name,
            storage: { bucket: config.bucket, folder: config.folder },
          });
        }
      }

      const modifiedReq = Object.assign(req, {
        preparedMedia,
        parsedBody,
      }) as TStorageRequest;
      return await handler(modifiedReq);
    } finally {
      release();
    }
  };
};
