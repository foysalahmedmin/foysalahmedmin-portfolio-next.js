/**
 * @deprecated This file is kept for backward compatibility.
 * Please use @/middleware/auth.middleware instead for new code.
 * The new middleware provides role-based authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth.middleware";
import type { AuthUser as NewAuthUser } from "./auth.middleware";

// Legacy types for backward compatibility
export type AuthUser = {
  id: string;
  role: string;
};

export interface AuthRequest extends NextRequest {
  user?: AuthUser;
}

// Legacy wrapper - maps old format to new format
export async function withAuth(
  req: AuthRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>
) {
  try {
    // Use the new auth middleware with all roles allowed
    return await auth('super-admin', 'admin', 'editor', 'author', 'contributor', 'subscriber', 'user')(
      req,
      async (authedReq) => {
        // Map new format to old format for backward compatibility
        if (authedReq.user) {
          req.user = {
            id: authedReq.user._id,
            role: authedReq.user.role || 'user',
          };
        }
        return await handler(req);
      },
    );
  } catch (error: any) {
    // Handle errors in old format
    return NextResponse.json(
      { success: false, message: error?.message ?? "Internal server error" },
      { status: error?.status || 500 }
    );
  }
}
