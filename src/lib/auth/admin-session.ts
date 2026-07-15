import "server-only";

import User from "@/app/api/users/user.model";
import { ENV } from "@/config";
import connectDB from "@/lib/db";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  decideAdminAccess,
  getAdminSignInPath,
  isAdminRole,
  type AdminSessionClaims,
  type AdminSessionUser,
} from "./admin-access";

const ACCESS_TOKEN_COOKIE = "access_token";

export type AdminSession = TJwtPayload & {
  role: "super-admin" | "admin";
};

const decodeAccessToken = (token: string): AdminSessionClaims | null => {
  try {
    const decoded = jwt.verify(token, ENV.jwt_access_secret, {
      algorithms: ["HS256"],
    });
    return typeof decoded === "string" ? null : (decoded as AdminSessionClaims);
  } catch {
    return null;
  }
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) return null;

  const claims = decodeAccessToken(token);

  if (
    !claims ||
    typeof claims._id !== "string" ||
    typeof claims.iat !== "number" ||
    !isAdminRole(claims.role)
  ) {
    return null;
  }

  await connectDB();

  const user = (await User.findById(claims._id)
    .setOptions({ bypassDeleted: true })
    .select(
      "name email image role status is_verified +password_changed_at +is_deleted"
    )
    .lean()) as AdminSessionUser | null;
  const decision = decideAdminAccess(claims, user);

  if (!decision.allowed || !user) return null;

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: typeof user.image === "string" ? user.image : user.image?.toString(),
    role: decision.role,
    is_verified: Boolean(user.is_verified),
  };
});

export const requireAdminSession = async (
  returnPath = "/admin"
): Promise<AdminSession> => {
  const session = await getAdminSession();

  if (!session) redirect(getAdminSignInPath(returnPath));

  return session;
};
