import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectCategoryController from '../../project-category.controller';
import * as ProjectCategoryValidation from '../../project-category.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      (authedReq) => {
        authedReq.params = params;
        return ProjectCategoryController.getProjectCategoryBySlug(authedReq, {
          params,
        });
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ProjectCategoryValidation.updateProjectCategorySchema)(
          authedReq,
          (validatedReq) =>
            ProjectCategoryController.updateProjectCategoryBySlug(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
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
            ProjectCategoryController.deleteProjectCategoryBySlug(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
