import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import { previewPageResponse } from "../../page.controller";
import {
  assertEmptyPageRequestQuery,
  createPageRequestId,
  pageErrorResponse,
  protectPagePreviewResponse,
} from "../../page.http";
import { resolvePageRouteKey, type TPageRouteContext } from "../../page.route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(
      "super-admin",
      "admin",
      "editor"
    )(request, (authed: AuthRequest) => {
      assertEmptyPageRequestQuery(authed);
      return previewPageResponse(authed, routeKey, requestId);
    });
  } catch (error) {
    return protectPagePreviewResponse(pageErrorResponse(error, requestId));
  }
}
