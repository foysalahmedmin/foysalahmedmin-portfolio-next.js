import { ENV } from "@/config";
import type {
  TProject,
  TProjectInput,
  TProjectListItem,
} from "@/types/project.type";
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
export async function getProjects(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/projects${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );

  return readApiResponse<TProjectListItem[]>(res);
}

export async function getProjectByIdentifier(identifier: string) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${identifier}`, {
    method: "GET",
  });

  return readApiResponse<TProject>(res);
}

export const getProjectById = getProjectByIdentifier;

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

  return readApiResponse<TProject[]>(res);
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

  return readApiResponse<TProject>(res);
}

export async function createProject(data: TProjectInput) {
  const res = await fetch(`${getBaseUrl()}/api/projects/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TProject>(res);
}

export async function updateProject(id: string, data: TProjectInput) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TProject>(res);
}

export async function deleteProject(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return readApiResponse<null>(res);
}

export async function deleteProjects(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/projects/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return readApiResponse<TBulkDeleteResult>(res);
}
