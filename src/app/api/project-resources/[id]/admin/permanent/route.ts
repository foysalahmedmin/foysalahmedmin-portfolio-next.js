import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectResourceController from '../../../project-resource.controller';
import * as ProjectResourceValidation from '../../../project-resource.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

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
            ProjectResourceController.deleteProjectResourcePermanent(validatedReq, {
              params,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

