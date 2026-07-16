import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import * as ContactController from "../../contact.controller";
import * as ContactValidation from "../../contact.validation";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    return await auth("super-admin", "admin" as TRole)(
      req,
      async (authedReq) => {
        return await validation(
          ContactValidation.contactsOperationValidationSchema
        )(authedReq, ContactController.restoreContacts);
      }
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
