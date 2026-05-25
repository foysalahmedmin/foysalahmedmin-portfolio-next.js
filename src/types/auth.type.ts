import type { TResponse } from "./response.type";
import type { TUser } from "./user.type";

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
  password: string;
};

export type AuthResponse = TResponse<{
  token?: string;
  info?: TUser;
}>;
