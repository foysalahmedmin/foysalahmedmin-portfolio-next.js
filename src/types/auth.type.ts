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

export type MfaResponseState =
  | {
      required: true;
      stage: "enroll" | "verify";
      expires_at: string;
      issuer?: string;
      account_name?: string;
      manual_secret?: string;
    }
  | {
      required: false;
      stage: "recovery";
      recovery_codes: readonly string[];
    };

export type AuthResponse = TResponse<{
  info?: SessionInfo;
  mfa?: MfaResponseState;
}>;
