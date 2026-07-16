import type { NextRequest } from "next/server";
import { SkillController } from "../../skill.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await SkillController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await SkillController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await SkillController.adminDelete(request, context);
}
