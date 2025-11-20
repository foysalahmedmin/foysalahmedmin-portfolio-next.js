import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ProjectResourceService from './project-resource.service';

export const getProjectResources = catchAsync(async (req: AuthRequest) => {
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

export const getProjectResourceById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const resource = await ProjectResourceService.getProjectResourceById(params.id);

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

