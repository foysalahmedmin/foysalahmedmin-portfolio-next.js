import type { NextRequest } from "next/server";
import { ServiceController } from "../../service.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await ServiceController.adminReorder(request);
}
