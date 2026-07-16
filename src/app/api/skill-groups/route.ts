import type { NextRequest } from "next/server";
import { SkillGroupController } from "./skill-group.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await SkillGroupController.publicList(request);
}
