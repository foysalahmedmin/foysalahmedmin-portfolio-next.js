import type { NextRequest } from "next/server";
import { TimelineEntryController } from "../../../timeline-entry.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await TimelineEntryController.adminRestore(request, context);
}
