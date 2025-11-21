import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ArticleCategoryController from '../../../article-category.controller';
import * as ArticleCategoryValidation from '../../../article-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ArticleCategoryValidation.articleCategoryOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ArticleCategoryController.deleteArticleCategoryPermanent(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

