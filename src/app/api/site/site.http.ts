import { randomUUID } from "node:crypto";
import AppError from "@/builder/app-error";
import { SITE_SNAPSHOT_MAX_BYTES } from "./site.type";
import { SiteDomainError } from "./site.policy";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

const SITE_HTTP_BODY_MAX_BYTES = SITE_SNAPSHOT_MAX_BYTES + 16 * 1024;

export type TSiteSuccessEnvelope<T> = {
  success: true;
  status: number;
  message: string;
  data: T;
  request_id: string;
};

export type TSiteErrorEnvelope = {
  success: false;
  status: number;
  code: string;
  message: string;
  sources: Array<{ path: string; message: string }>;
  current_revision?: number;
  request_id: string;
};

export const createSiteRequestId = (): string => randomUUID();

const setCommonHeaders = (
  response: NextResponse,
  requestId: string
): NextResponse => {
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

export const siteSuccessResponse = <T>(input: {
  data: T;
  status: number;
  message: string;
  request_id: string;
  cache: "public-published" | "public-emergency" | "private";
}): NextResponse<TSiteSuccessEnvelope<T>> => {
  const response = NextResponse.json(
    {
      success: true,
      status: input.status,
      message: input.message,
      data: input.data,
      request_id: input.request_id,
    },
    { status: input.status }
  );
  if (input.cache === "private") {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Vary", "Cookie, Authorization");
  } else if (input.cache === "public-emergency") {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  } else {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
  }
  return setCommonHeaders(response, input.request_id) as NextResponse<
    TSiteSuccessEnvelope<T>
  >;
};

const zodSources = (
  error: ZodError
): Array<{ path: string; message: string }> =>
  error.issues.slice(0, 50).map((issue) => {
    const candidate = issue.path.map(String).join(".");
    const path =
      candidate.length <= 96 &&
      /^[a-z][a-z0-9_-]*(?:\.(?:[a-z][a-z0-9_-]*|\d+))*$/.test(candidate)
        ? candidate
        : "";
    return { path, message: "This field is invalid or unsupported." };
  });

export const siteErrorResponse = (
  error: unknown,
  requestId: string
): NextResponse<TSiteErrorEnvelope> => {
  let status = 503;
  let code = "SITE_TEMPORARILY_UNAVAILABLE";
  let message = "Site settings are temporarily unavailable.";
  let sources: Array<{ path: string; message: string }> = [];
  let currentRevision: number | undefined;

  if (error instanceof SiteDomainError) {
    status = error.status;
    code = error.code;
    message = error.message;
    sources = error.sources.map((path) => ({
      path,
      message: "This field is incomplete, invalid, or unavailable.",
    }));
    currentRevision = error.current_revision;
  } else if (error instanceof ZodError) {
    status = 422;
    code = "SITE_VALIDATION_FAILED";
    message = "Check the Site request and try again.";
    sources = zodSources(error);
  } else if (error instanceof AppError) {
    status = error.status;
    if (status === 401) {
      code = "AUTHENTICATION_REQUIRED";
      message = "Authentication required.";
    } else if (status === 403) {
      code = "ACCESS_DENIED";
      message = "Access denied.";
    } else {
      code = "SITE_REQUEST_REJECTED";
      message = "The Site request was rejected.";
    }
  }

  const response = NextResponse.json(
    {
      success: false,
      status,
      code,
      message,
      sources,
      ...(currentRevision !== undefined
        ? { current_revision: currentRevision }
        : {}),
      request_id: requestId,
    },
    { status }
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");
  return setCommonHeaders(
    response,
    requestId
  ) as NextResponse<TSiteErrorEnvelope>;
};

export const readSiteJsonBody = async (
  request: NextRequest,
  allowEmpty = false
): Promise<unknown> => {
  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (!contentType?.startsWith("application/json")) {
    throw new SiteDomainError({
      status: 415,
      code: "SITE_CONTENT_TYPE_UNSUPPORTED",
      message: "Use an application/json request body.",
    });
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > SITE_HTTP_BODY_MAX_BYTES
  ) {
    throw new SiteDomainError({
      status: 413,
      code: "SITE_REQUEST_TOO_LARGE",
      message: "The Site request exceeds the size budget.",
    });
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > SITE_HTTP_BODY_MAX_BYTES) {
    throw new SiteDomainError({
      status: 413,
      code: "SITE_REQUEST_TOO_LARGE",
      message: "The Site request exceeds the size budget.",
    });
  }
  if (!text.trim() && allowEmpty) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SiteDomainError({
      status: 400,
      code: "SITE_JSON_INVALID",
      message: "Use a valid JSON request body.",
    });
  }
};

export const siteQueryInput = (request: NextRequest): Record<string, string> =>
  Object.fromEntries(new URL(request.url).searchParams.entries());
