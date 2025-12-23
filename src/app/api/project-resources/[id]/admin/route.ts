import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ProjectResourceController from '../../project-resource.controller';
import * as ProjectResourceValidation from '../../project-resource.validation';

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
        return ProjectResourceController.getProjectResourceById(authedReq, {
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
        return await validation(ProjectResourceValidation.updateProjectResourceSchema)(
          authedReq,
          (validatedReq) =>
            ProjectResourceController.updateProjectResourceById(validatedReq, {
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
        return await validation(ProjectResourceValidation.projectResourceOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectResourceController.deleteProjectResourceById(validatedReq, {
              params: resolvedParams,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
