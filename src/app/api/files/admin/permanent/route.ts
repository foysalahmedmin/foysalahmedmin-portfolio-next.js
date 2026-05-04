import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from '../../file.controller';
import * as FileValidation from '../../file.validation';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(
          FileValidation.filesOperationValidationSchema,
        )(authedReq, FileController.deleteFilesPermanent);
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
