import type { AuthRequest } from '@/middleware/auth.middleware';
import type { TStorageResult } from '@/middleware/storage.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import path from 'path';
import * as FileService from './file.service';

type SavedFilesRequest = AuthRequest & {
  parsedBody?: any;
  files?: Record<string, File[]>;
  savedFiles?: Record<string, string[]>;
  storages?: TStorageResult[];
};

const buildBaseUrl = (req: AuthRequest | Request): string => {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
};

export const createLocalFile = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || {};
  const fileObj = req.files?.file?.[0];
  const savedPath = req.savedFiles?.file?.[0];

  if (!fileObj || !savedPath) {
    return sendResponse({
      status: httpStatus.BAD_REQUEST,
      success: false,
      message: 'No file uploaded',
      data: null,
    });
  }

  const baseUrl = buildBaseUrl(req);

  const result = await FileService.createLocalFile(
    req.user!,
    {
      filename: path.basename(savedPath),
      originalname: fileObj.name,
      path: savedPath,
      mimetype: fileObj.type,
      size: fileObj.size,
    },
    body,
    baseUrl,
  );

  return sendResponse({
    status: httpStatus.CREATED,
    success: true,
    message: 'File uploaded to local storage successfully',
    data: result,
  });
});

export const createCloudFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || {};
  const storages = req.storages ?? [];

  const result = await FileService.createCloudFiles(req.user!, storages, body);

  return sendResponse({
    status: httpStatus.CREATED,
    success: true,
    message: 'Files uploaded to cloud storage successfully',
    data: result,
  });
});

export const getFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const result = await FileService.getFile(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'File retrieved successfully',
      data: result,
    });
  },
);

export const getFiles = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await FileService.getFiles(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Files retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getSelfFiles = catchAsync(async (req: AuthRequest) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await FileService.getSelfFiles(req.user!, queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Your files retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const updateFile = catchAsync(
  async (
    req: SavedFilesRequest,
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const result = await FileService.updateFile(params.id, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'File updated successfully',
      data: result,
    });
  },
);

export const updateFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids, ...payload } = body;
  const result = await FileService.updateFiles(ids, payload);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Files updated successfully',
    data: result,
  });
});

export const deleteFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await FileService.deleteFile(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'File soft deleted successfully',
      data: null,
    });
  },
);

export const deleteFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids } = body;
  const result = await FileService.deleteFiles(ids);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: `${result.count} files soft deleted successfully`,
    data: { not_found_ids: result.not_found_ids },
  });
});

export const deleteFilePermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await FileService.deleteFilePermanent(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'File and physical storage permanently deleted',
      data: null,
    });
  },
);

export const deleteFilesPermanent = catchAsync(
  async (req: SavedFilesRequest) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await FileService.deleteFilesPermanent(ids);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} files and assets permanently deleted`,
      data: { not_found_ids: result.not_found_ids },
    });
  },
);

export const restoreFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const result = await FileService.restoreFile(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'File restored successfully',
      data: result,
    });
  },
);

export const restoreFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids } = body;
  const result = await FileService.restoreFiles(ids);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: `${result.count} files restored successfully`,
    data: { not_found_ids: result.not_found_ids },
  });
});
