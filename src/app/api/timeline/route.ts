import type { NextRequest } from "next/server";
import { TimelineEntryController } from "./timeline-entry.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await TimelineEntryController.publicList(request);
}
