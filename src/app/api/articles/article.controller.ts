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
  async (req: AuthRequest & { parsedBody?: any; savedFiles?: Record<string, string[]> }) => {
    const body = req.parsedBody || (await req.json());
    const savedFiles = req.savedFiles as Record<string, string[]> | undefined;

    // Get uploaded file paths
    const thumbnail = savedFiles?.thumbnail?.[0] || body.thumbnail || '';
    const images = savedFiles?.images || body.images || [];

    const article = await ArticleService.createArticle({
      ...body,
      thumbnail,
      images,
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
    req: AuthRequest & { parsedBody?: any; savedFiles?: Record<string, string[]> },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const savedFiles = req.savedFiles as Record<string, string[]> | undefined;

    // Get current article to handle file deletion
    const currentArticle = await ArticleService.getArticleById(params.id);

    // Handle file updates
    let thumbnail = body.thumbnail;
    let images = body.images;

    // If new thumbnail uploaded, use it (old one will be deleted in service)
    if (savedFiles?.thumbnail?.[0]) {
      thumbnail = savedFiles.thumbnail[0];
    }

    // If thumbnail is explicitly set to empty/null, delete old one
    if (body.thumbnail === '' || body.thumbnail === null) {
      thumbnail = '';
    }

    // Handle images array
    if (savedFiles?.images && savedFiles.images.length > 0) {
      // If new images uploaded, use them
      images = savedFiles.images;
    } else if (Array.isArray(body.images)) {
      // Use provided images array (may contain paths to keep or "DELETE" markers)
      images = body.images;
    }

    const article = await ArticleService.updateArticleById(params.id, {
      ...body,
      thumbnail,
      images,
    }, currentArticle);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  },
);

export const updateArticles = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
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
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
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
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
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
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
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
