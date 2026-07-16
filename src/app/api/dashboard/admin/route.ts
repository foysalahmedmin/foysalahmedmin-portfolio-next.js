import AppError from "@/builder/app-error";
import { hasCapability } from "@/lib/auth/capabilities";
import { auth, type AuthRequest } from "@/middleware/auth.middleware";
import { errorHandler } from "@/utils/error-handler";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import type { NextRequest } from "next/server";
import { getDashboardSnapshot } from "../dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getDashboard = async (request: AuthRequest) => {
  if (!request.user || !hasCapability(request.user.role, "dashboard:read")) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
  }
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  if (Object.keys(query).length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Dashboard query is not supported"
    );
  }
  const response = sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Dashboard snapshot retrieved successfully",
    data: await getDashboardSnapshot(),
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

export async function GET(request: NextRequest) {
  try {
    return await auth("super-admin", "admin")(request, getDashboard);
  } catch (error) {
    return errorHandler(error, request);
  }
}
