import connectDB from "@/lib/db";
import ProjectResource from "@/app/api/admin/project-resources/project-resource.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const project = url.searchParams.get("project");
    const includePrivate = url.searchParams.get("includePrivate") === "true";

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project id is required to fetch resources",
        },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      project,
    };

    if (!includePrivate) {
      query.is_private = false;
    }

    const resources = await ProjectResource.find(query)
      .sort({ sequence: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "Project resources fetched successfully",
      data: { resources },
    });
  } catch (error) {
    console.error("Public project resources fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch project resources",
      },
      { status: 500 }
    );
  }
}


