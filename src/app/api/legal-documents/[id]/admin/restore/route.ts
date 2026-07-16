import type { NextRequest } from "next/server";
import { LegalDocumentController } from "../../../legal-document.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await LegalDocumentController.adminRestore(request, context);
}
