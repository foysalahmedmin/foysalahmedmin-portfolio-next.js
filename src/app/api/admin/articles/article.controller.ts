import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ArticleService from './article.service';

export const getArticles = catchAsync(async (req: AuthRequest) => {
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
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    const article = await ArticleService.getArticleBySlug(params.slug);

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

