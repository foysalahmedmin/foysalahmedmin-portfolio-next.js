import { ENV } from "@/config";
import { TProject } from "@/types/project.type";
import { TResponse } from "@/types/response.type";

async function handleResponse<T>(res: Response): Promise<TResponse<T>> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function getProjects(params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${ENV.url}/api/projects${query ? `?${query}` : ""}`, {
    method: "GET",
    next: { revalidate: 3600 }
  });
  return handleResponse<TProject[]>(res);
}

export async function getProjectById(id: string) {
  const res = await fetch(`${ENV.url}/api/projects/${id}`, {
    method: "GET",
  });
  return handleResponse<TProject>(res);
}

export async function createProject(data: Partial<TProject>) {
  const res = await fetch(`${ENV.url}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TProject>(res);
}

export async function updateProject(id: string, data: Partial<TProject>) {
  const res = await fetch(`${ENV.url}/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TProject>(res);
}

export async function deleteProject(id: string) {
  const res = await fetch(`${ENV.url}/api/projects/${id}`, {
    method: "DELETE",
  });
  return handleResponse<null>(res);
}
