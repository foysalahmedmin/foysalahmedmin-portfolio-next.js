import type { TRole } from "./jsonwebtoken.type";
import type { TResponse } from "./response.type";

export type TStatus = "in-progress" | "blocked";

export type TUser = {
  _id: string;
  image?: string;
  name: string;
  email: string;
  password_changed_at?: Date;
  role: TRole;
  status: TStatus;
  is_verified?: boolean;
};

export type TUserResponse = TResponse<TUser>;
export type TUsersResponse = TResponse<TUser[]>;
