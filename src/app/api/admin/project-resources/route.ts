import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import ProjectResource from "@/models/project-resource.model";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["super-admin", "admin"]);

const ensureAdmin = (role?: string) =>
  role && ADMIN_ROLES.has(role.toLowerCase());

export async function GET(req: AuthRequest) {
  return withAuth(req, async (authedReq: AuthRequest) => {
    if (!ensureAdmin(authedReq.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const url = new URL(authedReq.url);
    const project = url.searchParams.get("project");
    const type = url.searchParams.get("type");

    const query: Record<string, unknown> = {};

    if (project) {
      query.project = project;
    }

    if (type) {
      query.type = type;
    }

    const resources = await ProjectResource.find(query)
      .populate("project", "name slug")
      .sort({ sequence: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Project resources fetched successfully",
      data: { resources },
    });
  });
}

export async function POST(req: AuthRequest) {
  return withAuth(req, async (authedReq: AuthRequest) => {
    if (!ensureAdmin(authedReq.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    try {
      await connectDB();

      const body = await req.json();

      const requiredFields: Array<keyof typeof body> = [
        "project",
        "sequence",
        "title",
        "url",
      ];

      const missing = requiredFields.filter(
        (field) =>
          body[field] === undefined ||
          body[field] === null ||
          body[field]?.toString().trim() === ""
      );

      if (missing.length) {
        return NextResponse.json(
          {
            success: false,
            message: `Missing required fields: ${missing.join(", ")}`,
          },
          { status: 400 }
        );
      }

      const resource = await ProjectResource.create({
        project: body.project,
        sequence: Number(body.sequence),
        type: body.type ?? "other",
        title: body.title,
        url: body.url,
        description: body.description,
        is_private: Boolean(body.is_private),
      });

      const populated = await resource.populate("project", "name slug");

      return NextResponse.json(
        {
          success: true,
          message: "Project resource created successfully",
          data: { resource: populated },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Admin project resource create error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create project resource",
        },
        { status: 500 }
      );
    }
  });
}


