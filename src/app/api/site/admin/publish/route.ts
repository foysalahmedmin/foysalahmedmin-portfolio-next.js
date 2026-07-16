import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { NextRequest } from "next/server";
import { publishSiteResponse } from "../../site.controller";
import {
  createSiteRequestId,
  readSiteJsonBody,
  siteErrorResponse,
} from "../../site.http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = createSiteRequestId();
  try {
    return await auth("super-admin", "admin")(
      request,
      async (authedRequest: AuthRequest) => {
        const body = await readSiteJsonBody(authedRequest);
        return publishSiteResponse(authedRequest, requestId, body);
      }
    );
  } catch (error) {
    return siteErrorResponse(error, requestId);
  }
}
