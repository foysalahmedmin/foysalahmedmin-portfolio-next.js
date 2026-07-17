import type { AuthRequest } from "@/middleware/auth.middleware";
import AppError from "@/builder/app-error";
import {
  enforceRefreshRateLimit,
  enforceRecoveryRateLimit,
  enforceSignInRateLimit,
  enforceMfaRateLimit,
  assertTrustedAuthRequest,
} from "@/lib/auth/auth-request-security";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/lib/auth/auth-cookies";
import {
  clearMfaChallengeCookie,
  MFA_CHALLENGE_COOKIE,
  setMfaChallengeCookie,
} from "@/lib/auth/mfa-cookies";
import { revokeTokenSession } from "@/lib/auth/session-manager";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import * as AuthService from "./auth.service";
import * as MfaService from "./mfa.service";

const protectAuthResponse = <T extends NextResponse>(response: T): T => {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
};

export const signin = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const body = (req.parsedBody || (await req.json())) as {
      email: string;
      password: string;
    };
    await enforceSignInRateLimit(req, body.email.trim().toLowerCase());
    const cookieStore = await cookies();
    clearMfaChallengeCookie(cookieStore);
    const result = await AuthService.signin(body);
    if ("challenge_token" in result) {
      clearAuthCookies(cookieStore);
      setMfaChallengeCookie(
        cookieStore,
        result.challenge_token,
        result.expires_at
      );
      return protectAuthResponse(
        sendResponse({
          status: httpStatus.ACCEPTED,
          success: true,
          message: "Complete multi-factor authentication.",
          data: { mfa: result.prompt },
        })
      );
    }

    clearMfaChallengeCookie(cookieStore);
    setAuthCookies(cookieStore, result);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Signed in successfully.",
      data: { info: AuthService.toSafeSessionDTO(result.principal) },
    });
  }
);

export const completeMfaEnrollment = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value ?? "";
    await enforceMfaRateLimit(req, challengeToken);
    const body = (req.parsedBody || (await req.json())) as { code: string };
    const result = await MfaService.completeEnrollment(
      challengeToken,
      body.code
    );
    setAuthCookies(cookieStore, result.tokens);
    clearMfaChallengeCookie(cookieStore);

    return protectAuthResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Multi-factor authentication enabled.",
        data: {
          info: AuthService.toSafeSessionDTO(result.tokens.principal),
          mfa: {
            required: false,
            stage: "recovery" as const,
            recovery_codes: result.recovery_codes ?? [],
          },
        },
      })
    );
  }
);

export const verifyMfa = catchAsync(
  async (req: Request & { parsedBody?: Record<string, unknown> }) => {
    assertTrustedAuthRequest(req);
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value ?? "";
    await enforceMfaRateLimit(req, challengeToken);
    const body = (req.parsedBody || (await req.json())) as {
      code?: string;
      recovery_code?: string;
    };
    const result = await MfaService.verifyChallenge(challengeToken, body);
    setAuthCookies(cookieStore, result.tokens);
    clearMfaChallengeCookie(cookieStore);

    return protectAuthResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Signed in successfully.",
        data: { info: AuthService.toSafeSessionDTO(result.tokens.principal) },
      })
    );
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
    clearMfaChallengeCookie(cookieStore);
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
