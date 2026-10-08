import type { AuthRequest } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import * as VideoService from "./video.service";

export const getVideos = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await VideoService.getVideos(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Videos retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getPublicVideos = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await VideoService.getPublicVideoDiscovery(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Videos retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getVideoById = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { id: string } }
  ) => {
    const video = await VideoService.getVideoById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video retrieved successfully",
      data: video,
    });
  }
);

export const getPublicVideoById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const video = await VideoService.getPublicVideoByIdentifier(
      params.id
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video retrieved successfully",
      data: video,
    });
  }
);

export const createVideo = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());

    const video = await VideoService.createVideo(
      {
        ...body,
        author: req.user?._id || req.user?.id,
      },
      req.user!
    );

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: "Video created successfully",
      data: video,
    });
  }
);

export const updateVideoById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: Record<string, unknown> },
    { params }: { params: { id: string } }
  ) => {
    const body = req.parsedBody || (await req.json());

    const video = await VideoService.updateVideoById(
      params.id,
      body,
      req.user!
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  }
);

export const updateVideos = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body as {
      ids: string[];
      [key: string]: unknown;
    };
    const result = await VideoService.updateVideos(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Videos updated successfully",
      data: result,
    });
  }
);

export const deleteVideoById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await VideoService.deleteVideoById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video deleted successfully",
      data: null,
    });
  }
);

export const deleteVideoPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await VideoService.deleteVideoPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video permanently deleted successfully",
      data: null,
    });
  }
);

export const deleteVideos = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await VideoService.deleteVideos(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} videos deleted successfully`,
      data: result,
    });
  }
);

export const deleteVideosPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await VideoService.deleteVideosPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} videos permanently deleted successfully`,
      data: result,
    });
  }
);

export const restoreVideoById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await VideoService.restoreVideoById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video restored successfully",
      data: result,
    });
  }
);

export const restoreVideos = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await VideoService.restoreVideos(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} videos restored successfully`,
      data: result,
    });
  }
);
