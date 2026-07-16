import type { NextRequest } from "next/server";
import { CredentialController } from "../credential.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await CredentialController.adminList(request);
}

export async function POST(request: NextRequest) {
  return await CredentialController.adminCreate(request);
}
