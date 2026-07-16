import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import {
  adminPageResponse,
  createPageResponse,
  updatePageResponse,
} from "../../page.controller";
import {
  assertEmptyPageRequestQuery,
  createPageRequestId,
  pageErrorResponse,
} from "../../page.http";
import { resolvePageRouteKey, type TPageRouteContext } from "../../page.route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const roles = ["super-admin", "admin", "editor"] as const;

export async function GET(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(...roles)(request, (authed: AuthRequest) => {
      assertEmptyPageRequestQuery(authed);
      return adminPageResponse(authed, routeKey, requestId);
    });
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(...roles)(request, (authed: AuthRequest) =>
      createPageResponse(authed, routeKey, requestId)
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}

export async function PATCH(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    const routeKey = await resolvePageRouteKey(context);
    return await auth(...roles)(request, (authed: AuthRequest) =>
      updatePageResponse(authed, routeKey, requestId)
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}
