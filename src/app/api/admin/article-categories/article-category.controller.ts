import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ArticleCategoryService from './article-category.service';

export const getArticleCategories = catchAsync(
  async (req: AuthRequest) => {
    const url = new URL(req.url);
    const queryParams: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const result = await ArticleCategoryService.getArticleCategories(queryParams);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article categories retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  },
);

export const getArticleCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const category = await ArticleCategoryService.getArticleCategoryBySlug(
      params.slug,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category retrieved successfully',
      data: category,
    });
  },
);

export const createArticleCategory = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const category = await ArticleCategoryService.createArticleCategory(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Article category created successfully',
      data: category,
    });
  },
);

export const updateArticleCategoryBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await ArticleCategoryService.updateArticleCategoryBySlug(
      params.slug,
      body,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category updated successfully',
      data: category,
    });
  },
);

export const deleteArticleCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ArticleCategoryService.deleteArticleCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category deleted successfully',
      data: null,
    });
  },
);

