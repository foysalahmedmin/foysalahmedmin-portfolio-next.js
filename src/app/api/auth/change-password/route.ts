import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import * as AuthController from "../auth.controller";
import * as AuthValidation from "../auth.validation";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { NextRequest } from "next/server";
import { prepareTrustedAuthJsonRequest } from "@/lib/auth/auth-request-security";

export async function POST(req: NextRequest) {
  try {
    return await auth(
      "super-admin",
      "admin",
      "editor",
      "author",
      "contributor",
      "subscriber",
      "user" as TRole
    )(req, async (authedReq) => {
      const securedRequest = await prepareTrustedAuthJsonRequest(authedReq);
      return await validation(AuthValidation.changePasswordValidationSchema)(
        securedRequest,
        AuthController.changePassword
      );
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
