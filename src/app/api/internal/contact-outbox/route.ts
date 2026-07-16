import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthorizedContactWorkerRequest,
  processContactOutbox,
} from "../../contacts/contact-outbox.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const run = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAuthorizedContactWorkerRequest(request)) {
    return NextResponse.json(
      { success: false, status: 401, message: "Unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const data = await processContactOutbox();
    return NextResponse.json(
      { success: true, status: 200, data },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: 503,
        message: "Outbox processing is temporarily unavailable.",
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
};

export const GET = run;
export const POST = run;
