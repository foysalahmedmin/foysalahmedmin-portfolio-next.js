import { prepareTrustedAuthJsonRequest } from "@/lib/auth/auth-request-security";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as AuthController from "../../auth.controller";
import { mfaEnrollmentValidationSchema } from "../../auth.validation";

export async function POST(req: NextRequest) {
  try {
    const securedRequest = await prepareTrustedAuthJsonRequest(req);
    return await validation(mfaEnrollmentValidationSchema)(
      securedRequest,
      AuthController.completeMfaEnrollment
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
