import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ProjectCategoryService from './project-category.service';

export const getProjectCategories = catchAsync(
  async (req: AuthRequest) => {
    const url = new URL(req.url);
    const queryParams: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const result = await ProjectCategoryService.getProjectCategories(queryParams);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project categories retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  },
);

export const getProjectCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const category = await ProjectCategoryService.getProjectCategoryBySlug(
      params.slug,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category retrieved successfully',
      data: category,
    });
  },
);

export const createProjectCategory = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const category = await ProjectCategoryService.createProjectCategory(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Project category created successfully',
      data: category,
    });
  },
);

export const updateProjectCategoryBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await ProjectCategoryService.updateProjectCategoryBySlug(
      params.slug,
      body,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category updated successfully',
      data: category,
    });
  },
);

export const deleteProjectCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ProjectCategoryService.deleteProjectCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category deleted successfully',
      data: null,
    });
  },
);

