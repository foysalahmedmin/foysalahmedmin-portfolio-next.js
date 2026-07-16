import type { NextRequest } from "next/server";
import { FAQController } from "./faq.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await FAQController.publicList(request);
}
