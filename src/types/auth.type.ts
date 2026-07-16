import type { TResponse } from "./response.type";
import type { TRole } from "./jsonwebtoken.type";

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  image?: string | null;
  name: string;
  email: string;
  password: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type ForgetPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
};

export type SessionInfo = {
  id: string;
  name: string;
  role: TRole;
  image?: string;
  is_verified: boolean;
  capabilities: readonly string[];
  access_expires_at: string;
};

export type AuthResponse = TResponse<{
  info?: SessionInfo;
}>;
