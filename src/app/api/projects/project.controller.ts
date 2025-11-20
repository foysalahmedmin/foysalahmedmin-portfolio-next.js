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

export const getProjectBySlug = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { slug: string } }) => {
    const project = await ProjectService.getProjectBySlug(params.slug);

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

export const updateProjectBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const project = await ProjectService.updateProjectBySlug(params.slug, body);

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
    const { slugs, ...payload } = body;
    const result = await ProjectService.updateProjects(slugs, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Projects updated successfully',
      data: result,
    });
  },
);

export const deleteProjectBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ProjectService.deleteProjectBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectPermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ProjectService.deleteProjectPermanent(params.slug);
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
    const { slugs } = body;
    const result = await ProjectService.deleteProjects(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const deleteProjectsPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ProjectService.deleteProjectsPermanent(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects permanently deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const restoreProject = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const { slug } = params;
    const result = await ProjectService.restoreProject(slug);
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
    const { slugs } = body;
    const result = await ProjectService.restoreProjects(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} projects restored successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);
