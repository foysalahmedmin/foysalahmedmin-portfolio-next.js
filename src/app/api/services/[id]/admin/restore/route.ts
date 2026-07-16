import type { NextRequest } from "next/server";
import { ServiceController } from "../../../service.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await ServiceController.adminRestore(request, context);
}
