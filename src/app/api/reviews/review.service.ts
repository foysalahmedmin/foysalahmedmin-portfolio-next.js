import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import * as ReviewRepository from "./review.repository";

export const getReviews = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ReviewRepository.findPaginated(queryParams);
};

export const getPublicReviews = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  return await ReviewRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
};

export const getReviewById = async (id: string) => {
  await connectDB();

  const review = await ReviewRepository.findByIdPopulated(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  return review;
};

export const getPublicReviewById = async (id: string) => {
  await connectDB();

  const review = await ReviewRepository.findPublicByIdPopulated(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  return review;
};

export const createReview = async (payload: {
  author: string;
  target: string;
  target_model: "Project" | "Article";
  rating: number;
  review: string;
  status?: "pending" | "approved" | "rejected";
}) => {
  await connectDB();

  const referencesAreActive = await ReviewRepository.areReferencesActive(
    payload.author,
    payload.target,
    payload.target_model
  );
  if (!referencesAreActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An active author and review target are required"
    );
  }

  const existingReview = await ReviewRepository.findExisting(
    payload.author,
    payload.target,
    payload.target_model
  );

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reviewed this item"
    );
  }

  return await ReviewRepository.create({
    ...payload,
    status: payload.status || "pending",
  } as never);
};

export const updateReviewById = async (
  id: string,
  payload: Partial<{ rating: number; review: string }>,
  authorId: string
) => {
  await connectDB();

  const review = await ReviewRepository.findById(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (review.author?.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update your own reviews"
    );
  }

  Object.assign(review, {
    ...payload,
    is_edited: true,
    edited_at: new Date(),
  });

  await review.save();

  return await review.populate([
    { path: "author", select: "_id name email image" },
    { path: "target", select: "_id name" },
  ]);
};

export const updateReviews = async (
  ids: string[],
  payload: Partial<{ status: "pending" | "approved" | "rejected" }>
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
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (review.author?.toString() !== authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete your own reviews"
    );
  }

  const deleted = await ReviewRepository.softDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Review changed while deletion was in progress"
    );
  }

  return null;
};

export const deleteReviewPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const review = await ReviewRepository.findDeletedById(id);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  const deleted = await ReviewRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Review changed while permanent deletion was in progress"
    );
  }
};

export const deleteReviews = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const reviews = await ReviewRepository.findManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ReviewRepository.softDeleteMany(foundIds);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteReviewsPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const reviews = await ReviewRepository.findDeletedManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) =>
      Boolean(await ReviewRepository.hardDeleteById(entityId))
    )
  );
  const notDeletedIds = foundIds.filter((_, index) => !outcomes[index]);

  return {
    count: outcomes.filter(Boolean).length,
    not_found_ids: [...new Set([...notFoundIds, ...notDeletedIds])],
  };
};

export const restoreReviewById = async (id: string) => {
  await connectDB();

  const candidate = await ReviewRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found or not deleted");
  }

  const notRestorableIds = await ReviewRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Review cannot be restored until its author and target are active and its active identity is unique"
    );
  }

  const review = await ReviewRepository.restoreById(id);
  if (!review) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Review changed while restoration was in progress"
    );
  }

  return review;
};

export const restoreReviews = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const reviews = await ReviewRepository.findDeletedManyByIds(ids);
  const foundIds = reviews.map((review) => review._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds = await ReviewRepository.findNotRestorableIds(reviews);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await ReviewRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};

export const updateReviewStatusById = async (
  id: string,
  status: "pending" | "approved" | "rejected"
) => {
  await connectDB();

  const review = await ReviewRepository.updateById(id, { status });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  return await review.populate([
    { path: "author", select: "_id name email image" },
    { path: "target", select: "_id name" },
  ]);
};
