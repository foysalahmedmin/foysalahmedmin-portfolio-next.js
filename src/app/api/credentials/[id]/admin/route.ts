import type { NextRequest } from "next/server";
import { CredentialController } from "../../credential.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return await CredentialController.adminDetail(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return await CredentialController.adminUpdate(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return await CredentialController.adminDelete(request, context);
}
