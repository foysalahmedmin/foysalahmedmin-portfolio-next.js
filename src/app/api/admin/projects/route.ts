import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import Project from "@/models/project.model";
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
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const author = url.searchParams.get("author");
    const search = url.searchParams.get("search");
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (author) {
      query.author = author;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("client", "name email")
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      message: "Projects fetched successfully",
      data: {
        projects,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
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
        "name",
        "slug",
        "content",
        "category",
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

      const existing = await Project.findOne({ slug: body.slug });

      if (existing) {
        return NextResponse.json(
          { success: false, message: "Project with this slug already exists" },
          { status: 409 }
        );
      }

      const project = await Project.create({
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        thumbnail: body.thumbnail,
        images: Array.isArray(body.images) ? body.images : undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        category: body.category,
        author: authedReq.user?.id,
        client: body.client,
        collaborators: Array.isArray(body.collaborators)
          ? body.collaborators
          : undefined,
        status: body.status ?? "planned",
        is_featured: Boolean(body.is_featured),
        is_premium: Boolean(body.is_premium),
        started_at: body.started_at ? new Date(body.started_at) : undefined,
        ended_at: body.ended_at ? new Date(body.ended_at) : undefined,
        layout: body.layout,
      });

      const populated = await project
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("client", "name email");

      return NextResponse.json(
        {
          success: true,
          message: "Project created successfully",
          data: { project: populated },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Admin project create error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create project",
        },
        { status: 500 }
      );
    }
  });
}


