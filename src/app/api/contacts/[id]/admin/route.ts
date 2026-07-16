import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import type { TRole } from "@/types/jsonwebtoken.type";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as ContactController from "../../contact.controller";
import * as ContactValidation from "../../contact.validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    return await auth("super-admin", "admin" as TRole)(req, (authedReq) => {
      authedReq.params = resolvedParams;
      return ContactController.getContactById(authedReq, {
        params: resolvedParams,
      });
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    return await auth("super-admin", "admin" as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(ContactValidation.updateContactByIdSchema)(
          authedReq,
          (validatedReq) =>
            ContactController.updateContactById(validatedReq, {
              params: resolvedParams,
            })
        );
      }
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    return await auth("super-admin", "admin" as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(
          ContactValidation.contactByIdOperationValidationSchema
        )(authedReq, (validatedReq) =>
          ContactController.deleteContactById(validatedReq, {
            params: resolvedParams,
          })
        );
      }
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
