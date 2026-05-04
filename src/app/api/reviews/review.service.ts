import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import httpStatus from 'http-status';
import * as ReviewRepository from './review.repository';

export const getReviews = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ReviewRepository.findPaginated(queryParams);
};

export const getReviewById = async (id: string) => {
  await connectDB();

  const review = await ReviewRepository.findByIdPopulated(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  return review;
};

export const createReview = async (payload: {
  author: string;
  target: string;
  target_model: 'Project' | 'Article';
  rating: number;
  review: string;
  status?: 'pending' | 'approved' | 'rejected';
}) => {
  await connectDB();

  const existingReview = await ReviewRepository.findExisting(
    payload.author,
    payload.target,
    payload.target_model,
  );

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this item',
    );
  }

  return await ReviewRepository.create({
    ...payload,
    status: payload.status || 'pending',
  } as never);
};

export const updateReviewById = async (
  id: string,
  payload: Partial<{ rating: number; review: string }>,
  authorId: string,
) => {
  await connectDB();

  const review = await ReviewRepository.findById(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  if (review.author?.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only update your own reviews',
    );
  }

  Object.assign(review, {
    ...payload,
    is_edited: true,
    edited_at: new Date(),
  });

  await review.save();

  return await review.populate([
    { path: 'author', select: '_id name email image' },
    { path: 'target', select: '_id name' },
  ]);
};

export const updateReviews = async (
  ids: string[],
  payload: Partial<{ status: 'pending' | 'approved' | 'rejected' }>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const reviews = await ReviewRepository.findManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ReviewRepository.updateMany(foundIds, payload as never);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteReviewById = async (id: string, authorId: string) => {
  await connectDB();

  const review = await ReviewRepository.findById(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  if (review.author?.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only delete your own reviews',
    );
  }

  await review.softDelete();
  return null;
};

export const deleteReviewPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const review = await ReviewRepository.findByIdWithDeleted(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  await ReviewRepository.hardDeleteById(id);
};

export const deleteReviews = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const reviews = await ReviewRepository.findManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ReviewRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteReviewsPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const reviews = await ReviewRepository.findManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ReviewRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreReviewById = async (id: string) => {
  await connectDB();

  const review = await ReviewRepository.restoreById(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found or not deleted');
  }

  return review;
};

export const restoreReviews = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await ReviewRepository.restoreMany(ids);

  const restored = await ReviewRepository.findManyByIds(ids);
  const restoredIds = restored.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const updateReviewStatusById = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected',
) => {
  await connectDB();

  const review = await ReviewRepository.updateById(id, { status });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  return await review.populate([
    { path: 'author', select: '_id name email image' },
    { path: 'target', select: '_id name' },
  ]);
};
