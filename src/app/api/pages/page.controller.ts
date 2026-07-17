import AppError from "@/builder/app-error";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";
import { assertTrustedAuthRequest } from "@/lib/auth/auth-request-security";
import type { AuthRequest } from "@/middleware/auth.middleware";
import httpStatus from "http-status";
import { pageSuccessResponse, readPageJsonBody } from "./page.http";
import {
  clearPagePreviewCookie,
  getPagePreviewLifetime,
  setPagePreviewCookie,
} from "./page.preview";
import {
  auditPagePreviewCreated,
  createPage,
  getAdminPage,
  publishPage,
  readPublishedPage,
  reorderPageDraft,
  updatePageDraft,
} from "./page.service";
import type { TPageMutationContext, TPageRouteKey } from "./page.type";
import {
  pageCreateBodySchema,
  pagePublishBodySchema,
  pageReorderBodySchema,
  pageUpdateBodySchema,
} from "./page.validation";

const mutationContext = (
  request: AuthRequest,
  requestId: string,
  capability: Capability
): TPageMutationContext => {
  if (!request.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required.");
  if (!hasCapability(request.user.role, capability))
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  return {
    actor: {
      id: request.user.id,
      role: request.user.role,
      session_id: request.user.session_id,
    },
    request_id: requestId,
  };
};

export const publicPageResponse = async (
  routeKey: TPageRouteKey,
  requestId: string
) =>
  pageSuccessResponse({
    data: await readPublishedPage(routeKey),
    status: 200,
    message: "Published Page retrieved successfully.",
    request_id: requestId,
    cache: "public",
  });

export const adminPageResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  mutationContext(request, requestId, "site:read");
  return pageSuccessResponse({
    data: await getAdminPage(routeKey),
    status: 200,
    message: "Page retrieved successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const createPageResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  const body = pageCreateBodySchema.parse(await readPageJsonBody(request));
  return pageSuccessResponse({
    data: await createPage(
      routeKey,
      body.draft,
      mutationContext(request, requestId, "site:edit")
    ),
    status: 201,
    message: "Page created successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const updatePageResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  const body = pageUpdateBodySchema.parse(await readPageJsonBody(request));
  return pageSuccessResponse({
    data: await updatePageDraft(
      routeKey,
      body,
      mutationContext(request, requestId, "site:edit")
    ),
    status: 200,
    message: "Page draft updated successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const reorderPageResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  const body = pageReorderBodySchema.parse(await readPageJsonBody(request));
  return pageSuccessResponse({
    data: await reorderPageDraft(
      routeKey,
      body,
      mutationContext(request, requestId, "site:edit")
    ),
    status: 200,
    message: "Page sections reordered successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const publishPageResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  const body = pagePublishBodySchema.parse(await readPageJsonBody(request));
  return pageSuccessResponse({
    data: await publishPage(
      routeKey,
      body,
      mutationContext(request, requestId, "site:publish")
    ),
    status: 200,
    message: "Page published successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const createPreviewSessionResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  const body = pagePublishBodySchema.parse(await readPageJsonBody(request));
  const context = mutationContext(request, requestId, "site:read");
  const page = await getAdminPage(routeKey);
  if (page.revision !== body.expected_revision)
    throw new AppError(409, "The Page changed. Refresh before previewing.");
  const issuedAt = new Date();
  const response = pageSuccessResponse({
    data: getPagePreviewLifetime(issuedAt),
    status: 201,
    message: "Preview session created successfully.",
    request_id: requestId,
    cache: "preview",
  });
  setPagePreviewCookie(
    response,
    {
      route_key: routeKey,
      page_id: page.id,
      revision: page.revision,
    },
    issuedAt
  );
  await auditPagePreviewCreated(page, context);
  return response;
};

export const clearPreviewSessionResponse = async (
  request: AuthRequest,
  routeKey: TPageRouteKey,
  requestId: string
) => {
  assertTrustedAuthRequest(request);
  mutationContext(request, requestId, "site:read");
  const response = pageSuccessResponse({
    data: { cleared: true },
    status: 200,
    message: "Preview session cleared successfully.",
    request_id: requestId,
    cache: "preview",
  });
  clearPagePreviewCookie(response, routeKey);
  return response;
};
