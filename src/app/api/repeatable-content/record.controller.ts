import { ENV } from "@/config";
import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { TRole } from "@/types/jsonwebtoken.type";
import { errorHandler } from "@/utils/error-handler";
import sendResponse from "@/utils/send-response";
import type { NextRequest, NextResponse } from "next/server";
import { deliverInvalidations } from "./record.cache";
import { ContentRecordError } from "./record.error";
import type { TRecordService } from "./record.service";
import {
  assertCanonicalSlug,
  assertObjectId,
  parseRecordListQuery,
} from "./record.validation";

type RouteContext = { params: Promise<{ id?: string; slug?: string }> };
type AuthedHandler = (
  request: AuthRequest,
  context?: RouteContext
) => Promise<NextResponse>;

const ADMIN_ROLES = [
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
] as const satisfies readonly TRole[];
const MAX_ADMIN_BODY_BYTES = 256 * 1024;

const invalidJson = () =>
  new ContentRecordError({
    status: 400,
    code: "INVALID_JSON",
    message: "The request body is not valid JSON.",
  });

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const assertTrustedAdminMutation = (request: Request): void => {
  const origin = request.headers.get("origin");
  const requestOrigin = normalizeOrigin(request.url);
  const configuredOrigin = normalizeOrigin(ENV.url || request.url);
  const authorization = request.headers.get("authorization")?.trim();
  const cookieAuthenticated =
    request.headers.get("cookie")?.includes("access_token=") &&
    !authorization?.startsWith("Bearer ");
  const allowedOrigins = new Set(
    [
      configuredOrigin,
      ENV.environment !== "production" ? requestOrigin : null,
    ].filter((value): value is string => Boolean(value))
  );
  if (
    (origin && !allowedOrigins.has(normalizeOrigin(origin) ?? "")) ||
    (cookieAuthenticated && !origin)
  ) {
    throw new ContentRecordError({
      status: 403,
      code: "UNTRUSTED_ADMIN_REQUEST",
      message: "This admin request is not allowed.",
    });
  }
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    throw new ContentRecordError({
      status: 403,
      code: "UNTRUSTED_ADMIN_REQUEST",
      message: "This admin request is not allowed.",
    });
  }
};

export const readAdminJson = async (request: Request): Promise<unknown> => {
  assertTrustedAdminMutation(request);
  const contentType =
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? "";
  if (contentType !== "application/json") {
    throw new ContentRecordError({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Submit admin mutations as JSON.",
    });
  }
  const declared = request.headers.get("content-length");
  if (declared) {
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new ContentRecordError({
        status: 400,
        code: "INVALID_REQUEST_SIZE",
        message: "The request size is invalid.",
      });
    }
    if (size > MAX_ADMIN_BODY_BYTES) {
      throw new ContentRecordError({
        status: 413,
        code: "REQUEST_TOO_LARGE",
        message: "The admin request is too large.",
      });
    }
  }
  const reader = request.body?.getReader();
  if (!reader) throw invalidJson();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_ADMIN_BODY_BYTES) {
        await reader.cancel();
        throw new ContentRecordError({
          status: 413,
          code: "REQUEST_TOO_LARGE",
          message: "The admin request is too large.",
        });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof ContentRecordError) throw error;
    throw invalidJson();
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw invalidJson();
  }
};

const setPublicHeaders = (response: NextResponse): NextResponse => {
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=900"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Vary", "Accept-Encoding");
  return response;
};

const setAdminHeaders = (response: NextResponse): NextResponse => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

const authenticate = async (
  request: NextRequest,
  handler: AuthedHandler,
  context?: RouteContext
): Promise<NextResponse> =>
  await auth(...ADMIN_ROLES)(request, (authedRequest) =>
    handler(authedRequest, context)
  );

const getParam = async (
  context: RouteContext | undefined,
  key: "id" | "slug"
): Promise<string> => {
  const params = context ? await context.params : {};
  const value = params[key];
  if (!value) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_ROUTE_PARAMETER",
      message: "The route parameter is invalid.",
    });
  }
  return value;
};

