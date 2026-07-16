import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import {
  clearPreviewSessionResponse,
  createPreviewSessionResponse,
} from "../../../page.controller";
import { createPageRequestId, pageErrorResponse } from "../../../page.http";
import {
  resolvePageRouteKey,
  type TPageRouteContext,
} from "../../../page.route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, (authed: AuthRequest) =>
      createPreviewSessionResponse(authed, routeKey, requestId)
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, (authed: AuthRequest) =>
      clearPreviewSessionResponse(authed, routeKey, requestId)
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}
