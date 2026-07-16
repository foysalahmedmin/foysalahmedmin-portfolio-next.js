import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  getCapabilitiesForRole,
  hasCapability,
  type Capability,
} from "./capabilities";
import { getAdminSignInPath } from "./admin-access";
import { verifyAccessSessionToken } from "./session-manager";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth-cookies";

export type AdminSession = {
  id: string;
  name: string;
  role: "super-admin" | "admin" | "editor" | "author" | "contributor";
  image?: string;
  is_verified: boolean;
  capabilities: readonly Capability[];
  access_expires_at: string;
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const principal = await verifyAccessSessionToken(token);
    if (!hasCapability(principal.role, "admin:access")) return null;
    return {
      id: principal._id,
      name: principal.name,
      role: principal.role as AdminSession["role"],
      image: principal.image,
      is_verified: Boolean(principal.is_verified),
      capabilities: getCapabilitiesForRole(principal.role),
      access_expires_at: principal.access_expires_at.toISOString(),
    };
  } catch {
    return null;
  }
});

export const hasRefreshSessionCookie = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value);
});

export const requireAdminSession = async (
  returnPath = "/admin",
  capability: Capability = "admin:access"
): Promise<AdminSession> => {
  const session = await getAdminSession();
  if (!session || !session.capabilities.includes(capability)) {
    redirect(getAdminSignInPath(returnPath));
  }
  return session;
};
