import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ProjectCategoryController from '../../project-category.controller';
import * as ProjectCategoryValidation from '../../project-category.validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      (authedReq) => {
        authedReq.params = resolvedParams;
        return ProjectCategoryController.getProjectCategoryById(authedReq, {
          params: resolvedParams,
        });
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(ProjectCategoryValidation.updateProjectCategoryByIdSchema)(
          authedReq,
          (validatedReq) =>
            ProjectCategoryController.updateProjectCategoryById(validatedReq, {
              params: resolvedParams,
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(ProjectCategoryValidation.projectCategoryByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectCategoryController.deleteProjectCategoryById(validatedReq, {
              params: resolvedParams,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

