import type { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import * as ProjectCategoryService from './project-category.service';

export const getProjectCategories = catchAsync(
  async (req: AuthRequest | Request) => {
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

export const getPublicProjectCategories = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result =
    await ProjectCategoryService.getPublicProjectCategories(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Project categories retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getProjectCategoryBySlug = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { slug: string } }) => {
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

export const getPublicProjectCategoryBySlug = catchAsync(
  async (req: Request, { params }: { params: { slug: string } }) => {
    const category =
      await ProjectCategoryService.getPublicProjectCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category retrieved successfully',
      data: category,
    });
  },
);

export const getProjectCategoryById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const category = await ProjectCategoryService.getProjectCategoryById(
      params.id,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category retrieved successfully',
      data: category,
    });
  },
);

export const getPublicProjectCategoryById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const category =
      await ProjectCategoryService.getPublicProjectCategoryById(params.id);

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

export const updateProjectCategoryById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await ProjectCategoryService.updateProjectCategoryById(
      params.id,
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

export const updateProjectCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs, ...payload } = body;
    const result = await ProjectCategoryService.updateProjectCategories(slugs, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project categories updated successfully',
      data: result,
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

export const deleteProjectCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectCategoryService.deleteProjectCategoryById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectCategoryPermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ProjectCategoryService.deleteProjectCategoryPermanent(params.slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectCategoryPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ProjectCategoryService.deleteProjectCategoryPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteProjectCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ProjectCategoryService.deleteProjectCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project categories deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const deleteProjectCategoriesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ProjectCategoryService.deleteProjectCategoriesPermanent(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project categories permanently deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const restoreProjectCategory = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const { slug } = params;
    const result = await ProjectCategoryService.restoreProjectCategory(slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category restored successfully',
      data: result,
    });
  },
);

export const restoreProjectCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ProjectCategoryService.restoreProjectCategoryById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Project category restored successfully',
      data: result,
    });
  },
);

export const restoreProjectCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ProjectCategoryService.restoreProjectCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} project categories restored successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);
