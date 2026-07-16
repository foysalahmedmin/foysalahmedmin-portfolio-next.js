import type { AuthRequest } from "@/middleware/auth.middleware";
import AppError from "@/builder/app-error";
import {
  enforceRefreshRateLimit,
  enforceRecoveryRateLimit,
  enforceSignInRateLimit,
  assertTrustedAuthRequest,
} from "@/lib/auth/auth-request-security";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth/auth-cookies";
import { revokeTokenSession } from "@/lib/auth/session-manager";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import { cookies } from "next/headers";
import * as AuthService from "./auth.service";

export const signin = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = (req.parsedBody || (await req.json())) as {
      email: string;
      password: string;
    };
    await enforceSignInRateLimit(req, body.email.trim().toLowerCase());
    const tokens = await AuthService.signin(body);
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, tokens);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Signed in successfully.",
      data: { info: AuthService.toSafeSessionDTO(tokens.principal) },
    });
  }
);

export const signup = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = req.parsedBody || (await req.json());
    const tokens = await AuthService.signup(
      body as Parameters<typeof AuthService.signup>[0]
    );
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, tokens);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: "Account created successfully.",
      data: { info: AuthService.toSafeSessionDTO(tokens.principal) },
    });
  }
);

export const refreshToken = catchAsync(async (req: Request) => {
  assertTrustedAuthRequest(req);
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    clearAuthCookies(cookieStore);
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required.");
  }

  let tokens;
  try {
    tokens = await AuthService.refreshToken(refreshToken, async (family) =>
      enforceRefreshRateLimit(req, family)
    );
  } catch (error) {
    if (error instanceof AppError && error.status === httpStatus.UNAUTHORIZED) {
      clearAuthCookies(cookieStore);
    }
    throw error;
  }
  setAuthCookies(cookieStore, tokens);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Session refreshed successfully.",
    data: { info: AuthService.toSafeSessionDTO(tokens.principal) },
  });
});

export const signout = catchAsync(async (req: Request) => {
  assertTrustedAuthRequest(req);
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  try {
    await revokeTokenSession({ refreshToken, accessToken });
  } finally {
    clearAuthCookies(cookieStore);
  }
  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Signed out successfully.",
    data: null,
  });
});

export const changePassword = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = req.parsedBody || (await req.json());
    const result = await AuthService.changePassword(
      req.user!,
      body as Parameters<typeof AuthService.changePassword>[1]
    );
    const cookieStore = await cookies();
    clearAuthCookies(cookieStore);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Password changed. Please sign in again.",
      data: result,
    });
  }
);

export const requestPasswordReset = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = (req.parsedBody || (await req.json())) as { email: string };
    await enforceRecoveryRateLimit(req, body.email.trim().toLowerCase());
    await AuthService.requestPasswordReset(body);
    return sendResponse({
      status: httpStatus.ACCEPTED,
      success: true,
      message:
        "If an eligible account exists, password reset instructions will be sent.",
      data: null,
    });
  }
);

export const resetPassword = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = (req.parsedBody || (await req.json())) as {
      token: string;
      password: string;
    };
    await enforceRecoveryRateLimit(req, body.token);
    const result = await AuthService.resetPassword(body);
    const cookieStore = await cookies();
    clearAuthCookies(cookieStore);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Password reset successfully. Please sign in.",
      data: result,
    });
  }
);
