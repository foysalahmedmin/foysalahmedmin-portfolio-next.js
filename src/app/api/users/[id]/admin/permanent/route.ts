import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as UserController from '../../../user.controller';
import * as UserValidation from '../../../user.validation';
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
        return await validation(UserValidation.userOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            UserController.deleteUserPermanent(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

