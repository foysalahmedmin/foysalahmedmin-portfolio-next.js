import connectDB from "@/lib/db";
import ArticleCategory from "@/models/article-category.model";
import { AuthRequest, withAuth } from "@/middleware/auth";
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

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    const categories = await ArticleCategory.find(query)
      .sort({ sequence: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Article categories fetched successfully",
      data: { categories },
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

    await connectDB();

    const body = await req.json();
    const {
      name,
      slug,
      sequence,
      description,
      icon,
      thumbnail,
      parent,
      status = "active",
      tags = [],
      layout = "default",
      seo = {},
    } = body;

    if (!name || !slug || typeof sequence !== "number") {
      return NextResponse.json(
        {
          success: false,
          message: "name, slug and sequence are required",
        },
        { status: 400 }
      );
    }

    const existingCategory = await ArticleCategory.findOne({ slug });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Article category with this slug already exists",
        },
        { status: 409 }
      );
    }

    const category = await ArticleCategory.create({
      name,
      slug,
      sequence,
      description,
      icon,
      thumbnail,
      parent: parent || null,
      status,
      tags,
      layout,
      seo,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Article category created successfully",
        data: { category },
      },
      { status: 201 }
    );
  });
}

