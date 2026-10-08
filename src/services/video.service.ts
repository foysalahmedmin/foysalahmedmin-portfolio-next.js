import { ENV } from "@/config";
import type {
  TVideo,
  TVideoInput,
  TVideoListItem,
  TPublicVideo,
} from "@/types/video.type";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

type TQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

type TRequestOptions = {
  signal?: AbortSignal;
};

type TBulkDeleteResult = {
  not_found_ids: string[];
};

const getBaseUrl = () => (ENV.url && ENV.url !== "undefined" ? ENV.url : "");

function getQueryString(params?: TQueryParams) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

// Public reads intentionally retain their public endpoints and cache behavior.
export async function getVideos(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/videos${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );

  return readApiResponse<TVideoListItem[]>(res);
}

export async function getVideoByIdentifier(identifier: string) {
  const res = await fetch(`${getBaseUrl()}/api/videos/${identifier}`, {
    method: "GET",
  });

  return readApiResponse<TPublicVideo>(res);
}

export const getVideoById = getVideoByIdentifier;

export async function getAdminVideos(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/videos/admin${getQueryString(params)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );

  return readApiResponse<TVideo[]>(res);
}

export async function getAdminVideoById(
  id: string,
  options: TRequestOptions = {}
) {
  const res = await fetch(`${getBaseUrl()}/api/videos/${id}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });

  return readApiResponse<TVideo>(res);
}

export async function createVideo(data: TVideoInput) {
  const res = await fetch(`${getBaseUrl()}/api/videos/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TVideo>(res);
}

export async function updateVideo(id: string, data: TVideoInput) {
  const res = await fetch(`${getBaseUrl()}/api/videos/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TVideo>(res);
}

export async function deleteVideo(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/videos/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return readApiResponse<null>(res);
}

export async function deleteVideos(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/videos/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return readApiResponse<TBulkDeleteResult>(res);
}
