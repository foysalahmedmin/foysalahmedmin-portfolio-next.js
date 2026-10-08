import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import { errorHandler } from "@/utils/error-handler";
import * as VideoCategoryController from "../../video-category.controller";
import * as VideoCategoryValidation from "../../video-category.validation";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    return await auth("super-admin", "admin" as TRole)(
      req,
      async (authedReq) => {
        return await validation(
          VideoCategoryValidation.videoCategoryIdsOperationValidationSchema
        )(
          authedReq,
          VideoCategoryController.deleteVideoCategoriesPermanent
        );
      }
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
