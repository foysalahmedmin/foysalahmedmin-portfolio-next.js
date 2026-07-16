import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import * as ReviewRepository from "./review.repository";

type TAdminReviewRelation = Readonly<{ id: string; name: string }>;

export type TAdminReviewProjection = Readonly<{
  id: string;
  author: TAdminReviewRelation | null;
  target: TAdminReviewRelation | null;
  target_model: "Project" | "Article";
  rating: number;
  review: string;
  status: "pending" | "approved" | "rejected";
  is_edited: boolean;
  edited_at: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  deleted: boolean;
}>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {};
  const candidate = value as {
    toObject?: () => unknown;
  };
  const plain =
    typeof candidate.toObject === "function" ? candidate.toObject() : value;
  return plain && typeof plain === "object"
    ? (plain as Record<string, unknown>)
    : {};
};

const idString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const record = value as { _id?: unknown; toString?: () => string };
  if (record._id !== undefined) return idString(record._id);
  const serialized = record.toString?.();
  return serialized && serialized !== "[object Object]" ? serialized : null;
};

const projectAdminRelation = (value: unknown): TAdminReviewRelation | null => {
  const record = asRecord(value);
  const id = idString(record._id ?? record.id ?? value);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  return id && name ? { id, name } : null;
};

const dateValue = (value: unknown): Date | string | null =>
  value instanceof Date || typeof value === "string" ? value : null;

/**
 * Server-side allowlist for moderation responses. Repository projections stay
 * narrow too, but this boundary prevents future population changes from
 * exposing email, role, private media, or arbitrary account fields.
 */
export const toAdminReviewProjection = (
  value: unknown
): TAdminReviewProjection => {
  const record = asRecord(value);
  const id = idString(record._id ?? record.id);
  const targetModel =
    record.target_model === "Article" || record.target_model === "Project"
      ? record.target_model
      : null;
  const status =
    record.status === "pending" ||
    record.status === "approved" ||
    record.status === "rejected"
      ? record.status
      : null;
  const rating = Number(record.rating);
  const review = typeof record.review === "string" ? record.review : null;
  if (
    !id ||
    !targetModel ||
    !status ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    review === null
  ) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Review response could not be projected safely"
    );
  }

  return {
    id,
    author: projectAdminRelation(record.author),
    target: projectAdminRelation(record.target),
    target_model: targetModel,
    rating,
    review,
    status,
    is_edited: record.is_edited === true,
    edited_at: dateValue(record.edited_at),
    created_at: dateValue(record.created_at),
    updated_at: dateValue(record.updated_at),
    deleted: record.is_deleted === true || record.deleted === true,
  };
};

export const getReviews = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  const result = await ReviewRepository.findPaginated(queryParams);
  return {
    ...result,
    data: result.data.map(toAdminReviewProjection),
  };
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

  return toAdminReviewProjection(review);
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
    { path: "author", select: "_id name" },
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

  const populated = await review.populate([
    { path: "author", select: "_id name" },
    { path: "target", select: "_id name" },
  ]);
  return toAdminReviewProjection(populated);
};
