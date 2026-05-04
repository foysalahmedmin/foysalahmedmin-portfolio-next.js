import type { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import * as ArticleService from './article.service';

export const getArticles = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ArticleService.getArticles(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Articles retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getArticleById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const article = await ArticleService.getArticleById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article retrieved successfully',
      data: article,
    });
  },
);

export const createArticle = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());

    const article = await ArticleService.createArticle({
      ...body,
      author: req.user?._id || req.user?.id,
    });

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  },
);

export const updateArticleById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: Record<string, unknown> },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());

    const article = await ArticleService.updateArticleById(params.id, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  },
);

export const updateArticles = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body as { ids: string[]; [key: string]: unknown };
    const result = await ArticleService.updateArticles(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Articles updated successfully',
      data: result,
    });
  },
);

export const deleteArticleById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ArticleService.deleteArticleById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article deleted successfully',
      data: null,
    });
  },
);

export const deleteArticlePermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ArticleService.deleteArticlePermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteArticles = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await ArticleService.deleteArticles(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const deleteArticlesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await ArticleService.deleteArticlesPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles permanently deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const restoreArticleById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ArticleService.restoreArticleById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article restored successfully',
      data: result,
    });
  },
);

export const restoreArticles = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await ArticleService.restoreArticles(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles restored successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);
