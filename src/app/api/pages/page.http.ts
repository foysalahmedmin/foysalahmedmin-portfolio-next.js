import { randomUUID } from "node:crypto";
import AppError from "@/builder/app-error";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { PageDomainError } from "./page.policy";
import { PAGE_SNAPSHOT_MAX_BYTES } from "./page.type";

const BODY_MAX_BYTES = PAGE_SNAPSHOT_MAX_BYTES + 16 * 1024;

export const createPageRequestId = (): string => randomUUID();

export const protectPagePreviewResponse = (
  response: NextResponse
): NextResponse => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};

const commonHeaders = (
  response: NextResponse,
  requestId: string
): NextResponse => {
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

export const pageSuccessResponse = <T>(input: {
  data: T;
  status: number;
  message: string;
  request_id: string;
  cache: "public" | "private" | "preview";
}): NextResponse => {
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
  if (input.cache === "public") {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
  } else {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Vary", "Cookie, Authorization");
  }
  if (input.cache === "preview") {
    protectPagePreviewResponse(response);
  }
  return commonHeaders(response, input.request_id);
};

export const pageErrorResponse = (
  error: unknown,
  requestId: string
): NextResponse => {
  let status = 503;
  let code = "PAGE_TEMPORARILY_UNAVAILABLE";
  let message = "Page data is temporarily unavailable.";
  let paths: string[] = [];
  let currentRevision: number | undefined;
  if (error instanceof PageDomainError) {
    ({ status, code, message } = error);
    paths = error.sources;
    currentRevision = error.current_revision;
  } else if (error instanceof ZodError) {
    status = 422;
    code = "PAGE_VALIDATION_FAILED";
    message = "Check the Page request and try again.";
    paths = error.issues.map((issue) => issue.path.map(String).join("."));
  } else if (error instanceof AppError) {
    status = error.status;
    code =
      status === 401
        ? "AUTHENTICATION_REQUIRED"
        : status === 403
          ? "ACCESS_DENIED"
          : "PAGE_REQUEST_REJECTED";
    message =
      status === 401
        ? "Authentication required."
        : status === 403
          ? "Access denied."
          : "The Page request was rejected.";
  }
  const response = NextResponse.json(
    {
      success: false,
      status,
      code,
      message,
      sources: [...new Set(paths)].slice(0, 50).map((path) => ({
        path: /^[a-z][a-z0-9_-]*(?:\.(?:[a-z][a-z0-9_-]*|\d+))*$/.test(path)
          ? path
          : "",
        message: "This field is invalid, incomplete, or unavailable.",
      })),
      ...(currentRevision === undefined
        ? {}
        : { current_revision: currentRevision }),
      request_id: requestId,
    },
    { status }
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");
  return commonHeaders(response, requestId);
};

export const readPageJsonBody = async (
  request: NextRequest,
  allowEmpty = false
): Promise<unknown> => {
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() !== "application/json"
  ) {
    throw new PageDomainError({
      status: 415,
      code: "PAGE_CONTENT_TYPE_UNSUPPORTED",
      message: "Use an application/json request body.",
    });
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > BODY_MAX_BYTES) {
    throw new PageDomainError({
      status: 413,
      code: "PAGE_REQUEST_TOO_LARGE",
      message: "The Page request exceeds the size budget.",
    });
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > BODY_MAX_BYTES) {
    throw new PageDomainError({
      status: 413,
      code: "PAGE_REQUEST_TOO_LARGE",
      message: "The Page request exceeds the size budget.",
    });
  }
  if (!text.trim() && allowEmpty) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PageDomainError({
      status: 400,
      code: "PAGE_JSON_INVALID",
      message: "Use a valid JSON request body.",
    });
  }
};

export const assertEmptyPageRequestQuery = (request: NextRequest): void => {
  if ([...new URL(request.url).searchParams.keys()].length) {
    throw new PageDomainError({
      status: 400,
      code: "PAGE_QUERY_UNSUPPORTED",
      message: "This endpoint does not accept query parameters.",
    });
  }
};
