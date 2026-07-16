import type { NextRequest } from "next/server";
import { CredentialController } from "../credential.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await CredentialController.publicDetail(request, context);
}
