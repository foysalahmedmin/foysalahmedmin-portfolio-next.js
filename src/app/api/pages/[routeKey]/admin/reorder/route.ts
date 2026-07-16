import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import { reorderPageResponse } from "../../../page.controller";
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
      reorderPageResponse(authed, routeKey, requestId)
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}
