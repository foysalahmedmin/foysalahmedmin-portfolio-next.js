import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as AuthController from "../auth.controller";
import * as AuthValidation from "../auth.validation";
import { prepareTrustedAuthJsonRequest } from "@/lib/auth/auth-request-security";

export async function POST(req: NextRequest) {
  try {
    const securedRequest = await prepareTrustedAuthJsonRequest(req);
    return await validation(
      AuthValidation.requestPasswordResetValidationSchema
    )(securedRequest, AuthController.requestPasswordReset);
  } catch (error) {
    return errorHandler(error, req);
  }
}
