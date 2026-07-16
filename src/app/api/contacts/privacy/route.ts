import AppError from "@/builder/app-error";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requestContactPrivacyAction } from "../contact-privacy.service";
import {
  assertTrustedContactRequest,
  ContactSecurityError,
  enforceContactPrivacyRateLimit,
  readContactJsonBody,
} from "../contact-security";
import { contactPrivacyRequestSchema } from "../contact.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = (response: NextResponse) => {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};

const privacyError = (error: unknown) => {
  const status =
    error instanceof ContactSecurityError || error instanceof AppError
      ? error.status
      : error instanceof ZodError
        ? 422
        : 503;
  const message =
    status === 429
      ? "Too many privacy requests. Please wait before trying again."
      : status === 422
        ? "Check the privacy request and try again."
        : "The privacy request service is temporarily unavailable.";
  const response = NextResponse.json(
    { success: false, status, message },
    { status }
  );
  if (error instanceof ContactSecurityError && error.retryAfterSeconds) {
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
  }
  return responseHeaders(response);
};

export async function POST(request: NextRequest) {
  try {
    assertTrustedContactRequest(request);
    const parsed = contactPrivacyRequestSchema.parse(
      await readContactJsonBody(request)
    );
    await enforceContactPrivacyRateLimit(request, "request", parsed.email);
    const data = await requestContactPrivacyAction(parsed);
    return responseHeaders(
      NextResponse.json(
        {
          success: true,
          status: 202,
          message:
            "If matching records exist, a verification code has been sent.",
          data,
        },
        { status: 202 }
      )
    );
  } catch (error) {
    return privacyError(error);
  }
}
