import type { NextRequest } from "next/server";
import { SkillGroupController } from "../../skill-group.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await SkillGroupController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await SkillGroupController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await SkillGroupController.adminDelete(request, context);
}
