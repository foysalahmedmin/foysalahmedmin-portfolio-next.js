import { ENV } from "@/config";
import { TArticle } from "@/types/article.type";
import { TResponse } from "@/types/response.type";

async function handleResponse<T>(res: Response): Promise<TResponse<T>> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function getArticles(params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${ENV.url}/api/articles${query ? `?${query}` : ""}`, {
    method: "GET",
    next: { revalidate: 3600 }
  });
  return handleResponse<TArticle[]>(res);
}

export async function getArticleById(id: string) {
  const res = await fetch(`${ENV.url}/api/articles/${id}`, {
    method: "GET",
  });
  return handleResponse<TArticle>(res);
}

export async function createArticle(data: Partial<TArticle>) {
  const res = await fetch(`${ENV.url}/api/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TArticle>(res);
}

export async function updateArticle(id: string, data: Partial<TArticle>) {
  const res = await fetch(`${ENV.url}/api/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<TArticle>(res);
}

export async function deleteArticle(id: string) {
  const res = await fetch(`${ENV.url}/api/articles/${id}`, {
    method: "DELETE",
  });
  return handleResponse<null>(res);
}
