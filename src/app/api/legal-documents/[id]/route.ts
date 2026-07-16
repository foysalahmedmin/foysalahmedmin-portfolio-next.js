import type { NextRequest } from "next/server";
import { LegalDocumentController } from "../legal-document.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return await LegalDocumentController.publicDetail(request, context);
}
