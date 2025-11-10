import connectDB from "@/lib/db";
import Article from "@/models/article.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const featured = url.searchParams.get("featured");
    const category = url.searchParams.get("category");
    const author = url.searchParams.get("author");
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      status: "published",
    };

    if (featured === "true") {
      query.is_featured = true;
    }

    if (category) {
      query.category = category;
    }

    if (author) {
      query.author = author;
    }

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate("author", "name image")
        .populate("category", "name slug")
        .sort({ published_at: -1 })
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
  } catch (error) {
    console.error("Public articles fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch articles",
      },
      { status: 500 }
    );
  }
}


