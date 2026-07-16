import type { NextRequest } from "next/server";
import { FAQController } from "../../faq.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await FAQController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await FAQController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await FAQController.adminDelete(request, context);
}
