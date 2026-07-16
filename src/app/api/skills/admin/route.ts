import type { NextRequest } from "next/server";
import { SkillController } from "../skill.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await SkillController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await SkillController.adminCreate(request);
}
