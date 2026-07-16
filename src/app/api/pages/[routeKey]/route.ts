import type { NextRequest } from "next/server";
import { publicPageResponse } from "../page.controller";
import {
  assertEmptyPageRequestQuery,
  createPageRequestId,
  pageErrorResponse,
} from "../page.http";
import { resolvePageRouteKey, type TPageRouteContext } from "../page.route";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: TPageRouteContext) {
  const requestId = createPageRequestId();
  try {
    assertEmptyPageRequestQuery(request);
    return await publicPageResponse(
      await resolvePageRouteKey(context),
      requestId
    );
  } catch (error) {
    return pageErrorResponse(error, requestId);
  }
}
