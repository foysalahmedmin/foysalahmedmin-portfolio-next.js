import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectResourceController from '../../project-resource.controller';
import * as ProjectResourceValidation from '../../project-resource.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ProjectResourceValidation.projectResourcesOperationValidationSchema)(
          authedReq,
          ProjectResourceController.deleteProjectResourcesPermanent,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

