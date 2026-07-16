import AppError from "@/builder/app-error";
import { hasCapability } from "@/lib/auth/capabilities";
import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import type { TRole } from "@/types/jsonwebtoken.type";
import { errorHandler } from "@/utils/error-handler";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import type { NextRequest } from "next/server";
import { queryAuditEvents } from "./audit-event.service";
import { parseAuditEventQuery } from "./audit-event.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getAuditEvents = async (req: AuthRequest) => {
  if (!req.user || !hasCapability(req.user.role, "audit:read")) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  }

  const url = new URL(req.url);
  const input: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    input[key] = value;
  });
  const query = parseAuditEventQuery(input);
  const result = await queryAuditEvents(query);
  const response = sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Audit events retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

export async function GET(req: NextRequest) {
  try {
    return await auth("super-admin", "admin" as TRole)(req, getAuditEvents);
  } catch (error) {
    return errorHandler(error, req);
  }
}
