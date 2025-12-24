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
    const error = await res.text();
    throw new Error(error || "Fetch request failed");
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
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  if (payload.image) formData.append("image", payload.image);

  const res = await fetch(`${ENV.url}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
}

// POST - Refresh Token
export async function refreshToken(): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res);
}

// PATCH - Change Password
export async function changePassword(
  payload: ChangePasswordPayload
): Promise<AuthResponse> {
  const res = await fetch(`${getBaseUrl()}/api/auth/change-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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
