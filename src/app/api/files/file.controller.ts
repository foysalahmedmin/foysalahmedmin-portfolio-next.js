import type { TPreparedStorageMedia } from "@/middleware/storage.middleware";
import type { AuthRequest } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import * as FileService from "./file.service";

type SavedFilesRequest = AuthRequest & {
  parsedBody?: any;
  files?: Record<string, File[]>;
  savedFiles?: Record<string, string[]>;
  preparedMedia?: TPreparedStorageMedia[];
};

export const createManagedFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || {};
  const preparedMedia = req.preparedMedia ?? [];

  const result = await FileService.createManagedFiles(
    req.user!,
    preparedMedia,
    body
  );

  return sendResponse({
    status: httpStatus.CREATED,
    success: true,
    message: "Media ingested successfully",
    data: result,
  });
});

export const getFileDelivery = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const rawTtl = new URL(req.url).searchParams.get("expires_in");
    const result = await FileService.getFileDelivery(
      params.id,
      req.user,
      rawTtl ? Number(rawTtl) : undefined
    );
    const response = sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Media delivery created successfully",
      data: result,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }
);

export const getFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const result = await FileService.getFile(params.id, req.user!);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "File retrieved successfully",
      data: result,
    });
  }
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
    message: "Files retrieved successfully",
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
    message: "Your files retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const updateFile = catchAsync(
  async (req: SavedFilesRequest, { params }: { params: { id: string } }) => {
    const body = req.parsedBody || (await req.json());
    const result = await FileService.updateFile(req.user!, params.id, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "File updated successfully",
      data: result,
    });
  }
);

export const updateFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids, ...payload } = body;
  const result = await FileService.updateFiles(ids, payload);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Files updated successfully",
    data: result,
  });
});

export const deleteFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await FileService.deleteFile(req.user!, params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "File soft deleted successfully",
      data: null,
    });
  }
);

export const deleteFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids } = body;
  const result = await FileService.deleteFiles(ids);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: `${result.count} files soft deleted successfully`,
    data: result,
  });
});

export const deleteFilePermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await FileService.deleteFilePermanent(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "File and physical storage permanently deleted",
      data: null,
    });
  }
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
      data: result,
    });
  }
);

export const restoreFile = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const result = await FileService.restoreFile(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "File restored successfully",
      data: result,
    });
  }
);

export const restoreFiles = catchAsync(async (req: SavedFilesRequest) => {
  const body = req.parsedBody || (await req.json());
  const { ids } = body;
  const result = await FileService.restoreFiles(ids);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: `${result.count} files restored successfully`,
    data: result,
  });
});

export const reconcileFailedMedia = catchAsync(async () => {
  const result = await FileService.reconcileFailedManagedMedia();
  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Managed media reconciliation completed",
    data: result,
  });
});
