import type { NextRequest } from "next/server";
import { TestimonialController } from "../../../testimonial.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await TestimonialController.adminRestore(request, context);
}
