import type { NextRequest } from "next/server";
import { TimelineEntryController } from "../../timeline-entry.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await TimelineEntryController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await TimelineEntryController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await TimelineEntryController.adminDelete(request, context);
}
