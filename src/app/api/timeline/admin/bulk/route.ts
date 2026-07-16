import type { NextRequest } from "next/server";
import { TimelineEntryController } from "../../timeline-entry.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await TimelineEntryController.adminBulk(request);
}
