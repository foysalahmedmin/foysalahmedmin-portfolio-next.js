import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { submitContact } from "./contact-intake.service";
import {
  contactSubmissionSchema,
  type ContactPublicError,
  type ContactPublicSuccess,
} from "./contact-public.contract";
import {
  assertContactTimingAndHoneypot,
  assertTrustedContactRequest,
  ContactSecurityError,
  enforceContactRateLimit,
  getIdempotencyKey,
  readContactJsonBody,
} from "./contact-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (
  error: ContactSecurityError,
  fields?: Record<string, string>
): NextResponse<ContactPublicError> => {
  const payload: ContactPublicError = {
    success: false,
    status: error.status,
    code: error.code,
    message: error.message,
    ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
  };
  const response = NextResponse.json(payload, { status: error.status });
  response.headers.set("cache-control", "no-store");
  if (error.retryAfterSeconds) {
    response.headers.set("retry-after", String(error.retryAfterSeconds));
  }
  return response;
};

const fieldsFromZodError = (error: ZodError): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fields[field] ??= issue.message;
  }
  return fields;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ContactPublicSuccess | ContactPublicError>> {
  try {
    assertTrustedContactRequest(request);
    const idempotencyKey = getIdempotencyKey(request);
    await enforceContactRateLimit(request);
    const rawBody = await readContactJsonBody(request);
    const submission = contactSubmissionSchema.parse(rawBody);
    assertContactTimingAndHoneypot(submission);

    const result = await submitContact(submission, {
      idempotencyKey,
      request,
    });
    const status = result.duplicate ? 200 : 201;
    const response = NextResponse.json(
      {
        success: true,
        status,
        message: result.duplicate
          ? "This message was already received."
          : "Your message was received.",
        data: result,
      } satisfies ContactPublicSuccess,
      { status }
    );
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        new ContactSecurityError(
          422,
          "invalid_submission",
          "Check the highlighted fields and try again."
        ),
        fieldsFromZodError(error)
      );
    }
    if (error instanceof ContactSecurityError) return errorResponse(error);

    return errorResponse(
      new ContactSecurityError(
        503,
        "temporarily_unavailable",
        "The contact service is temporarily unavailable. Please try again."
      )
    );
  }
}
