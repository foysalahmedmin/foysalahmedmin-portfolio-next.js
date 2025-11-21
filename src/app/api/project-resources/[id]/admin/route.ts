import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ProjectResourceController from '../../project-resource.controller';
import * as ProjectResourceValidation from '../../project-resource.validation';
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
        return ProjectResourceController.getProjectResourceById(authedReq, {
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
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ProjectResourceValidation.updateProjectResourceSchema)(
          authedReq,
          (validatedReq) =>
            ProjectResourceController.updateProjectResourceById(validatedReq, {
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
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ProjectResourceValidation.projectResourceOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectResourceController.deleteProjectResourceById(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
