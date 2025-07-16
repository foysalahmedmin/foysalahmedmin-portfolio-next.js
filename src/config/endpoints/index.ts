import { ENV } from "../env";

export const BASE_URL = ENV.base_url;

export const ENDPOINTS = {
  signin: "/api/auth/signin",
  signup: "/api/auth/signup",
  signout: "/api/auth/signout",
};

export const getFullEndpoint = (key: keyof typeof ENDPOINTS): string => {
  return `${BASE_URL}${ENDPOINTS[key]}`;
};
