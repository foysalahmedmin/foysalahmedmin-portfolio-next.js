import { ENV } from "@/config";
import type { TProject } from "@/types/project.type";
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
export async function getProjects(params?: TQueryParams) {
  const res = await fetch(
    `${getBaseUrl()}/api/projects${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
    }
  );

  return handleResponse<TProject[]>(res);
}

export async function getProjectById(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}`, {
    method: "GET",
  });

  return handleResponse<TProject>(res);
}

export async function getAdminProjects(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/projects/admin${getQueryString(params)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );

  return handleResponse<TProject[]>(res);
}

export async function getAdminProjectById(
  id: string,
  options: TRequestOptions = {}
) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });

  return handleResponse<TProject>(res);
}

export async function createProject(data: Partial<TProject>) {
  const res = await fetch(`${getBaseUrl()}/api/projects/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<TProject>(res);
}

export async function updateProject(id: string, data: Partial<TProject>) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<TProject>(res);
}

export async function deleteProject(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse<null>(res);
}

export async function deleteProjects(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/projects/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return handleResponse<TBulkDeleteResult>(res);
}
