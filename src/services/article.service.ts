import { ENV } from "@/config";
import type { TArticle } from "@/types/article.type";
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

export async function getArticles(params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(
    `${baseUrl}/api/articles${query ? `?${query}` : ""}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
    }
  );
  return handleResponse<TArticle[]>(res);
}

export async function getArticleById(id: string) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/articles/${id}`, {
    method: "GET",
  });
  return handleResponse<TArticle>(res);
}

export async function createArticle(data: Partial<TArticle>) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TArticle>(res);
}

export async function updateArticle(id: string, data: Partial<TArticle>) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TArticle>(res);
}

export async function deleteArticle(id: string) {
  const baseUrl = ENV.url && ENV.url !== "undefined" ? ENV.url : "";
  const res = await fetch(`${baseUrl}/api/articles/${id}`, {
    method: "DELETE",
  });
  return handleResponse<null>(res);
}
