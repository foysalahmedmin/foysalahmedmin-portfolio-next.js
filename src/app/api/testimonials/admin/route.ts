import type { NextRequest } from "next/server";
import { TestimonialController } from "../testimonial.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await TestimonialController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await TestimonialController.adminCreate(request);
}
