import type { NextRequest } from "next/server";
import { TestimonialController } from "../../testimonial.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await TestimonialController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await TestimonialController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await TestimonialController.adminDelete(request, context);
}
