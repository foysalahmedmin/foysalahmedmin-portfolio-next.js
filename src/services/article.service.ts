import { ENV } from "@/config";
import type { TArticle } from "@/types/article.type";
import type { TResponse } from "@/types/response.type";

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

async function handleResponse<T>(res: Response): Promise<TResponse<T>> {
  if (!res.ok) {
    const errorData = await res.text();
    let message = "Request failed";

    try {
      const parsed = JSON.parse(errorData) as { message?: unknown };
      if (typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      message = errorData || message;
    }

    throw new Error(message);
  }

  return res.json() as Promise<TResponse<T>>;
}

// Public reads intentionally retain their public endpoints and cache behavior.
export async function getArticles(params?: TQueryParams) {
  const res = await fetch(
    `${getBaseUrl()}/api/articles${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
    }
  );

  return handleResponse<TArticle[]>(res);
}

export async function getArticleById(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}`, {
    method: "GET",
  });

  return handleResponse<TArticle>(res);
}

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

  return handleResponse<TArticle[]>(res);
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

  return handleResponse<TArticle>(res);
}

export async function createArticle(data: Partial<TArticle>) {
  const res = await fetch(`${getBaseUrl()}/api/articles/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<TArticle>(res);
}

export async function updateArticle(id: string, data: Partial<TArticle>) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<TArticle>(res);
}

export async function deleteArticle(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/articles/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse<null>(res);
}

export async function deleteArticles(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/articles/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return handleResponse<TBulkDeleteResult>(res);
}
