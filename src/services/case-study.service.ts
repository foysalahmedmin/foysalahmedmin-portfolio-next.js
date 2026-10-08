import { ENV } from "@/config";
import type {
  TCaseStudy,
  TCaseStudyInput,
  TCaseStudyListItem,
  TPublicCaseStudy,
} from "@/types/case-study.type";
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
export async function getCaseStudies(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/case-studies${getQueryString(params)}`,
    {
      method: "GET",
      next: { revalidate: 3600 },
      signal: options.signal,
    }
  );

  return readApiResponse<TCaseStudyListItem[]>(res);
}

export async function getCaseStudyByIdentifier(identifier: string) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/${identifier}`, {
    method: "GET",
  });

  return readApiResponse<TPublicCaseStudy>(res);
}

export const getCaseStudyById = getCaseStudyByIdentifier;

export async function getAdminCaseStudies(
  params?: TQueryParams,
  options: TRequestOptions = {}
) {
  const res = await fetch(
    `${getBaseUrl()}/api/case-studies/admin${getQueryString(params)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );

  return readApiResponse<TCaseStudy[]>(res);
}

export async function getAdminCaseStudyById(
  id: string,
  options: TRequestOptions = {}
) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/${id}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });

  return readApiResponse<TCaseStudy>(res);
}

export async function createCaseStudy(data: TCaseStudyInput) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TCaseStudy>(res);
}

export async function updateCaseStudy(id: string, data: TCaseStudyInput) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return readApiResponse<TCaseStudy>(res);
}

export async function deleteCaseStudy(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/${id}/admin`, {
    method: "DELETE",
    credentials: "include",
  });

  return readApiResponse<null>(res);
}

export async function deleteCaseStudies(ids: string[]) {
  const res = await fetch(`${getBaseUrl()}/api/case-studies/admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  return readApiResponse<TBulkDeleteResult>(res);
}
