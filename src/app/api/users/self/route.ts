import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import * as UserController from "../user.controller";
import * as UserValidation from "../user.validation";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    return await auth(
      "super-admin",
      "admin",
      "editor",
      "author",
      "contributor",
      "subscriber",
      "user" as TRole
    )(req, UserController.getSelf);
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(req: NextRequest) {
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
      return await validation(UserValidation.updateSelfValidationSchema)(
        authedReq,
        UserController.updateSelf
      );
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
