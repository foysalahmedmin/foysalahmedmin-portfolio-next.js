import type { NextRequest } from "next/server";
import { ServiceController } from "../service.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await ServiceController.publicDetail(request, context);
}
