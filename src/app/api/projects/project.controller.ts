import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ProjectService from './project.service';

export const getProjects = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ProjectService.getProjects(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Projects retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getProjectById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const project = await ProjectService.getProjectById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    });
  },
);

export const createProject = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const project = await ProjectService.createProject({
      ...body,
      author: req.user?._id || req.user?.id,
    });

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  },
);

export const updateProjectById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const project = await ProjectService.updateProjectById(params.id, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  },
);

export const updateProjects = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
    const result = await ProjectService.updateProjects(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Projects updated successfully',
      data: result,
    });
  },
);

export const deleteProjectById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectService.deleteProjectById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectService.deleteProjectPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteProjects = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectService.deleteProjects(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const deleteProjectsPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectService.deleteProjectsPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects permanently deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const restoreProjectById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ProjectService.restoreProjectById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project restored successfully',
      data: result,
    });
  },
);

export const restoreProjects = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ProjectService.restoreProjects(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects restored successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);
