import { auth } from '@/middleware/auth.middleware';
import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as UserController from '../user.controller';
import * as UserValidation from '../user.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'user' as TRole)(
      req,
      UserController.getSelf,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'user' as TRole)(
      req,
      async (authedReq) => {
        return await file({
          name: 'image',
          folder: 'users',
          max_size: 5_000_000,
          max_count: 1,
          allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        })(
          authedReq,
          async (fileReq) => {
            return await validation(UserValidation.updateSelfValidationSchema)(
              fileReq,
              UserController.updateSelf,
            );
          },
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
