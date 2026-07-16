import AppError from "@/builder/app-error";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { confirmContactPrivacyAction } from "../../contact-privacy.service";
import {
  assertTrustedContactRequest,
  ContactSecurityError,
  enforceContactPrivacyRateLimit,
  readContactJsonBody,
} from "../../contact-security";
import { contactPrivacyConfirmSchema } from "../../contact.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

const errorResponse = (error: unknown) => {
  const status =
    error instanceof ContactSecurityError || error instanceof AppError
      ? error.status
      : error instanceof ZodError
        ? 422
        : 503;
  const message =
    status === 400
      ? "Verification failed or the request expired."
      : status === 429
        ? "Too many verification attempts. Please wait before trying again."
        : status === 422
          ? "Check the verification request and try again."
          : status === 409
            ? "This request requires assisted privacy support."
            : "The privacy request service is temporarily unavailable.";
  const response = NextResponse.json(
    { success: false, status, message },
    { status }
  );
  if (error instanceof ContactSecurityError && error.retryAfterSeconds) {
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
  }
  return headers(response);
};

export async function POST(request: NextRequest) {
  try {
    assertTrustedContactRequest(request);
    const parsed = contactPrivacyConfirmSchema.parse(
      await readContactJsonBody(request)
    );
    await enforceContactPrivacyRateLimit(request, "confirm", parsed.request_id);
    const data = await confirmContactPrivacyAction(parsed);
    const response = NextResponse.json(
      {
        success: true,
        status: 200,
        message:
          data.action === "access"
            ? "Contact data access request completed."
            : "Contact data deletion request processed.",
        data,
      },
      { status: 200 }
    );
    if (data.action === "access") {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename="contact-data-${parsed.request_id}.json"`
      );
    }
    return headers(response);
  } catch (error) {
    return errorResponse(error);
  }
}
