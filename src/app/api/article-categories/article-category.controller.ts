import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ArticleCategoryService from './article-category.service';

export const getArticleCategories = catchAsync(
  async (req: AuthRequest | Request) => {
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
  async (req: AuthRequest | Request, { params }: { params: { slug: string } }) => {
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

export const getArticleCategoryById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const category = await ArticleCategoryService.getArticleCategoryById(
      params.id,
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

export const updateArticleCategoryById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await ArticleCategoryService.updateArticleCategoryById(
      params.id,
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

export const updateArticleCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs, ...payload } = body;
    const result = await ArticleCategoryService.updateArticleCategories(slugs, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article categories updated successfully',
      data: result,
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

export const deleteArticleCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ArticleCategoryService.deleteArticleCategoryById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category deleted successfully',
      data: null,
    });
  },
);

export const deleteArticleCategoryPermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ArticleCategoryService.deleteArticleCategoryPermanent(params.slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteArticleCategoryPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ArticleCategoryService.deleteArticleCategoryPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteArticleCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ArticleCategoryService.deleteArticleCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} article categories deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const deleteArticleCategoriesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ArticleCategoryService.deleteArticleCategoriesPermanent(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} article categories permanently deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const restoreArticleCategory = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const { slug } = params;
    const result = await ArticleCategoryService.restoreArticleCategory(slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category restored successfully',
      data: result,
    });
  },
);

export const restoreArticleCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ArticleCategoryService.restoreArticleCategoryById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article category restored successfully',
      data: result,
    });
  },
);

export const restoreArticleCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ArticleCategoryService.restoreArticleCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} article categories restored successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);
