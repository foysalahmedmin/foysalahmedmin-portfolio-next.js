import type { NextRequest } from "next/server";
import { SkillController } from "../../skill.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await SkillController.adminReorder(request);
}
