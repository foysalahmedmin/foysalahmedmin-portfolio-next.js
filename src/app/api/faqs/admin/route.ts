import type { NextRequest } from "next/server";
import { FAQController } from "../faq.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await FAQController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await FAQController.adminCreate(request);
}
