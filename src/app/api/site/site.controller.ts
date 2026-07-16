import AppError from "@/builder/app-error";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";
import { readPublishedSite } from "@/lib/site/published-site";
import type { AuthRequest } from "@/middleware/auth.middleware";
import httpStatus from "http-status";
import {
  createSite,
  getAdminSite,
  publishSite,
  updateSiteDraft,
  type TSiteMutationContext,
} from "./site.service";
import { siteSuccessResponse } from "./site.http";
import {
  parseEmptySiteQuery,
  siteCreateBodySchema,
  siteDraftUpdateBodySchema,
  sitePublishBodySchema,
} from "./site.validation";

const mutationContext = (
  request: AuthRequest,
  requestId: string,
  capability: Capability
): TSiteMutationContext => {
  if (!request.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required.");
  }
  if (!hasCapability(request.user.role, capability)) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  }
  return {
    actor: {
      id: request.user.id,
      role: request.user.role,
      session_id: request.user.session_id,
    },
    request_id: requestId,
  };
};

export const getPublicSiteResponse = async (requestId: string) => {
  const data = await readPublishedSite();
  return siteSuccessResponse({
    data,
    status: httpStatus.OK,
    message: "Published Site retrieved successfully.",
    request_id: requestId,
    cache:
      data.content_source === "published"
        ? "public-published"
        : "public-emergency",
  });
};

export const getAdminSiteResponse = async (
  request: AuthRequest,
  requestId: string
) => {
  mutationContext(request, requestId, "site:read");
  return siteSuccessResponse({
    data: await getAdminSite(),
    status: httpStatus.OK,
    message: "Site settings retrieved successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const createSiteResponse = async (
  request: AuthRequest,
  requestId: string,
  body: unknown
) => {
  siteCreateBodySchema.parse(body);
  return siteSuccessResponse({
    data: await createSite(mutationContext(request, requestId, "site:edit")),
    status: httpStatus.CREATED,
    message: "Site settings created successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const updateSiteResponse = async (
  request: AuthRequest,
  requestId: string,
  body: unknown
) => {
  const input = siteDraftUpdateBodySchema.parse(body);
  return siteSuccessResponse({
    data: await updateSiteDraft(
      input,
      mutationContext(request, requestId, "site:edit")
    ),
    status: httpStatus.OK,
    message: "Site draft updated successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const publishSiteResponse = async (
  request: AuthRequest,
  requestId: string,
  body: unknown
) => {
  const input = sitePublishBodySchema.parse(body);
  return siteSuccessResponse({
    data: await publishSite(
      input,
      mutationContext(request, requestId, "site:publish")
    ),
    status: httpStatus.OK,
    message: "Site published successfully.",
    request_id: requestId,
    cache: "private",
  });
};

export const assertEmptySiteQuery = (query: Record<string, string>): void => {
  parseEmptySiteQuery(query);
};
