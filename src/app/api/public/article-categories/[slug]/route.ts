import connectDB from "@/lib/db";
import ArticleCategory from "@/app/api/admin/article-categories/article-category.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
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
  } catch (error: any) {
    console.error("Get article category error:", error);
    return NextResponse.json(
      { success: false, message: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

