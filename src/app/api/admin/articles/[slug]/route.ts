import connectDB from "@/lib/db";
import { AuthRequest, withAuth } from "@/middleware/auth";
import Article from "@/models/article.model";
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

    const article = await Article.findOne({ slug: params.slug })
      .populate("author", "name email")
      .populate("category", "name slug")
      .populate("collaborators", "name email");

    if (!article) {
      return NextResponse.json(
        { success: false, message: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Article fetched successfully",
      data: { article },
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
        const exists = await Article.findOne({ slug: payload.slug });
        if (exists) {
          return NextResponse.json(
            { success: false, message: "Article with this slug already exists" },
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
        "collaborators",
        "status",
        "is_featured",
        "is_premium",
        "published_at",
        "expired_at",
        "layout",
      ] as const;

      const updateData: Record<string, unknown> = {};

      allowedFields.forEach((field) => {
        if (field in payload) {
          if (["published_at", "expired_at"].includes(field) && payload[field]) {
            updateData[field] = new Date(payload[field]);
          } else {
            updateData[field] = payload[field];
          }
        }
      });

      // Ensure published_at present if status set to published
      if (
        updateData.status === "published" &&
        !updateData.published_at &&
        !payload.published_at
      ) {
        updateData.published_at = new Date();
      }

      const article = await Article.findOneAndUpdate(
        { slug: params.slug },
        { $set: updateData },
        { new: true }
      )
        .populate("author", "name email")
        .populate("category", "name slug")
        .populate("collaborators", "name email");

      if (!article) {
        return NextResponse.json(
          { success: false, message: "Article not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Article updated successfully",
        data: { article },
      });
    } catch (error) {
      console.error("Admin article update error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to update article",
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

      const article = await Article.findOne({ slug: params.slug });

      if (!article) {
        return NextResponse.json(
          { success: false, message: "Article not found" },
          { status: 404 }
        );
      }

      await article.softDelete();

      return NextResponse.json({
        success: true,
        message: "Article deleted successfully",
      });
    } catch (error) {
      console.error("Admin article delete error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete article",
        },
        { status: 500 }
      );
    }
  });
}


