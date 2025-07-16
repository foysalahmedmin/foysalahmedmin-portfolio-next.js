import type { User } from "./model";

export interface UserState {
  token?: string;
  info?: User;
  isAuthenticated?: boolean;
  [key: string]: unknown;
}
