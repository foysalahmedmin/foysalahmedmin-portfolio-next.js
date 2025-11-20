import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
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

export const getArticleBySlug = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { slug: string } }) => {
    const article = await ArticleService.getArticleBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article retrieved successfully',
      data: article,
    });
  },
);

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
  async (req: AuthRequest & { parsedBody?: any }) => {
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

export const updateArticleBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const article = await ArticleService.updateArticleBySlug(params.slug, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  },
);

export const updateArticleById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
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
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs, ...payload } = body;
    const result = await ArticleService.updateArticles(slugs, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Articles updated successfully',
      data: result,
    });
  },
);

export const deleteArticleBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ArticleService.deleteArticleBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article deleted successfully',
      data: null,
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

export const deleteArticlePermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await ArticleService.deleteArticlePermanent(params.slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article permanently deleted successfully',
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
    const { slugs } = body;
    const result = await ArticleService.deleteArticles(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const deleteArticlesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await ArticleService.deleteArticlesPermanent(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles permanently deleted successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);

export const restoreArticle = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const { slug } = params;
    const result = await ArticleService.restoreArticle(slug);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Article restored successfully',
      data: result,
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
    const { slugs } = body;
    const result = await ArticleService.restoreArticles(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} articles restored successfully`,
      data: {
        not_found_slugs: result.not_found_slugs,
      },
    });
  },
);
