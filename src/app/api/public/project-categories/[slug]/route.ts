import connectDB from "@/lib/db";
import ProjectCategory from "@/app/api/admin/project-categories/project-category.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const category = await ProjectCategory.findOne({ slug: params.slug })
      .populate("parent", "name slug")
      .lean();

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Project category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project category fetched successfully",
      data: { category },
    });
  } catch (error: any) {
    console.error("Get project category error:", error);
    return NextResponse.json(
      { success: false, message: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

