import { auth } from "@/middleware/auth.middleware";
import { validation } from "@/middleware/validation.middleware";
import type { TRole } from "@/types/jsonwebtoken.type";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as ArticleCategoryController from "../../../article-category.controller";
import * as ArticleCategoryValidation from "../../../article-category.validation";

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
          ArticleCategoryValidation.articleCategoryByIdOperationValidationSchema
        )(authedReq, (validatedReq) =>
          ArticleCategoryController.deleteArticleCategoryPermanentById(
            validatedReq,
            {
              params: resolvedParams,
            }
          )
        );
      }
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
