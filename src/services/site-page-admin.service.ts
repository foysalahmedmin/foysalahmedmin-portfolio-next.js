import type {
  TPageAdminDto,
  TPageDraftSnapshot,
  TPageRouteKey,
} from "@/app/api/pages/page.type";
import type {
  TSiteAdminDto,
  TSiteDraftSnapshot,
} from "@/app/api/site/site.type";

export type TEditorialErrorSource = Readonly<{
  path: string;
  message: string;
}>;

export class EditorialRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly sources: readonly TEditorialErrorSource[];
  readonly currentRevision?: number;
  readonly requestId?: string;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    sources?: readonly TEditorialErrorSource[];
    currentRevision?: number;
    requestId?: string;
  }) {
    super(input.message);
    this.name = "EditorialRequestError";
    this.status = input.status;
    this.code = input.code ?? "EDITORIAL_REQUEST_FAILED";
    this.sources = input.sources ?? [];
    this.currentRevision = input.currentRevision;
    this.requestId = input.requestId;
  }
}

type TApiEnvelope<T> = Readonly<{
  success: true;
  data: T;
  message?: string;
  request_id?: string;
}>;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const readEditorialResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // The bounded error below intentionally does not expose a response body.
  }
  const record = asRecord(payload);
  if (!response.ok || record.success !== true) {
    const sources = Array.isArray(record.sources)
      ? record.sources.flatMap((source) => {
          const item = asRecord(source);
          return typeof item.path === "string" &&
            typeof item.message === "string"
            ? [{ path: item.path, message: item.message }]
            : [];
        })
      : [];
    throw new EditorialRequestError({
      status: response.status,
      code: typeof record.code === "string" ? record.code : undefined,
      message:
        typeof record.message === "string"
          ? record.message
          : "The editorial request could not be completed.",
      sources,
      currentRevision:
        typeof record.current_revision === "number"
          ? record.current_revision
          : undefined,
      requestId:
        typeof record.request_id === "string"
          ? record.request_id
          : response.headers.get("x-request-id") || undefined,
    });
  }
  return (payload as TApiEnvelope<T>).data;
};

const request = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> => {
  const response = await fetch(endpoint, {
    method,
    cache: "no-store",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return await readEditorialResponse<T>(response);
};

export const getAdminSiteClient = async (): Promise<TSiteAdminDto> =>
  await request<TSiteAdminDto>("/api/site/admin", "GET");

export const createAdminSiteClient = async (): Promise<TSiteAdminDto> =>
  await request<TSiteAdminDto>("/api/site/admin", "POST", {});

export const updateAdminSiteClient = async (
  expectedRevision: number,
  draft: TSiteDraftSnapshot
): Promise<TSiteAdminDto> =>
  await request<TSiteAdminDto>("/api/site/admin", "PATCH", {
    expected_revision: expectedRevision,
    draft,
  });

export const publishAdminSiteClient = async (
  expectedRevision: number
): Promise<{ site: TSiteAdminDto; cache_invalidated: boolean }> =>
  await request("/api/site/admin/publish", "POST", {
    expected_revision: expectedRevision,
  });

const pageEndpoint = (routeKey: TPageRouteKey, suffix = "") =>
  `/api/pages/${routeKey}/admin${suffix}`;

export const getAdminPageClient = async (
  routeKey: TPageRouteKey
): Promise<TPageAdminDto> =>
  await request<TPageAdminDto>(pageEndpoint(routeKey), "GET");

export const createAdminPageClient = async (
  routeKey: TPageRouteKey,
  draft: TPageDraftSnapshot
): Promise<TPageAdminDto> =>
  await request<TPageAdminDto>(pageEndpoint(routeKey), "POST", { draft });

export const updateAdminPageClient = async (
  routeKey: TPageRouteKey,
  expectedRevision: number,
  draft: TPageDraftSnapshot
): Promise<TPageAdminDto> =>
  await request<TPageAdminDto>(pageEndpoint(routeKey), "PATCH", {
    expected_revision: expectedRevision,
    draft,
  });

export const publishAdminPageClient = async (
  routeKey: TPageRouteKey,
  expectedRevision: number
): Promise<{ page: TPageAdminDto; cache_invalidated: boolean }> =>
  await request(pageEndpoint(routeKey, "/publish"), "POST", {
    expected_revision: expectedRevision,
  });

export const createAdminPagePreviewClient = async (
  routeKey: TPageRouteKey,
  expectedRevision: number
): Promise<{ expires_in_seconds: number; expires_at: string }> =>
  await request(pageEndpoint(routeKey, "/preview-session"), "POST", {
    expected_revision: expectedRevision,
  });

export const clearAdminPagePreviewClient = async (
  routeKey: TPageRouteKey
): Promise<{ cleared: true }> =>
  await request(pageEndpoint(routeKey, "/preview-session"), "DELETE");

export const clearAdminPagePreviewBestEffort = (
  routeKey: TPageRouteKey
): void => {
  void fetch(pageEndpoint(routeKey, "/preview-session"), {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
    keepalive: true,
  }).catch(() => undefined);
};
