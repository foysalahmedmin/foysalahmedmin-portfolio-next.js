import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectController from '../../../project.controller';
import * as ProjectValidation from '../../../project.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ProjectValidation.projectByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectController.restoreProjectById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

