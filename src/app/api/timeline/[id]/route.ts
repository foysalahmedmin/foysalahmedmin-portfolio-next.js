import type { NextRequest } from "next/server";
import { TimelineEntryController } from "../timeline-entry.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await TimelineEntryController.publicDetail(request, context);
}
