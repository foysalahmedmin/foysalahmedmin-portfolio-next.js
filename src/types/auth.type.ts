import type { Response } from "./response.type";
import type { TUser } from "./user.type";

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  image?: File | null;
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

export type AuthResponse = Response<{
  token?: string;
  info?: TUser;
}>;
