import type { NextRequest } from "next/server";
import { FAQController } from "../../faq.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await FAQController.adminReorder(request);
}
