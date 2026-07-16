import { getPublicSiteResponse } from "./site.controller";
import {
  createSiteRequestId,
  siteErrorResponse,
  siteQueryInput,
} from "./site.http";
import { parseEmptySiteQuery } from "./site.validation";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = createSiteRequestId();
  try {
    parseEmptySiteQuery(siteQueryInput(request));
    return getPublicSiteResponse(requestId);
  } catch (error) {
    return siteErrorResponse(error, requestId);
  }
}
