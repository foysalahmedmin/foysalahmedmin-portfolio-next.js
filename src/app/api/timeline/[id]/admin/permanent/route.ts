import type { NextRequest } from "next/server";
import { TimelineEntryController } from "../../../timeline-entry.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await TimelineEntryController.adminPermanentDelete(request, context);
}
