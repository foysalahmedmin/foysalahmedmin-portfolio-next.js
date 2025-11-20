import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectCategoryController from './project-category.controller';
import * as ProjectCategoryValidation from './project-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

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