export const createRecordController = (service: TRecordService) => ({
  publicList: async (request: NextRequest): Promise<NextResponse> => {
    try {
      const query = parseRecordListQuery(
        new URL(request.url).searchParams,
        service.definition,
        "public"
      );
      const result = await service.getPublicList(query);
      return setPublicHeaders(
        sendResponse({
          status: 200,
          success: true,
          message: `${service.definition.plural} retrieved successfully`,
          data: result.data,
          meta: result.meta,
        })
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  publicDetail: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      const slug = assertCanonicalSlug(await getParam(context, "id"));
      const data = await service.getPublicBySlug(slug);
      return setPublicHeaders(
        sendResponse({
          status: 200,
          success: true,
          message: "Content record retrieved successfully",
          data,
        })
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminList: async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await authenticate(request, async (authedRequest) => {
        const query = parseRecordListQuery(
          new URL(authedRequest.url).searchParams,
          service.definition,
          "admin"
        );
        const result = await service.getAdminList(query);
        return setAdminHeaders(
          sendResponse({
            status: 200,
            success: true,
            message: `${service.definition.plural} retrieved successfully`,
            data: result.data,
            meta: result.meta,
          })
        );
      });
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminCreate: async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await authenticate(request, async (authedRequest) => {
        const result = await service.createRecord(
          await readAdminJson(authedRequest),
          authedRequest.user!
        );
        await deliverInvalidations(result.invalidations);
        return setAdminHeaders(
          sendResponse({
            status: 201,
            success: true,
            message: "Content record created successfully",
            data: result.data,
          })
        );
      });
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminDetail: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      return await authenticate(
        request,
        async () => {
          const id = assertObjectId(await getParam(context, "id"));
          const data = await service.getAdminById(id);
          return setAdminHeaders(
            sendResponse({
              status: 200,
              success: true,
              message: "Content record retrieved successfully",
              data,
            })
          );
        },
        context
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminUpdate: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      return await authenticate(
        request,
        async (authedRequest) => {
          const id = assertObjectId(await getParam(context, "id"));
          const result = await service.updateRecord(
            id,
            await readAdminJson(authedRequest),
            authedRequest.user!
          );
          await deliverInvalidations(result.invalidations);
          return setAdminHeaders(
            sendResponse({
              status: 200,
              success: true,
              message: "Content record updated successfully",
              data: result.data,
            })
          );
        },
        context
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminDelete: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      return await authenticate(
        request,
        async (authedRequest) => {
          const id = assertObjectId(await getParam(context, "id"));
          const result = await service.softDeleteRecord(
            id,
            await readAdminJson(authedRequest),
            authedRequest.user!
          );
          await deliverInvalidations(result.invalidations);
          return setAdminHeaders(
            sendResponse({
              status: 200,
              success: true,
              message: "Content record deleted successfully",
              data: result.data,
            })
          );
        },
        context
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminRestore: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      return await authenticate(
        request,
        async (authedRequest) => {
          const id = assertObjectId(await getParam(context, "id"));
          const result = await service.restoreRecord(
            id,
            await readAdminJson(authedRequest),
            authedRequest.user!
          );
          await deliverInvalidations(result.invalidations);
          return setAdminHeaders(
            sendResponse({
              status: 200,
              success: true,
              message: "Content record restored successfully",
              data: result.data,
            })
          );
        },
        context
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminPermanentDelete: async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    try {
      return await authenticate(
        request,
        async (authedRequest) => {
          const id = assertObjectId(await getParam(context, "id"));
          const result = await service.permanentlyDeleteRecord(
            id,
            await readAdminJson(authedRequest),
            authedRequest.user!
          );
          await deliverInvalidations(result.invalidations);
          return setAdminHeaders(
            sendResponse({
              status: 200,
              success: true,
              message: "Content record permanently deleted successfully",
              data: result.data,
            })
          );
        },
        context
      );
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminReorder: async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await authenticate(request, async (authedRequest) => {
        const result = await service.reorderRecords(
          await readAdminJson(authedRequest),
          authedRequest.user!
        );
        await deliverInvalidations(result.invalidations);
        return setAdminHeaders(
          sendResponse({
            status: 200,
            success: true,
            message: "Content records reordered successfully",
            data: result.data,
          })
        );
      });
    } catch (error) {
      return errorHandler(error, request);
    }
  },

  adminBulk: async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await authenticate(request, async (authedRequest) => {
        const result = await service.bulkRecords(
          await readAdminJson(authedRequest),
          authedRequest.user!
        );
        await deliverInvalidations(result.invalidations);
        return setAdminHeaders(
          sendResponse({
            status: 200,
            success: true,
            message: "Bulk content operation completed",
            data: result.data,
          })
        );
      });
    } catch (error) {
      return errorHandler(error, request);
    }
  },
});

export type TRecordController = ReturnType<typeof createRecordController>;
