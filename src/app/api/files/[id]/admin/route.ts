import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from '../../file.controller';
import * as FileValidation from '../../file.validation';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author' as TRole,
    )(req, async (authedReq) => {
      authedReq.params = resolvedParams;
      return await validation(FileValidation.updateFileValidationSchema)(
        authedReq,
        (validatedReq) =>
          FileController.updateFile(validatedReq, { params: resolvedParams }),
      );
    });
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
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author' as TRole,
    )(req, async (authedReq) => {
      authedReq.params = resolvedParams;
      return await validation(FileValidation.fileOperationValidationSchema)(
        authedReq,
        (validatedReq) =>
          FileController.deleteFile(validatedReq, { params: resolvedParams }),
      );
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
