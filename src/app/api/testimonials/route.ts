import type { NextRequest } from "next/server";
import { TestimonialController } from "./testimonial.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await TestimonialController.publicList(request);
}
