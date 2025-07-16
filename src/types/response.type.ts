import type { User } from "./model";

export interface Response {
  success?: boolean;
  message?: string;
  status?: number;
  data?: unknown;
  [key: string]: unknown;
}

export interface AuthResponse extends Response {
  data?: {
    token?: string;
    info?: User;
  };
}

export interface UserResponse extends Response {
  data?: User;
}

export interface UsersResponse extends Response {
  data?: User[];
}
