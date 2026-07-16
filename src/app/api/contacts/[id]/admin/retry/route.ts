import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as ContactController from "../../../contact.controller";
import { retryContactDeliverySchema } from "../../../contact.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params;
    return await auth("super-admin", "admin")(request, async (authed) => {
      authed.params = resolved;
      return validation(retryContactDeliverySchema)(authed, (validated) =>
        ContactController.retryContactDelivery(validated, { params: resolved })
      );
    });
  } catch (error) {
    return errorHandler(error, request);
  }
}
