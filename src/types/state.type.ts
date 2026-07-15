import type { TUser } from "./user.type";

export type TAuthState = {
  info?: TUser;
  is_authenticated?: boolean;
};

export type TSettingState = {
  theme?: "light" | "dark" | "system" | "semi-dark";
  direction?: "ltr" | "rtl";
  language?: "en" | "bn";
};
