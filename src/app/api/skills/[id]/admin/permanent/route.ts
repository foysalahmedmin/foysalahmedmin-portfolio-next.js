import type { NextRequest } from "next/server";
import { SkillController } from "../../../skill.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await SkillController.adminPermanentDelete(request, context);
}
