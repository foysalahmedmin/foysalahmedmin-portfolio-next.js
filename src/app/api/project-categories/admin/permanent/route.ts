import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectCategoryController from '../../project-category.controller';
import * as ProjectCategoryValidation from '../../project-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectCategoryValidation.projectCategoriesOperationValidationSchema)(
          authedReq,
          ProjectCategoryController.deleteProjectCategoriesPermanent,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

