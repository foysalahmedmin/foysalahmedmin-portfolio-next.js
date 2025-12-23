import connectDB from '@/lib/db';
import AppError from '@/builder/app-error';
import AppQuery from '@/builder/app-query';
import httpStatus from 'http-status';
import type { TReviewDocument } from './review.type';
import { Review } from './review.model';

export const getReviews = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TReviewDocument>(
    Review.find(),
    queryParams,
  );

  const result = await query
    .search(['review'])
    .filter(['status', 'target', 'target_model', 'rating', 'author'])
    .sort(['created_at', 'rating'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (review: any) => {
      return await Review.findById(review._id)
        .populate([
          { path: 'author', select: '_id name email image' },
          { path: 'target', select: '_id name' },
        ])
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getReviewById = async (id: string) => {
  await connectDB();

  const review = await Review.findById(id)
    .populate([
      { path: 'author', select: '_id name email image' },
      { path: 'target', select: '_id name' },
    ])
    .lean();

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

  // Check if user already reviewed this target
  const existingReview = await Review.findOne({
    author: payload.author,
    target: payload.target,
    target_model: payload.target_model,
  });

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this item',
    );
  }

  const review = await Review.create({
    ...payload,
    status: payload.status || 'pending',
  });

  return await review.populate([
    { path: 'author', select: '_id name email image' },
    { path: 'target', select: '_id name' },
  ]);
};

export const updateReviewById = async (
  id: string,
  payload: Partial<{
    rating: number;
    review: string;
  }>,
  authorId: string,
) => {
  await connectDB();

  const review = await Review.findById(id);

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check if user is the author or admin
  if (review.author?.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only update your own reviews',
    );
  }

  // Mark as edited
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
  payload: Partial<{
    status: 'pending' | 'approved' | 'rejected';
  }>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const reviews = await Review.find({ _id: { $in: ids } }).lean();
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await Review.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteReviewById = async (id: string, authorId: string) => {
  await connectDB();

  const review = await Review.findById(id);

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check if user is the author or admin
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
  const review = await Review.findById(id).setOptions({ bypassDeleted: true });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  await Review.findByIdAndDelete(id);
};

export const deleteReviews = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const reviews = await Review.find({ _id: { $in: ids } }).lean();
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Review.updateMany(
    { _id: { $in: foundIds } },
    { is_deleted: true },
  );

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteReviewsPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const reviews = await Review.find({ _id: { $in: ids } }).lean();
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Review.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreReviewById = async (id: string) => {
  await connectDB();
  const review = await Review.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found or not deleted');
  }

  return review;
};

export const restoreReviews = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await Review.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredReviews = await Review.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredReviews.map((review) => review._id.toString());
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

  const review = await Review.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  return await review.populate([
    { path: 'author', select: '_id name email image' },
    { path: 'target', select: '_id name' },
  ]);
};

