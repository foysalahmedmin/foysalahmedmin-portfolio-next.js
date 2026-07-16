import type { NextRequest } from "next/server";
import { LegalDocumentController } from "../../legal-document.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await LegalDocumentController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await LegalDocumentController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await LegalDocumentController.adminDelete(request, context);
}
