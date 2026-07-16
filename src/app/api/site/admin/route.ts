import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import {
  createSiteResponse,
  getAdminSiteResponse,
  updateSiteResponse,
} from "../site.controller";
import {
  createSiteRequestId,
  readSiteJsonBody,
  siteErrorResponse,
  siteQueryInput,
} from "../site.http";
import { parseEmptySiteQuery } from "../site.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createSiteRequestId();
  try {
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, (authedRequest: AuthRequest) => {
      parseEmptySiteQuery(siteQueryInput(authedRequest));
      return getAdminSiteResponse(authedRequest, requestId);
    });
  } catch (error) {
    return siteErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = createSiteRequestId();
  try {
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, async (authedRequest: AuthRequest) => {
      const body = await readSiteJsonBody(authedRequest, true);
      return createSiteResponse(authedRequest, requestId, body);
    });
  } catch (error) {
    return siteErrorResponse(error, requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = createSiteRequestId();
  try {
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, async (authedRequest: AuthRequest) => {
      const body = await readSiteJsonBody(authedRequest);
      return updateSiteResponse(authedRequest, requestId, body);
    });
  } catch (error) {
    return siteErrorResponse(error, requestId);
  }
}
