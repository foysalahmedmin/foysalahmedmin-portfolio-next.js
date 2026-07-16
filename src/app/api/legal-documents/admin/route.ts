import type { NextRequest } from "next/server";
import { LegalDocumentController } from "../legal-document.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await LegalDocumentController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await LegalDocumentController.adminCreate(request);
}
