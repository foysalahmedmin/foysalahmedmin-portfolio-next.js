import type { NextRequest } from "next/server";
import { FAQController } from "../../../faq.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await FAQController.adminRestore(request, context);
}
