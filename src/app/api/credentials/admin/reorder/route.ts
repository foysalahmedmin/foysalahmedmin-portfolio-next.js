import type { NextRequest } from "next/server";
import { CredentialController } from "../../credential.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await CredentialController.adminReorder(request);
}
