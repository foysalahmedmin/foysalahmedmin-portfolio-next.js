import type { AuthRequest } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import * as VideoCategoryService from "./video-category.service";

export const getVideoCategories = catchAsync(
  async (req: AuthRequest | Request) => {
    const url = new URL(req.url);
    const queryParams: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const result =
      await VideoCategoryService.getVideoCategories(queryParams);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

export const getPublicVideoCategories = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result =
    await VideoCategoryService.getPublicVideoCategories(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Video categories retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getVideoCategoryBySlug = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { slug: string } }
  ) => {
    const category = await VideoCategoryService.getVideoCategoryBySlug(
      params.slug
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category retrieved successfully",
      data: category,
    });
  }
);

export const getPublicVideoCategoryBySlug = catchAsync(
  async (req: Request, { params }: { params: { slug: string } }) => {
    const category =
      await VideoCategoryService.getPublicVideoCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category retrieved successfully",
      data: category,
    });
  }
);

export const getVideoCategoryById = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { id: string } }
  ) => {
    const category = await VideoCategoryService.getVideoCategoryById(
      params.id
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category retrieved successfully",
      data: category,
    });
  }
);

export const getPublicVideoCategoryById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const category =
      await VideoCategoryService.getPublicVideoCategoryByIdentifier(
        params.id
      );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category retrieved successfully",
      data: category,
    });
  }
);

export const createVideoCategory = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());

    const category = await VideoCategoryService.createVideoCategory(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: "Video category created successfully",
      data: category,
    });
  }
);

export const updateVideoCategoryBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } }
  ) => {
    const body = req.parsedBody || (await req.json());

    const category = await VideoCategoryService.updateVideoCategoryBySlug(
      params.slug,
      body
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category updated successfully",
      data: category,
    });
  }
);

export const updateVideoCategoryById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } }
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await VideoCategoryService.updateVideoCategoryById(
      params.id,
      body
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category updated successfully",
      data: category,
    });
  }
);

export const updateVideoCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs, ...payload } = body;
    const result = await VideoCategoryService.updateVideoCategories(
      slugs,
      payload
    );
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video categories updated successfully",
      data: result,
    });
  }
);

export const deleteVideoCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await VideoCategoryService.deleteVideoCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category deleted successfully",
      data: null,
    });
  }
);

export const deleteVideoCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await VideoCategoryService.deleteVideoCategoryById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category deleted successfully",
      data: null,
    });
  }
);

export const deleteVideoCategoryPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await VideoCategoryService.deleteVideoCategoryPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category permanently deleted successfully",
      data: null,
    });
  }
);

export const deleteVideoCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await VideoCategoryService.deleteVideoCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} video categories deleted successfully`,
      data: result,
    });
  }
);

export const deleteVideoCategoriesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result =
      await VideoCategoryService.deleteVideoCategoriesPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} video categories permanently deleted successfully`,
      data: result,
    });
  }
);

export const restoreVideoCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await VideoCategoryService.restoreVideoCategoryById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Video category restored successfully",
      data: result,
    });
  }
);

export const restoreVideoCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await VideoCategoryService.restoreVideoCategories(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} video categories restored successfully`,
      data: result,
    });
  }
);
