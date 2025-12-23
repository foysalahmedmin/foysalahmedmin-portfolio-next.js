import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ProjectController from '../../project.controller';
import * as ProjectValidation from '../../project.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectValidation.projectsOperationValidationSchema)(
          authedReq,
          ProjectController.deleteProjectsPermanent,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

