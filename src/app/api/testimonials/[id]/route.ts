import type { NextRequest } from "next/server";
import { TestimonialController } from "../testimonial.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await TestimonialController.publicDetail(request, context);
}
