import type { NextRequest } from "next/server";
import { ServiceController } from "../../service.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await ServiceController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await ServiceController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await ServiceController.adminDelete(request, context);
}
