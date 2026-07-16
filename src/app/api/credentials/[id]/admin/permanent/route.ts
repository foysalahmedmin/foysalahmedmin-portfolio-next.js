import type { NextRequest } from "next/server";
import { CredentialController } from "../../../credential.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await CredentialController.adminPermanentDelete(request, context);
}
