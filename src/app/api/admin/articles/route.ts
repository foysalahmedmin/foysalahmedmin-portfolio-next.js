import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import Article from "@/models/article.model";
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

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("collaborators", "name email")
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Article.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      message: "Articles fetched successfully",
      data: {
        articles,
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

      const existing = await Article.findOne({ slug: body.slug });

      if (existing) {
        return NextResponse.json(
          { success: false, message: "Article with this slug already exists" },
          { status: 409 }
        );
      }

      const status = body.status ?? "draft";
      const published_at =
        status === "published"
          ? body.published_at
            ? new Date(body.published_at)
            : new Date()
          : undefined;
      const expired_at =
        body.expired_at && status === "published"
          ? new Date(body.expired_at)
          : undefined;

      const article = await Article.create({
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        thumbnail: body.thumbnail,
        images: Array.isArray(body.images) ? body.images : undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        category: body.category,
        author: authedReq.user?.id,
        collaborators: Array.isArray(body.collaborators)
          ? body.collaborators
          : undefined,
        status,
        is_featured: Boolean(body.is_featured),
        is_premium: Boolean(body.is_premium),
        published_at,
        expired_at,
        layout: body.layout,
      });

      const populated = await article
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("collaborators", "name email");

      return NextResponse.json(
        {
          success: true,
          message: "Article created successfully",
          data: { article: populated },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Admin article create error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create article",
        },
        { status: 500 }
      );
    }
  });
}


