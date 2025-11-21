import { TUser } from "./user.type";

export type TUserState = {
  token?: string;
  info?: TUser;
  is_authenticated?: boolean;
};

export type TSettingState = {
  theme?: "light" | "dark" | "system" | "semi-dark";
  direction?: "ltr" | "rtl";
  language?: "en" | "bn";
};