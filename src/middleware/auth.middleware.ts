import AppError from "@/builder/app-error";
import { getAdminApiAuthority, hasCapability } from "@/lib/auth/capabilities";
import { verifyAccessSessionToken } from "@/lib/auth/session-manager";
import type { TJwtPayload, TRole } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { assertTrustedAuthRequest } from "@/lib/auth/auth-request-security";

export type AuthUser = TJwtPayload & {
  id: string;
  role: TRole;
  session_id: string;
};

export interface AuthRequest extends NextRequest {
  user?: AuthUser;
  params?: Record<string, string>;
}

type RequestToken = Readonly<{
  value: string;
  source: "cookie" | "bearer";
}>;

const getRequestToken = async (
  request: Request
): Promise<RequestToken | null> => {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("access_token")?.value;
  if (cookieToken) return { value: cookieToken, source: "cookie" };

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return null;
  const bearerToken = authorization.slice(7).trim();
  return bearerToken ? { value: bearerToken, source: "bearer" } : null;
};

export const shouldEnforceCookieMutationOrigin = (
  method: string,
  tokenSource: RequestToken["source"]
): boolean =>
  tokenSource === "cookie" &&
  !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export const auth = (...roles: (TRole | "guest")[]) => {
  return async (
    req: Request,
    handler: (req: AuthRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const authReq = req as AuthRequest;
    const token = await getRequestToken(req);

    if (roles.includes("guest") && !token) return await handler(authReq);
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required.");
    }

    if (shouldEnforceCookieMutationOrigin(req.method, token.source)) {
      assertTrustedAuthRequest(req);
    }

    const principal = await verifyAccessSessionToken(token.value);
    const url = new URL(req.url);
    const adminAuthority = getAdminApiAuthority(url.pathname, req.method);

    if (adminAuthority.kind === "unmapped-admin-api") {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
    }
    if (
      adminAuthority.kind === "capability" &&
      !hasCapability(principal.role, adminAuthority.capability)
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
    }
    if (
      adminAuthority.kind === "not-admin-api" &&
      !roles.includes(principal.role)
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied.");
    }

    authReq.user = {
      id: principal._id,
      _id: principal._id,
      name: principal.name,
      email: principal.email,
      image: principal.image,
      role: principal.role,
      is_verified: principal.is_verified,
      session_id: principal.session_id,
    };
    return await handler(authReq);
  };
};

export async function withAuth(
  req: AuthRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>
) {
  return auth(
    "user",
    "admin",
    "super-admin",
    "editor",
    "author",
    "contributor",
    "subscriber"
  )(req, handler);
}
