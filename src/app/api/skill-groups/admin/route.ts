import type { NextRequest } from "next/server";
import { SkillGroupController } from "../skill-group.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await SkillGroupController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await SkillGroupController.adminCreate(request);
}
