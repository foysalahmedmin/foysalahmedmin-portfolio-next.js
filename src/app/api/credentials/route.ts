import type { NextRequest } from "next/server";
import { CredentialController } from "./credential.controller";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return await CredentialController.publicList(request);
}
