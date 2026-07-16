import type { NextRequest } from "next/server";
import { TestimonialController } from "../../testimonial.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await TestimonialController.adminReorder(request);
}
