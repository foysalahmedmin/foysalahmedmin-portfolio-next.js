import { readApiResponse } from "@/services/api-response";
import type { TProject } from "@/types/project.type";

export const PROJECT_RESOURCE_TYPES = [
  "repository",
  "design",
  "documentation",
  "other",
] as const;

export type ProjectResourceType = (typeof PROJECT_RESOURCE_TYPES)[number];
export type ProjectResourceProject = Readonly<{
  _id: string;
  name: string;
}>;

export type ProjectResourceAdminRecord = Readonly<{
  _id: string;
  project: ProjectResourceProject | string | null;
  sequence: number;
  type: ProjectResourceType;
  title: string;
  url: string;
  description?: string;
  is_private: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}>;

export type ProjectResourceCreateInput = Readonly<{
  project: string;
  sequence: number;
  type: ProjectResourceType;
  title: string;
  url: string;
  description?: string;
  is_private: boolean;
}>;

export type ProjectResourceUpdateInput = Omit<
  ProjectResourceCreateInput,
  "project"
>;

export type ProjectResourceAdminQuery = Readonly<{
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  project?: string;
  type?: ProjectResourceType;
  is_private?: "true" | "false";
  deleted_scope?: "active" | "with_deleted" | "only_deleted";
}>;

export type ProjectResourceBulkResult = Readonly<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids?: string[];
}>;

type RequestOptions = Readonly<{ signal?: AbortSignal }>;
type QueryValue = string | number | boolean | null | undefined;

const queryString = (query: Readonly<Record<string, QueryValue>>): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const adminRequest = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  return await readApiResponse<T>(response);
};

export const getAdminProjectResources = async (
  query: ProjectResourceAdminQuery,
  options: RequestOptions = {}
) =>
  await adminRequest<ProjectResourceAdminRecord[]>(
    `/api/project-resources/admin${queryString(query)}`,
    { method: "GET", signal: options.signal }
  );

export const getAuthorizedProjectReferences = async (
  search: string,
  options: RequestOptions = {}
) =>
  await adminRequest<TProject[]>(
    `/api/projects/admin${queryString({
      search: search.trim().slice(0, 100),
      sort: "name",
      page: 1,
      limit: 20,
      deleted_scope: "active",
      fields: "_id,name,status",
    })}`,
    { method: "GET", signal: options.signal }
  );

export const createAdminProjectResource = async (
  input: ProjectResourceCreateInput
) =>
  await adminRequest<ProjectResourceAdminRecord>(
    "/api/project-resources/admin",
    { method: "POST", body: JSON.stringify(input) }
  );

export const updateAdminProjectResource = async (
  id: string,
  input: ProjectResourceUpdateInput
) =>
  await adminRequest<ProjectResourceAdminRecord>(
    `/api/project-resources/${encodeURIComponent(id)}/admin`,
    { method: "PATCH", body: JSON.stringify(input) }
  );

export const updateAdminProjectResourcePrivacy = async (
  ids: readonly string[],
  isPrivate: boolean
) =>
  await adminRequest<ProjectResourceBulkResult>(
    "/api/project-resources/admin",
    {
      method: "PATCH",
      body: JSON.stringify({ ids, is_private: isPrivate }),
    }
  );

export const softDeleteAdminProjectResources = async (ids: readonly string[]) =>
  await adminRequest<ProjectResourceBulkResult>(
    "/api/project-resources/admin",
    { method: "DELETE", body: JSON.stringify({ ids }) }
  );

export const restoreAdminProjectResources = async (ids: readonly string[]) =>
  await adminRequest<ProjectResourceBulkResult>(
    "/api/project-resources/admin/restore",
    { method: "POST", body: JSON.stringify({ ids }) }
  );

export const permanentlyDeleteAdminProjectResources = async (
  ids: readonly string[]
) =>
  await adminRequest<ProjectResourceBulkResult>(
    "/api/project-resources/admin/permanent",
    { method: "DELETE", body: JSON.stringify({ ids }) }
  );
