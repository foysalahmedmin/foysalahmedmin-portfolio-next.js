import { ENV } from "@/config";
import type {
  TArticle,
  TArticleInput,
  TArticleListItem,
  TPublicArticle,
} from "@/types/article.type";
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
export async function getArticles(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/articles${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );

  return readApiResponse<TArticleListItem[]>(res);
}

export async function getArticleByIdentifier(identifier: string) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${identifier}`, {
    method: "GET",
  });

  return readApiResponse<TPublicArticle>(res);
}

export const getArticleById = getArticleByIdentifier;

export async function getAdminArticles(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/articles/admin${getQueryString(params)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );

  return readApiResponse<TArticle[]>(res);
}

export async function getAdminArticleById(
  id: string,
  options: TRequestOptions = {}
) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });

  return readApiResponse<TArticle>(res);
}

export async function createArticle(data: TArticleInput) {
  const res = await fetch(`${getBaseUrl()}/api/articles/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TArticle>(res);
}

export async function updateArticle(id: string, data: TArticleInput) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TArticle>(res);
}

export async function deleteArticle(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return readApiResponse<null>(res);
}

export async function deleteArticles(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/articles/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return readApiResponse<TBulkDeleteResult>(res);
}
