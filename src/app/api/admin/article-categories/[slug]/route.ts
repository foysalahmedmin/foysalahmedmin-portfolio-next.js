import connectDB from "@/lib/db";
import Article from "@/models/article.model";
import ArticleCategory from "@/models/article-category.model";
import { AuthRequest, withAuth } from "@/middleware/auth";
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

    const category = await ArticleCategory.findOne({ slug: params.slug })
      .populate("parent", "name slug")
      .lean();

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Article category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Article category fetched successfully",
      data: { category },
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

    await connectDB();

    const payload = await req.json();

    if (payload.slug && payload.slug !== params.slug) {
      const existing = await ArticleCategory.findOne({
        slug: payload.slug,
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message: "Article category with this slug already exists",
          },
          { status: 409 }
        );
      }
    }

    const updatableFields = [
      "name",
      "slug",
      "sequence",
      "description",
      "icon",
      "thumbnail",
      "parent",
      "status",
      "tags",
      "layout",
      "seo",
    ] as const;

    const updateData: Record<string, unknown> = {};

    updatableFields.forEach((field) => {
      if (field in payload) {
        updateData[field] = payload[field];
      }
    });

    const category = await ArticleCategory.findOneAndUpdate(
      { slug: params.slug },
      { $set: updateData },
      { new: true }
    );

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Article category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Article category updated successfully",
      data: { category },
    });
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

    await connectDB();

    const category = await ArticleCategory.findOne({ slug: params.slug });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Article category not found" },
        { status: 404 }
      );
    }

    const usageCount = await Article.countDocuments({ category: category._id });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete category that is in use by articles",
          data: { usageCount },
        },
        { status: 409 }
      );
    }

    await ArticleCategory.findByIdAndUpdate(category._id, {
      is_deleted: true,
    });

    return NextResponse.json({
      success: true,
      message: "Article category deleted successfully",
    });
  });
}

