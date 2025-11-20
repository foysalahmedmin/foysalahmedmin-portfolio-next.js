import connectDB from "@/lib/db";
import Project from "@/app/api/admin/projects/project.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const featured = url.searchParams.get("featured");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const author = url.searchParams.get("author");
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (featured === "true") {
      query.is_featured = true;
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (author) {
      query.author = author;
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("author", "name image")
        .populate("category", "name slug")
        .populate("client", "name image")
        .sort({ created_at: -1 })
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
  } catch (error) {
    console.error("Public projects fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}


