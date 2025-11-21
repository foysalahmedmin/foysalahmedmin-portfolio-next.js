import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ProjectCategoryController from '../../../project-category.controller';
import * as ProjectCategoryValidation from '../../../project-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ProjectCategoryValidation.projectCategoryOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectCategoryController.restoreProjectCategory(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

