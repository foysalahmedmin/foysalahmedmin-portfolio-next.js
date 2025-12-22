import { ENV } from "@/config";

export type CategoryResponse = {
  success: boolean;
  status: number;
  message: string;
  data: any[];
};

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Fetch request failed");
  }
  return res.json() as Promise<CategoryResponse>;
}

export async function getProjectCategories(): Promise<CategoryResponse> {
  const res = await fetch(`${ENV.url}/api/project-categories`, {
    method: "GET",
    next: { revalidate: 3600 }
  });
  return handleResponse(res);
}

export async function getArticleCategories(): Promise<CategoryResponse> {
  const res = await fetch(`${ENV.url}/api/article-categories`, {
    method: "GET",
    next: { revalidate: 3600 }
  });
  return handleResponse(res);
}
