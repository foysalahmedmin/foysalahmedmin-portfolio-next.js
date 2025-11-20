import connectDB from "@/lib/db";
import Project from "@/app/api/admin/projects/project.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const project = await Project.findOne({ slug: params.slug })
      .populate("author", "name image")
      .populate("category", "name slug")
      .populate("client", "name image")
      .populate("collaborators", "name image")
      .populate("resources")
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project fetched successfully",
      data: { project },
    });
  } catch (error) {
    console.error("Public project fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch project",
      },
      { status: 500 }
    );
  }
}


