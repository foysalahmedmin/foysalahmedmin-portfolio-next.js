import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ArticleCategoryController from '../../article-category.controller';
import * as ArticleCategoryValidation from '../../article-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ArticleCategoryValidation.articleCategoriesOperationValidationSchema)(
          authedReq,
          ArticleCategoryController.deleteArticleCategoriesPermanent,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

