import { ENV } from "@/config";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TResponse } from "@/types/response.type";

type TQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

type TRequestOptions = {
  signal?: AbortSignal;
};

const getBaseUrl = () => (ENV.url && ENV.url !== "undefined" ? ENV.url : "");

const getQueryString = (params?: TQueryParams) => {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

async function handleResponse<T>(res: Response) {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Fetch request failed");
  }
  return res.json() as Promise<TResponse<T>>;
}

export async function getProjectCategories(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/project-categories${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );
  return handleResponse<TProjectCategory[]>(res);
}

export async function getArticleCategories(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/article-categories${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );
  return handleResponse<TArticleCategory[]>(res);
}
