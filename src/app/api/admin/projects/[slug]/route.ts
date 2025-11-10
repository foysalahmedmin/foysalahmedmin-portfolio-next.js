import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import Project from "@/models/project.model";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["super-admin", "admin"]);

const ensureAdmin = (role?: string) =>
  role && ADMIN_ROLES.has(role.toLowerCase());

export async function GET(
  req: AuthRequest,
  { params }: { params: { slug: string } }
) {
  return withAuth(req, async (authedReq: AuthRequest) => {
    if (!ensureAdmin(authedReq.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const project = await Project.findOne({ slug: params.slug })
      .populate("author", "name email")
      .populate("category", "name slug")
      .populate("client", "name email")
      .populate("collaborators", "name email");

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project fetched successfully",
      data: { project },
    });
  });
}

export async function PATCH(
  req: AuthRequest,
  { params }: { params: { slug: string } }
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

      if (payload.slug && payload.slug !== params.slug) {
        const exists = await Project.findOne({ slug: payload.slug });
        if (exists) {
          return NextResponse.json(
            { success: false, message: "Project with this slug already exists" },
            { status: 409 }
          );
        }
      }

      const allowedFields = [
        "name",
        "slug",
        "description",
        "content",
        "thumbnail",
        "images",
        "tags",
        "category",
        "client",
        "collaborators",
        "status",
        "is_featured",
        "is_premium",
        "started_at",
        "ended_at",
        "layout",
      ] as const;

      const updateData: Record<string, unknown> = {};

      allowedFields.forEach((field) => {
        if (field in payload) {
          if (["started_at", "ended_at"].includes(field) && payload[field]) {
            updateData[field] = new Date(payload[field]);
          } else {
            updateData[field] = payload[field];
          }
        }
      });

      const project = await Project.findOneAndUpdate(
        { slug: params.slug },
        { $set: updateData },
        { new: true }
      )
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("client", "name email")
        .populate("collaborators", "name email");

      if (!project) {
        return NextResponse.json(
          { success: false, message: "Project not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Project updated successfully",
        data: { project },
      });
    } catch (error) {
      console.error("Admin project update error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to update project",
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  req: AuthRequest,
  { params }: { params: { slug: string } }
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

      const project = await Project.findOne({ slug: params.slug });

      if (!project) {
        return NextResponse.json(
          { success: false, message: "Project not found" },
          { status: 404 }
        );
      }

      await project.softDelete();

      return NextResponse.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Admin project delete error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete project",
        },
        { status: 500 }
      );
    }
  });
}


