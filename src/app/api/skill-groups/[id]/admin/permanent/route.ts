import type { NextRequest } from "next/server";
import { SkillGroupController } from "../../../skill-group.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await SkillGroupController.adminPermanentDelete(request, context);
}
