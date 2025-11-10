import connectDB from "@/lib/db";
import ProjectCategory from "@/models/project-category.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const parent = url.searchParams.get("parent");
    const status = url.searchParams.get("status") ?? "active";

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (parent === "root") {
      query.parent = { $in: [null, undefined] };
    } else if (parent) {
      query.parent = parent;
    }

    const categories = await ProjectCategory.find(query)
      .sort({ sequence: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Project categories fetched successfully",
      data: { categories },
    });
  } catch (error: any) {
    console.error("Get project categories error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message ?? "Internal server error",
      },
      { status: 500 }
    );
  }
}

