import type { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import * as ProjectResourceService from './project-resource.service';

export const getProjectResources = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ProjectResourceService.getProjectResources(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Project resources retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getPublicProjectResources = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result =
    await ProjectResourceService.getPublicProjectResources(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Project resources retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getProjectResourceById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const resource = await ProjectResourceService.getProjectResourceById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource retrieved successfully',
      data: resource,
    });
  },
);

export const getPublicProjectResourceById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const resource =
      await ProjectResourceService.getPublicProjectResourceById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource retrieved successfully',
      data: resource,
    });
  },
);

export const createProjectResource = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const resource = await ProjectResourceService.createProjectResource(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Project resource created successfully',
      data: resource,
    });
  },
);

export const updateProjectResourceById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const resource = await ProjectResourceService.updateProjectResourceById(
      params.id,
      body,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource updated successfully',
      data: resource,
    });
  },
);

export const updateProjectResources = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
    const result = await ProjectResourceService.updateProjectResources(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resources updated successfully',
      data: result,
    });
  },
);

export const deleteProjectResourceById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectResourceService.deleteProjectResourceById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectResourcePermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectResourceService.deleteProjectResourcePermanent(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectResources = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectResourceService.deleteProjectResources(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project resources deleted successfully`,
      data: result,
    });
  },
);

export const deleteProjectResourcesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectResourceService.deleteProjectResourcesPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project resources permanently deleted successfully`,
      data: result,
    });
  },
);

export const restoreProjectResource = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ProjectResourceService.restoreProjectResource(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project resource restored successfully',
      data: result,
    });
  },
);

export const restoreProjectResources = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectResourceService.restoreProjectResources(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project resources restored successfully`,
      data: result,
    });
  },
);
