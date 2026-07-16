import type { NextRequest } from "next/server";
import { LegalDocumentController } from "../../legal-document.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return await LegalDocumentController.adminBulk(request);
}
