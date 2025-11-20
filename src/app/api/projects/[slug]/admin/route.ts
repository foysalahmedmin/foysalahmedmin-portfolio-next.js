import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectController from '../../project.controller';
import * as ProjectValidation from '../../project.validation';
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
        return ProjectController.getProjectBySlug(authedReq, { params });
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
        return await validation(ProjectValidation.updateProjectSchema)(
          authedReq,
          (validatedReq) =>
            ProjectController.updateProjectBySlug(validatedReq, { params }),
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
        return await validation(ProjectValidation.projectOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectController.deleteProjectBySlug(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
