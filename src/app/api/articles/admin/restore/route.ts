import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ArticleController from '../../article.controller';
import * as ArticleValidation from '../../article.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ArticleValidation.articlesOperationValidationSchema)(
          authedReq,
          ArticleController.restoreArticles,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

