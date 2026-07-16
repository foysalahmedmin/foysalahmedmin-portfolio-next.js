import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export const REVIEW_MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export const REVIEW_TARGET_MODELS = ["Project", "Article"] as const;

export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];
export type ReviewTargetModel = (typeof REVIEW_TARGET_MODELS)[number];

export type SafeReviewAuthor = { id: string; name: string };
export type SafeReviewTarget = { id: string; name: string };

export type ReviewModerationItem = {
  id: string;
  author: SafeReviewAuthor | null;
  target: SafeReviewTarget | null;
  target_model: ReviewTargetModel;
  rating: number;
  review: string;
  status: ReviewModerationStatus;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: boolean;
};

export type ReviewModerationQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: ReviewModerationStatus;
  target_model?: ReviewTargetModel;
  target?: string;
  rating?: number;
  sort?: "created_at" | "-created_at" | "rating" | "-rating";
};

export type ReviewModerationPageResponse = Omit<
  TResponse<ReviewModerationItem[]>,
  "meta"
> & {
  meta?: { total: number; page: number; limit: number };
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;
const MONGODB_ID = /^[a-f\d]{24}$/i;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const boundedText = (value: unknown, maximum: number) => {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum)
    .trim();
  return normalized || null;
};

const idFrom = (value: unknown) => {
  const record = asRecord(value);
  const candidate =
    typeof value === "string"
      ? value
      : typeof record?._id === "string"
        ? record._id
        : typeof record?.id === "string"
          ? record.id
          : "";
  return MONGODB_ID.test(candidate) ? candidate : null;
};

const toIso = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

const safeRelation = <T extends SafeReviewAuthor | SafeReviewTarget>(
  value: unknown
): T | null => {
  const record = asRecord(value);
  const id = idFrom(value);
  const name = boundedText(record?.name, 120);
  return id && name ? ({ id, name } as T) : null;
};

export const toSafeReviewModerationItem = (
  value: unknown
): ReviewModerationItem | null => {
  const record = asRecord(value);
  if (!record) return null;
  const id = idFrom(record);
  const targetModel = REVIEW_TARGET_MODELS.includes(
    record.target_model as ReviewTargetModel
  )
    ? (record.target_model as ReviewTargetModel)
    : null;
  const status = REVIEW_MODERATION_STATUSES.includes(
    record.status as ReviewModerationStatus
  )
    ? (record.status as ReviewModerationStatus)
    : null;
  const review = boundedText(record.review, 300);
  const rating = Number(record.rating);
  if (
    !id ||
    !targetModel ||
    !status ||
    !review ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return null;
  }

  return {
    id,
    author: safeRelation<SafeReviewAuthor>(record.author),
    target: safeRelation<SafeReviewTarget>(record.target),
    target_model: targetModel,
    rating,
    review,
    status,
    is_edited: record.is_edited === true,
    edited_at: toIso(record.edited_at),
    created_at: toIso(record.created_at),
    updated_at: toIso(record.updated_at),
    deleted: record.is_deleted === true,
  };
};

const buildReviewModerationSearchParams = (query: ReviewModerationQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort ?? "-created_at",
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.target_model) params.set("target_model", query.target_model);
  if (query.target && MONGODB_ID.test(query.target)) {
    params.set("target", query.target);
  }
  if (
    Number.isInteger(query.rating) &&
    query.rating! >= 1 &&
    query.rating! <= 5
  ) {
    params.set("rating", String(query.rating));
  }
  return params;
};

export const getAdminReviews = async (
  query: ReviewModerationQuery,
  options: { signal?: AbortSignal } = {}
): Promise<ReviewModerationPageResponse> => {
  const params = buildReviewModerationSearchParams(query);
  const response = await fetch(`/api/reviews/admin?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = await readApiResponse<unknown[]>(response);
  return {
    ...result,
    data: result.data.flatMap((item) => {
      const safe = toSafeReviewModerationItem(item);
      return safe ? [safe] : [];
    }),
  } as ReviewModerationPageResponse;
};

export const getAdminReviewDetail = async (
  id: string,
  options: { signal?: AbortSignal } = {}
) => {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = await readApiResponse<unknown>(response);
  const data = toSafeReviewModerationItem(result.data);
  if (!data) throw new Error("The review detail response was invalid.");
  return { ...result, data } as TResponse<ReviewModerationItem>;
};

export const updateAdminReviewStatus = async (
  id: string,
  status: ReviewModerationStatus,
  options: { signal?: AbortSignal } = {}
) => {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}/admin`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    signal: options.signal,
  });
  const result = await readApiResponse<unknown>(response);
  const data = toSafeReviewModerationItem(result.data);
  if (!data) throw new Error("The review moderation response was invalid.");
  return { ...result, data } as TResponse<ReviewModerationItem>;
};
