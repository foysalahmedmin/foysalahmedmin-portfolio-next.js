import type { NextRequest } from "next/server";
import { ServiceController } from "../service.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await ServiceController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await ServiceController.adminCreate(request);
}
