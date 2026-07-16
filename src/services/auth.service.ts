import { ENV } from "@/config";
import type {
  AuthResponse,
  ChangePasswordPayload,
  ForgetPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
} from "@/types/auth.type";

const getBaseUrl = () => (ENV.url && ENV.url !== "undefined" ? ENV.url : "");

// Helper function to handle fetch responses
async function handleResponse(res: Response) {
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message || "The request could not be completed.");
  }
  return res.json() as Promise<AuthResponse>;
}

// POST - Sign In
export async function signIn(payload: SignInPayload): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// POST - Sign Up
export async function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// POST - Refresh Token
async function performRefreshToken(): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res);
}

export async function refreshToken(): Promise<AuthResponse> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request(
      "portfolio-auth-refresh",
      performRefreshToken
    );
  }
  return await performRefreshToken();
}

// POST - Sign Out
export async function signOut(): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/signout`, {
    method: "POST",
    credentials: "include",
  });
  const response = await handleResponse(res);
  if (typeof window !== "undefined") {
    for (const key of ["auth", "user", "accessToken", "refreshToken"]) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    window.dispatchEvent(new Event("auth:signout"));
    try {
      const channel = new BroadcastChannel("portfolio-auth");
      channel.postMessage({ type: "signout" });
      channel.close();
    } catch {
      // BroadcastChannel is an enhancement; server revocation is authoritative.
    }
  }
  return response;
}

// PATCH - Change Password
export async function changePassword(
  payload: ChangePasswordPayload
): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// POST - Forget Password
export async function forgetPassword(
  payload: ForgetPasswordPayload
): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/forget-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// PATCH - Reset Password
export async function resetPassword(
  payload: ResetPasswordPayload
): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// POST - Email Verification Source
export async function emailVerificationSource(): Promise<AuthResponse> {
  const res = await fetch(
    `${getBaseUrl()}/api/auth/email-verification-source`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleResponse(res);
}

// POST - Email Verification
export async function emailVerification(): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/email-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res);
}
