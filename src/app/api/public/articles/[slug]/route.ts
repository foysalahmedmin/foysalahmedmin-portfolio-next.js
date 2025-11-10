import connectDB from "@/lib/db";
import Article from "@/models/article.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const article = await Article.findOne({
      slug: params.slug,
      status: "published",
    })
      .populate("author", "name image")
      .populate("category", "name slug")
      .populate("collaborators", "name image")
      .lean();

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
  } catch (error) {
    console.error("Public article fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch article",
      },
      { status: 500 }
    );
  }
}


