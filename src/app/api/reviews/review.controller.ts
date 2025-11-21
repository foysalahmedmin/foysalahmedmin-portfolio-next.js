import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ReviewService from './review.service';

export const getReviews = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ReviewService.getReviews(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getReviewById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const review = await ReviewService.getReviewById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review retrieved successfully',
      data: review,
    });
  },
);

export const createReview = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const authorId = req.user?._id || req.user?.id;

    if (!authorId) {
      throw new Error('User not authenticated');
    }

    const review = await ReviewService.createReview({
      ...body,
      author: authorId as string,
    });

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  },
);

export const updateReviewById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const authorId = req.user?._id || req.user?.id;

    if (!authorId) {
      throw new Error('User not authenticated');
    }

    const review = await ReviewService.updateReviewById(
      params.id,
      body,
      authorId as string,
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  },
);

export const updateReviews = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
    const result = await ReviewService.updateReviews(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Reviews updated successfully',
      data: result,
    });
  },
);

export const deleteReviewById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const authorId = req.user?._id || req.user?.id;

    if (!authorId) {
      throw new Error('User not authenticated');
    }

    await ReviewService.deleteReviewById(params.id, authorId as string);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review deleted successfully',
      data: null,
    });
  },
);

export const deleteReviewPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ReviewService.deleteReviewPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteReviews = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ReviewService.deleteReviews(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} reviews deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const deleteReviewsPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ReviewService.deleteReviewsPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} reviews permanently deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const restoreReviewById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ReviewService.restoreReviewById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review restored successfully',
      data: result,
    });
  },
);

export const restoreReviews = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ReviewService.restoreReviews(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} reviews restored successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const updateReviewStatusById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const { status } = body;

    const review = await ReviewService.updateReviewStatusById(params.id, status);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Review status updated successfully',
      data: review,
    });
  },
);

