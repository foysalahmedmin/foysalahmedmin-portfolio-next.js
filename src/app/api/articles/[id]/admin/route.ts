import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ArticleController from '../../article.controller';
import * as ArticleValidation from '../../article.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      (authedReq) => {
        authedReq.params = params;
        return ArticleController.getArticleById(authedReq, { params });
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ArticleValidation.updateArticleByIdSchema)(
          authedReq,
          (validatedReq) =>
            ArticleController.updateArticleById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ArticleValidation.articleByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ArticleController.deleteArticleById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

