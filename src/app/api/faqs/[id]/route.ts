import type { NextRequest } from "next/server";
import { FAQController } from "../faq.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await FAQController.publicDetail(request, context);
}
