import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import ProjectResource from "@/models/project-resource.model";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["super-admin", "admin"]);

const ensureAdmin = (role?: string) =>
  role && ADMIN_ROLES.has(role.toLowerCase());

export async function PATCH(
  req: AuthRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, async (authedReq: AuthRequest) => {
    if (!ensureAdmin(authedReq.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    try {
      await connectDB();

      const payload = await req.json();

      const allowedFields = [
        "sequence",
        "type",
        "title",
        "url",
        "description",
        "is_private",
      ] as const;

      const updateData: Record<string, unknown> = {};

      allowedFields.forEach((field) => {
        if (field in payload) {
          if (field === "sequence") {
            updateData[field] = Number(payload[field]);
          } else {
            updateData[field] = payload[field];
          }
        }
      });

      const resource = await ProjectResource.findByIdAndUpdate(
        params.id,
        { $set: updateData },
        { new: true }
      ).populate("project", "name slug");

      if (!resource) {
        return NextResponse.json(
          { success: false, message: "Project resource not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Project resource updated successfully",
        data: { resource },
      });
    } catch (error) {
      console.error("Admin project resource update error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to update project resource",
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  req: AuthRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, async (authedReq: AuthRequest) => {
    if (!ensureAdmin(authedReq.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    try {
      await connectDB();

      const resource = await ProjectResource.findById(params.id);

      if (!resource) {
        return NextResponse.json(
          { success: false, message: "Project resource not found" },
          { status: 404 }
        );
      }

      await resource.softDelete();

      return NextResponse.json({
        success: true,
        message: "Project resource deleted successfully",
      });
    } catch (error) {
      console.error("Admin project resource delete error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete project resource",
        },
        { status: 500 }
      );
    }
  });
}


