import {
  buildMediaLibrarySearchParams,
  MEDIA_LIBRARY_MAX_UPLOADS,
  type AdminMediaUpdatePayload,
  type MediaLibraryQuery,
} from "@/lib/admin/media-library";
import { appendFileUploadMetadata } from "@/lib/media/file-upload-metadata";
import type {
  TFileEditorialMetadataInput,
  TFilePopulated,
  TFilePurpose,
} from "@/types/file.type";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

type RequestOptions = Readonly<{ signal?: AbortSignal }>;

export type MediaBulkMutationResult = Readonly<{
  count: number;
  not_found_ids: string[];
  failed_ids?: string[];
}>;

export type MediaUploadOutcome =
  | Readonly<{
      status: "success";
      input: File;
      file: TFilePopulated;
    }>
  | Readonly<{
      status: "error";
      input: File;
      message: string;
    }>;

export type MediaUploadBatchInput = Readonly<{
  purpose: TFilePurpose;
  metadata: TFileEditorialMetadataInput;
}>;

const requestJson = async <T>(
  path: string,
  init: RequestInit
): Promise<TResponse<T>> => {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  return readApiResponse<T>(response);
};

export const getAdminMedia = async (
  query: Partial<MediaLibraryQuery>,
  options: RequestOptions = {}
): Promise<TResponse<TFilePopulated[]>> =>
  requestJson<TFilePopulated[]>(
    `/api/files/admin?${buildMediaLibrarySearchParams(query)}`,
    { method: "GET", signal: options.signal }
  );

const uploadOne = async (
  input: File,
  metadata: MediaUploadBatchInput
): Promise<TFilePopulated> => {
  const body = new FormData();
  body.append("file", input);
  body.append("purpose", metadata.purpose);
  body.append("idempotency_key", crypto.randomUUID());
  appendFileUploadMetadata(body, metadata.metadata);

  const response = await requestJson<TFilePopulated[]>("/api/files/admin", {
    method: "POST",
    body,
  });
  const file = response.data[0];
  if (!file) throw new Error("Managed upload returned no File record.");
  return file;
};

/**
 * Runs each selected file through the managed-media endpoint independently.
 * This intentionally yields per-file results so a provider interruption cannot
 * hide which assets were safely persisted and which are retryable.
 */
export const uploadAdminMediaBatch = async (
  files: readonly File[],
  metadata: MediaUploadBatchInput,
  onProgress?: (completed: number, total: number) => void
): Promise<MediaUploadOutcome[]> => {
  const boundedFiles = files.slice(0, MEDIA_LIBRARY_MAX_UPLOADS);
  const outcomes: MediaUploadOutcome[] = [];

  for (const input of boundedFiles) {
    try {
      outcomes.push({
        status: "success",
        input,
        file: await uploadOne(input, metadata),
      });
    } catch (error) {
      outcomes.push({
        status: "error",
        input,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Managed upload failed.",
      });
    }
    onProgress?.(outcomes.length, boundedFiles.length);
  }

  return outcomes;
};

export const updateAdminMedia = async (
  id: string,
  payload: AdminMediaUpdatePayload
): Promise<TResponse<TFilePopulated>> =>
  requestJson<TFilePopulated>(`/api/files/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const updateAdminMediaStatus = async (
  ids: readonly string[],
  status: "active" | "inactive" | "archived"
): Promise<TResponse<MediaBulkMutationResult>> =>
  requestJson<MediaBulkMutationResult>("/api/files/admin", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });

export const softDeleteAdminMedia = async (
  ids: readonly string[]
): Promise<TResponse<MediaBulkMutationResult>> =>
  requestJson<MediaBulkMutationResult>("/api/files/admin", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const restoreAdminMedia = async (
  ids: readonly string[]
): Promise<TResponse<MediaBulkMutationResult>> =>
  requestJson<MediaBulkMutationResult>("/api/files/admin/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const permanentlyDeleteAdminMedia = async (
  ids: readonly string[]
): Promise<TResponse<MediaBulkMutationResult>> =>
  requestJson<MediaBulkMutationResult>("/api/files/admin/permanent", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
