import { ENV } from "@/config";
import connectDB from "@/lib/db";
import User from "@/models/user.model";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export type AuthUser = {
  id: string;
  role: string;
};

export interface AuthRequest extends NextRequest {
  user?: AuthUser;
}

export async function withAuth(
  req: AuthRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>
) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(token, ENV.jwtAccessSecret) as { id: string };

      await connectDB();

      const user = await User.findById(decoded.id).select("role status");

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: User not found" },
          { status: 401 }
        );
      }

      if (user.status === "blocked") {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Account blocked" },
          { status: 403 }
        );
      }

      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      return await handler(req);
    } catch (error) {
      console.error("Auth verification error:", error);
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    return NextResponse.json(
      { success: false, message: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
