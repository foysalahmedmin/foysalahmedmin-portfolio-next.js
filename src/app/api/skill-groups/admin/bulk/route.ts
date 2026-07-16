import type { NextRequest } from "next/server";
import { SkillGroupController } from "../../skill-group.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await SkillGroupController.adminBulk(request);
}
