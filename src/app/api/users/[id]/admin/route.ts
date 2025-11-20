import { auth } from '@/middleware/auth.middleware';
import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as UserController from '../../user.controller';
import * as UserValidation from '../../user.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(
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
          (validatedReq) => UserController.getUser(validatedReq, { params }),
        );
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
        return await file({
          name: 'image',
          folder: 'users',
          max_size: 5_000_000,
          max_count: 1,
          allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        })(
          authedReq,
          async (fileReq) => {
            return await validation(UserValidation.updateUserValidationSchema)(
              fileReq,
              (validatedReq) =>
                UserController.updateUser(validatedReq, { params }),
            );
          },
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
        return await validation(UserValidation.userOperationValidationSchema)(
          authedReq,
          (validatedReq) => UserController.deleteUser(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
