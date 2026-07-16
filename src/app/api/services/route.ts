import type { NextRequest } from "next/server";
import { ServiceController } from "./service.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await ServiceController.publicList(request);
}
