import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ProjectCategoryController from '../project-category.controller';
import * as ProjectCategoryValidation from '../project-category.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      ProjectCategoryController.getProjectCategories,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectCategoryValidation.createProjectCategorySchema)(
          authedReq,
          ProjectCategoryController.createProjectCategory,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectCategoryValidation.updateProjectCategoriesSchema)(
          authedReq,
          ProjectCategoryController.updateProjectCategories,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectCategoryValidation.projectCategoriesOperationValidationSchema)(
          authedReq,
          ProjectCategoryController.deleteProjectCategories,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
