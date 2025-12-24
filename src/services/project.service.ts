import { ENV } from "@/config";
import type { TProject } from "@/types/project.type";
import type { TResponse } from "@/types/response.type";

async function handleResponse<T>(res: Response): Promise<TResponse<T>> {
  if (!res.ok) {
    const errorData = await res.text();
    let message = "Request failed";
    try {
      const parsed = JSON.parse(errorData);
      message = parsed.message || message;
    } catch (e) {
      message = errorData || message;
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getProjects(params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(
    `${baseUrl}/api/projects${query ? `?${query}` : ""}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
    }
  );
  return handleResponse<TProject[]>(res);
}

export async function getProjectById(id: string) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: "GET",
  });
  return handleResponse<TProject>(res);
}

export async function createProject(data: Partial<TProject>) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TProject>(res);
}

export async function updateProject(id: string, data: Partial<TProject>) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TProject>(res);
}

export async function deleteProject(id: string) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: "DELETE",
  });
  return handleResponse<null>(res);
}
