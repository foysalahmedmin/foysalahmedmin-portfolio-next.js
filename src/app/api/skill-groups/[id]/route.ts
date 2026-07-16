import type { NextRequest } from "next/server";
import { SkillGroupController } from "../skill-group.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await SkillGroupController.publicDetail(request, context);
}
