import type { NextRequest } from "next/server";
import { SkillController } from "../skill.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await SkillController.publicDetail(request, context);
}
